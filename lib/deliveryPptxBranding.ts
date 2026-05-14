/**
 * Visual tokens alinhados ao ficheiro de referência "Delivery Follow-up.pptx"
 * (TR Theme / capa + barra de título verde #133C2C, laranja decorativo #D14210).
 * pptxgenjs não incorpora o .pptx original; reproduz-se o layout com formas e tipografia.
 */
import type PptxGenJS from "pptxgenjs";

export type DeliverySlide = ReturnType<InstanceType<typeof PptxGenJS>["addSlide"]>;

/** LAYOUT_WIDE */
export const SLIDE_W = 13.33;
export const SLIDE_H = 7.5;
export const HEADER_H = 1.06;
export const CONTENT_TOP = 1.22;

export const TR = {
  greenBand: "133C2C",
  greenAccent: "1A5C3A",
  orangeDecor: "D14210",
  ink: "111827",
  muted: "374151",
  footerGrey: "6B7280",
  borderGrey: "E5E7EB",
  tableHeadText: "FFFFFF",
} as const;

export function configureDeliveryDeck(pptx: InstanceType<typeof PptxGenJS>) {
  pptx.theme = { headFontFace: "Calibri Light", bodyFontFace: "Calibri" };
  pptx.author = "DFollowup";
  pptx.company = "Thomson Reuters";
  pptx.title = "Delivery Follow-up";
}

/** Capa: linhas e pontos laranja (simplificados vs. o master completo). */
export function addCoverDecor(pptx: InstanceType<typeof PptxGenJS>, slide: DeliverySlide) {
  slide.background = { color: "FFFFFF" };
  const o = TR.orangeDecor;
  const line = (x: number, y: number, w: number) =>
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w,
      h: 0.035,
      fill: { color: o },
      line: { color: o, width: 0 },
    });
  const dot = (x: number, y: number) =>
    slide.addShape(pptx.ShapeType.ellipse, {
      x,
      y,
      w: 0.16,
      h: 0.16,
      fill: { color: o },
      line: { color: o, width: 0 },
    });
  line(2.35, 0.52, 10.6);
  dot(2.28, 0.45);
  line(-0.05, 2.05, 8.2);
  dot(0.95, 1.98);
  line(-0.05, 4.55, 9.1);
  dot(7.65, 4.48);
}

/** Barra superior verde + título branco (slides de conteúdo do template). */
export function addGreenTitleBand(
  pptx: InstanceType<typeof PptxGenJS>,
  slide: DeliverySlide,
  opts: { title: string; kicker?: string; meta?: string },
) {
  slide.background = { color: "FFFFFF" };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: HEADER_H,
    fill: { color: TR.greenBand },
    line: { color: TR.greenBand, width: 0 },
  });
  const kicker = opts.kicker ?? "DELIVERY FOLLOW-UP";
  slide.addText(kicker, {
    x: 0.5,
    y: 0.14,
    w: 12.3,
    h: 0.32,
    fontSize: 9,
    bold: true,
    color: TR.tableHeadText,
    fontFace: "Calibri",
  });
  slide.addText(opts.title, {
    x: 0.5,
    y: 0.38,
    w: 12.3,
    h: 0.55,
    fontSize: 20,
    bold: true,
    color: TR.tableHeadText,
    fontFace: "Calibri Light",
  });
  if (opts.meta) {
    slide.addText(opts.meta, {
      x: 0.5,
      y: 0.82,
      w: 12.3,
      h: 0.28,
      fontSize: 11,
      color: TR.tableHeadText,
      fontFace: "Calibri",
    });
  }
}

export function addSectionEyebrow(slide: DeliverySlide, text: string, y = CONTENT_TOP) {
  slide.addText(text, {
    x: 0.5,
    y,
    w: 12.2,
    fontSize: 11,
    bold: true,
    color: TR.greenAccent,
    fontFace: "Calibri",
  });
}

export function templateFooter(slide: DeliverySlide, y = 6.88) {
  slide.addText("Thomson Reuters · Delivery Follow-up · Dados do filtro (Azure DevOps)", {
    x: 0.35,
    y,
    w: SLIDE_W - 0.7,
    align: "center",
    fontSize: 8.5,
    color: TR.footerGrey,
    fontFace: "Calibri",
  });
}

export function tableHeaderCell(text: string) {
  return {
    text,
    options: {
      bold: true,
      color: TR.tableHeadText,
      fill: { color: TR.greenBand },
      fontFace: "Calibri",
    },
  };
}
