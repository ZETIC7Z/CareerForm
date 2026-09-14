/**
 * AI Photo Enhancer & Studio Utilities
 * 1. enhanceImageHD: Sharpens soft/blurry photos, restores pixels, optimizes facial contrast.
 * 2. compositeBackgroundColor: Fills transparent areas with solid CSC White, Sky Blue, or custom hex color.
 * 3. cropToPassportRatio: Standardizes image to official CSC 3.5cm x 4.5cm ratio.
 */

export interface EnhanceOptions {
  sharpenAmount?: number; // 0 to 1, default 0.55
  contrast?: number; // 0 to 1, default 0.15
  vibrance?: number; // 0 to 1, default 0.12
}

export async function enhanceImageHD(
  imageSource: string,
  options: EnhanceOptions = {}
): Promise<string> {
  const {
    sharpenAmount = 0.55,
    contrast = 0.15,
    vibrance = 0.12,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Upsample low-res images if needed to at least standard 826x1062 (2x passport resolution)
      const minW = 826;
      const minH = 1062;
      const scale = Math.max(1, Math.max(minW / img.width, minH / img.height));
      const targetW = Math.round(img.width * scale);
      const targetH = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return reject(new Error('Canvas context unavailable'));

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      const data = imgData.data;
      const copy = new Uint8ClampedArray(data);

      // Pass 1: Contrast & Luminance auto-leveling
      let minLum = 255;
      let maxLum = 0;
      for (let i = 0; i < data.length; i += 16) {
        if (data[i + 3] > 100) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          if (lum < minLum) minLum = lum;
          if (lum > maxLum) maxLum = lum;
        }
      }
      const lumRange = Math.max(20, maxLum - minLum);

      // Pass 2: Unsharp Masking Kernel (Edge restoration & sharpness)
      const kCenter = 1 + 4 * sharpenAmount;
      const kEdge = -sharpenAmount;

      for (let y = 1; y < targetH - 1; y++) {
        for (let x = 1; x < targetW - 1; x++) {
          const idx = (y * targetW + x) * 4;
          const alpha = copy[idx + 3];
          if (alpha < 20) continue; // skip transparent background

          for (let c = 0; c < 3; c++) {
            const top = copy[((y - 1) * targetW + x) * 4 + c];
            const bottom = copy[((y + 1) * targetW + x) * 4 + c];
            const left = copy[(y * targetW + (x - 1)) * 4 + c];
            const right = copy[(y * targetW + (x + 1)) * 4 + c];
            const center = copy[idx + c];

            let sharpened = center * kCenter + (top + bottom + left + right) * kEdge;

            // Subtle contrast adjustment
            if (contrast > 0) {
              const normalized = (sharpened - 128) / 128;
              sharpened = 128 + normalized * (1 + contrast) * 128;
            }

            // Dynamic range stretch
            if (lumRange < 200) {
              sharpened = ((sharpened - minLum) / lumRange) * 255 * 0.25 + sharpened * 0.75;
            }

            // Warm skin tone lift
            if (vibrance > 0 && c === 0) {
              sharpened = sharpened * (1 + vibrance * 0.5);
            }

            data[idx + c] = Math.min(255, Math.max(0, Math.round(sharpened)));
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png', 1.0));
    };
    img.onerror = () => reject(new Error('Failed to load image for HD enhancement'));
    img.src = imageSource;
  });
}

/**
 * Composites a solid or custom background color under an image with transparency.
 * If bgColor is null or 'transparent', returns the image as is.
 */
export async function compositeBackgroundColor(
  imageSource: string,
  bgColor: string | null
): Promise<string> {
  if (!bgColor || bgColor === 'transparent') {
    return imageSource;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));

      // Fill background color
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw subject over background
      ctx.drawImage(img, 0, 0);

      resolve(canvas.toDataURL('image/png', 1.0));
    };
    img.onerror = () => reject(new Error('Failed to composite background color'));
    img.src = imageSource;
  });
}

/**
 * Checks if an image has any transparent pixels
 */
export async function checkHasTransparency(imageSource: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(200, img.width);
      canvas.height = Math.min(200, img.height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return resolve(false);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 240) {
          return resolve(true);
        }
      }
      resolve(false);
    };
    img.onerror = () => resolve(false);
    img.src = imageSource;
  });
}

/**
 * Cover-crop image to 3.5cm x 4.5cm CSC ratio (e.g. 413 x 531)
 */
export async function cropToPassportRatio(
  imageSource: string,
  targetWidth = 413,
  targetHeight = 531
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));

      const imgRatio = img.width / img.height;
      const targetRatio = targetWidth / targetHeight;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;

      if (imgRatio > targetRatio) {
        sw = img.height * targetRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / targetRatio;
        sy = 0; // anchor to top (head/face)
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
      resolve(canvas.toDataURL('image/png', 1.0));
    };
    img.onerror = () => reject(new Error('Failed to crop passport image'));
    img.src = imageSource;
  });
}
