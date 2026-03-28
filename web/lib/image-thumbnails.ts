import sharp from 'sharp';

export function isDataImageUrl(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:image/');
}

export async function createThumbnailDataUrl(
  dataUrl: string,
  options?: { width?: number; quality?: number }
): Promise<string | null> {
  if (!isDataImageUrl(dataUrl)) return null;

  const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
  if (!match) return null;

  try {
    const width = Math.max(180, Math.min(560, Number(options?.width) || 440));
    const quality = Math.max(55, Math.min(86, Number(options?.quality) || 72));
    const input = Buffer.from(match[1], 'base64');
    const output = await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${output.toString('base64')}`;
  } catch {
    return null;
  }
}
