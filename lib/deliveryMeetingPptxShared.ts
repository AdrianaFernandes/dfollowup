/** Nome de ficheiro seguro a partir de texto livre (projeto, etc.). */
export function safeFilenamePart(raw: string): string {
  return raw.replace(/[^\w.-]+/g, "_").slice(0, 80);
}
