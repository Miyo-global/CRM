import "server-only";

type PdfParseResult = { text: string };
type PdfParseFn = (buffer: Buffer, options?: object) => Promise<PdfParseResult>;

export async function extractResumeText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as PdfParseFn;
    const result = await pdfParse(buffer);
    return result.text ?? "";
  }

  if (
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  }

  return "";
}
