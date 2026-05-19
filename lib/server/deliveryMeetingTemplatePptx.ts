import fs from "fs";
import path from "path";
import os from "os";
import Automizer, { modify } from "pptx-automizer";
import type { ReportResult } from "@/lib/ado/report";
import {
  buildDeliveryMeetingPlaceholderMap,
  buildDeliveryMeetingReplaceTextSpecs,
} from "@/lib/deliveryMeetingPptxData";
import { normalizePptxZipPathSeparators } from "@/lib/normalizePptxZipSlashes";

export const BUNDLED_DELIVERY_TEMPLATE = "delivery-meeting-template.pptx";
/** Nome típico do modelo em Downloads (ex.: `C:\\Users\\…\\Downloads\\TEMPLEATE.pptx`). */
export const DOWNLOADS_FALLBACK_TEMPLATE = "TEMPLEATE.pptx";

/**
 * Ordem: `DELIVERY_PPT_TEMPLATE_PATH` → `%USERPROFILE%/Downloads/TEMPLEATE.pptx` →
 * `templates/delivery-meeting-template.pptx` (o modelo local em Downloads prevalece sobre o do repo).
 */
export function resolveDeliveryMeetingTemplatePath(): string | null {
  const envPath = process.env.DELIVERY_PPT_TEMPLATE_PATH?.trim();
  if (envPath && fs.existsSync(envPath)) return path.resolve(envPath);

  const downloads = path.join(os.homedir(), "Downloads", DOWNLOADS_FALLBACK_TEMPLATE);
  if (fs.existsSync(downloads)) return downloads;

  const bundled = path.join(process.cwd(), "templates", BUNDLED_DELIVERY_TEMPLATE);
  if (fs.existsSync(bundled)) return bundled;

  return null;
}

/**
 * Gera .pptx a partir do modelo, substituindo marcadores `{{DF_*}}` em todas as caixas de texto.
 */
export async function renderDeliveryMeetingPptxFromTemplate(report: ReportResult | null): Promise<Buffer> {
  const templatePath = resolveDeliveryMeetingTemplatePath();
  if (!templatePath) {
    throw new Error(
      "MISSING_TEMPLATE: defina DELIVERY_PPT_TEMPLATE_PATH, ou coloque " +
        `${DOWNLOADS_FALLBACK_TEMPLATE} em Downloads, ou delivery-meeting-template.pptx em /templates.`,
    );
  }

  const templateDir = path.dirname(templatePath);
  const outDir = path.join(os.tmpdir(), `dfollowup-pptx-${process.pid}-${Date.now()}`);
  fs.mkdirSync(outDir, { recursive: true });

  const map = buildDeliveryMeetingPlaceholderMap(report);
  const replaceSpecs = buildDeliveryMeetingReplaceTextSpecs(map);

  const rawTemplate = fs.readFileSync(templatePath);
  const templateBuffer = await normalizePptxZipPathSeparators(rawTemplate);

  try {
    const automizer = new Automizer({
      templateDir,
      outputDir: outDir,
      removeExistingSlides: true,
      autoImportSlideMasters: true,
      verbosity: 0,
      compression: 0,
    });

    const pres = automizer.loadRoot(templateBuffer).load(templateBuffer, "deck");

    const slideNumbers = await pres.getTemplate("deck").getAllSlideNumbers();

    for (const num of slideNumbers) {
      pres.addSlide("deck", num, async (slide) => {
        const elements = await slide.getAllTextElementIds();
        for (const el of elements) {
          slide.modifyElement(el, [modify.replaceText(replaceSpecs)]);
        }
      });
    }

    const outName = "delivery-out.pptx";
    await pres.write(outName);
    const outPath = path.join(outDir, outName);
    return fs.readFileSync(outPath);
  } finally {
    try {
      fs.rmSync(outDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}
