export function deriveNamingTags(rawName?: string): string[] {
  if (!rawName) return [];
  try {
    const cleaned = rawName.replace(/^Thumbnail:\s*/i, '').trim();
    const parts = cleaned.split(/[\-_/\s]+/).filter(Boolean);
    const isSize = (token: string) => /^\d+x\d+$/i.test(token);
    const tokens = parts
      .map((part) => part.trim())
      .filter((part) => part.length > 0 && !isSize(part));
    return Array.from(new Set(tokens));
  } catch {
    return [];
  }
}

export function getSizeTag(width?: number, height?: number): string | null {
  if (!width || !height) return null;
  const roundedWidth = Math.round(width);
  const roundedHeight = Math.round(height);
  if (roundedWidth > 0 && roundedHeight > 0) {
    return `${roundedWidth}x${roundedHeight}`;
  }
  return null;
}



