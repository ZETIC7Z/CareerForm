/**
 * AI Background Removal Service
 * Powered by @imgly/background-removal (ISNet/U2Net model - Suvink/cut-it-out architecture)
 * Runs entirely in-browser via WebAssembly/Web Workers with dynamic import.
 */

export interface RemoveBgProgress {
  key: string;
  current: number;
  total: number;
  percent: number;
}

export async function removePhotoBackground(
  imageSource: string | Blob | HTMLImageElement,
  onProgress?: (progress: RemoveBgProgress) => void
): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('AI background removal must run in the browser.');
  }

  // Dynamically import @imgly/background-removal to ensure zero SSR conflicts
  const { removeBackground } = await import('@imgly/background-removal');

  const config = {
    model: 'isnet_quint8' as const, // fast, high-quality quantized model cached in browser
    debug: false,
    output: {
      format: 'image/png' as const,
      quality: 1.0,
      type: 'foreground' as const,
    },
    progress: (key: string, current: number, total: number) => {
      if (onProgress && total > 0) {
        const percent = Math.round((current / total) * 100);
        onProgress({ key, current, total, percent });
      }
    },
  };

  try {
    const resultBlob = await removeBackground(imageSource, config);
    return await blobToDataUrl(resultBlob);
  } catch (error) {
    console.error('AI background removal error:', error);
    throw error;
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to convert Blob to DataURL'));
    reader.readAsDataURL(blob);
  });
}
