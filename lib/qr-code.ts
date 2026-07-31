import QRCode from "qrcode";
import sharp from "sharp";
import { readFile } from "fs/promises";
import { join } from "path";

interface GenerateQRCodeWithLogoOptions {
  url: string;
  logoPath?: string;
  qrSize?: number;
  logoSize?: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  margin?: number;
}

export async function generateQRCodeWithLogo(
  options: GenerateQRCodeWithLogoOptions
): Promise<Buffer> {
  const {
    url,
    logoPath,
    qrSize = 1000,
    logoSize,
    errorCorrectionLevel = "H",
    margin = 2,
  } = options;

  const calculatedLogoSize = logoSize || Math.floor(qrSize * 0.25);

  try {
    const qrCodeBuffer = await QRCode.toBuffer(url, {
      type: "png",
      width: qrSize,
      margin,
      errorCorrectionLevel,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    if (!logoPath) {
      return qrCodeBuffer;
    }

    try {
      const logoBuffer = await readFile(logoPath);
      const logoResized = await sharp(logoBuffer)
        .resize(calculatedLogoSize, calculatedLogoSize, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .png()
        .toBuffer();

      const qrImage = sharp(qrCodeBuffer);
      const qrMetadata = await qrImage.metadata();
      const qrWidth = qrMetadata.width || qrSize;
      const qrHeight = qrMetadata.height || qrSize;

      const logoX = Math.floor((qrWidth - calculatedLogoSize) / 2);
      const logoY = Math.floor((qrHeight - calculatedLogoSize) / 2);

      const finalImage = await qrImage
        .composite([
          {
            input: logoResized,
            top: logoY,
            left: logoX,
          },
        ])
        .png()
        .toBuffer();

      return finalImage;
    } catch (logoError) {
      return qrCodeBuffer;
    }
  } catch (error) {
    throw new Error("Failed to generate QR code");
  }
}

