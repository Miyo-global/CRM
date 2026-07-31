// Content-based file-type validation. Trusting a client-supplied MIME type is
// not enough — verify the file's leading "magic bytes" actually match.

function matchesIsoBmffMajorBrand(buffer: Buffer, brands: string[]): boolean {
  if (buffer.length < 12) return false;
  if (buffer[4] !== 0x66 || buffer[5] !== 0x74 || buffer[6] !== 0x79 || buffer[7] !== 0x70) return false;
  const major = buffer.toString("ascii", 8, 12);
  return brands.includes(major);
}

export const FILE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  ],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
  "application/msword": [[0xd0, 0xcf, 0x11, 0xe0]],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    [0x50, 0x4b, 0x03, 0x04],
  ],
  "application/vnd.ms-excel": [[0xd0, 0xcf, 0x11, 0xe0]],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    [0x50, 0x4b, 0x03, 0x04],
  ],
};

export function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/bmp") {
    return buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d;
  }
  if (mimeType === "image/tiff") {
    if (buffer.length < 4) return false;
    return (
      (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
      (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a)
    );
  }
  if (mimeType === "image/avif") {
    return matchesIsoBmffMajorBrand(buffer, ["avif", "avis"]);
  }
  if (mimeType === "image/heic" || mimeType === "image/heif") {
    return matchesIsoBmffMajorBrand(buffer, ["heic", "heix", "hevc", "mif1", "msf1", "heif"]);
  }

  const signatures = FILE_SIGNATURES[mimeType];
  if (!signatures) return false;
  if (buffer.length < 12) return false;
  const matchesSignature = signatures.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte)
  );
  if (!matchesSignature) return false;

  if (mimeType === "image/webp") {
    return buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  }
  return true;
}
