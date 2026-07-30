export type SupportedImageType = 'jpg' | 'png' | 'gif' | 'bmp';

interface FetchedImage {
  buffer: Buffer;
  type: SupportedImageType;
}

function detectImageType(buffer: Buffer): SupportedImageType | null {
  if (buffer.length < 4) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'gif';
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) return 'bmp';
  return null;
}

export async function fetchImageForDocx(url: string): Promise<FetchedImage | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const type = detectImageType(buffer);
    if (!type) return null;
    return { buffer, type };
  } catch {
    return null;
  }
}
