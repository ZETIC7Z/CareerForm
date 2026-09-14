import QRCode from 'qrcode';

/**
 * Generate a scannable QR code SVG string for a given URL or text payload.
 */
export async function generateQRCodeSVG(text: string): Promise<string> {
  try {
    return await QRCode.toString(text, {
      type: 'svg',
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR SVG:', err);
    return '';
  }
}

/**
 * Generate a scannable QR code DataURL (PNG)
 */
export async function generateQRCodeDataURL(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      margin: 1,
      width: 260,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR DataURL:', err);
    return '';
  }
}