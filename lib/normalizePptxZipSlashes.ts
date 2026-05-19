import JSZip from "jszip";

/**
 * Alguns .pptx (ex.: gravados com ferramentas Windows) usam `\` nos nomes dentro do ZIP.
 * O pptx-automizer assume caminhos OOXML com `/` e falha com "Could not find file ppt/_rels/presentation.xml.rels".
 * Esta função regrava o ZIP com todos os caminhos normalizados.
 */
export async function normalizePptxZipPathSeparators(input: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(input);
  const out = new JSZip();

  for (const [oldPath, entry] of Object.entries(zip.files)) {
    const obj = entry as JSZip.JSZipObject;
    if (obj.dir) continue;
    const newPath = oldPath.replace(/\\/g, "/");
    const content = await obj.async("nodebuffer");
    out.file(newPath, content);
  }

  const buf = await out.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 5 },
  });
  return Buffer.from(buf);
}
