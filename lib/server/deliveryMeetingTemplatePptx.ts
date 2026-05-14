import fs from "fs";
import os from "os";
import path from "path";
import Automizer, { modify } from "pptx-automizer";
import type { ReportResult } from "@/lib/ado/report";
import { buildDeliveryMeetingPlaceholderMap } from "@/lib/deliveryMeetingPptxData";

export const DELIVERY_TEMPLATE_FILENAME = "delivery-meeting-template.pptx";

export function getDeliveryTemplatePath(): string {
  return path.join(process.cwd(), "templates", DELIVERY_TEMPLATE_FILENAME);
}

export function deliveryTemplateExists(): boolean {
  return fs.existsSync(getDeliveryTemplatePath());
}

export async function generateDeliveryMeetingPptxFromTemplate(
  report: ReportResult | null,
  meetingDate: Date,
): Promise<Buffer> {
  const templateDir = path.join(process.cwd(), "templates");
  const tplPath = path.join(templateDir, DELIVERY_TEMPLATE_FILENAME);
  if (!fs.existsSync(tplPath)) {
    throw new Error("MISSING_TEMPLATE");
  }

  const placeholderMap = buildDeliveryMeetingPlaceholderMap(report, meetingDate);
  const replaceRules = Object.entries(placeholderMap).map(([replace, text]) => ({
    replace,
    by: { text },
  }));

  const outDir = path.join(os.tmpdir(), `dfollowup-pptx-${process.pid}-${Date.now()}`);
  fs.mkdirSync(outDir, { recursive: true });

  try {
    const automizer = new Automizer({
      templateDir,
      outputDir: outDir,
      removeExistingSlides: true,
      cleanup: true,
      verbosity: 0,
      compression: 0,
    });

    const alias = "deck";
    const pres = automizer.loadRoot(DELIVERY_TEMPLATE_FILENAME).load(DELIVERY_TEMPLATE_FILENAME, alias);
    const info = await pres.getInfo();
    const slides = info.slidesByTemplate(alias);

    for (const slideMeta of slides) {
      pres.addSlide(alias, slideMeta.number, async (slide) => {
        const ids = await slide.getAllTextElementIds();
        for (const id of ids) {
          slide.modifyElement(id, [modify.replaceText(replaceRules)]);
        }
      });
    }

    const outName = "delivery-out.pptx";
    await pres.write(outName);
    const fullOut = path.join(outDir, outName);
    const buf = fs.readFileSync(fullOut);
    return buf;
  } finally {
    try {
      fs.rmSync(outDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}
