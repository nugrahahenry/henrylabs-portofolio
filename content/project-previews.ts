type PreviewSource = { target: string; size: readonly [number, number]; widths: readonly number[] };

// Original artwork remains available for full-size inspection and social cards.
export const projectPreviewSources: Record<string, PreviewSource> = {
  "/assets/brand/catmoji.png": { target: "/assets/brand/previews/catmoji", size: [512, 512], widths: [256] },
  "/assets/brand/canox.png": { target: "/assets/brand/previews/canox", size: [256, 256], widths: [256] },
  "/assets/brand/hengs.png": { target: "/assets/brand/previews/hengs", size: [1254, 1254], widths: [256] },
  "/assets/brand/polara.png": { target: "/assets/brand/previews/polara", size: [192, 192], widths: [192] },
  "/assets/projects/catmoji-hero.png": { target: "/assets/projects/previews/catmoji", size: [1280, 400], widths: [384, 768, 1280] },
  "/assets/projects/polara-og.png": { target: "/assets/projects/previews/polara", size: [1200, 630], widths: [384, 768, 1200] },
};

export function projectPreview(source: string): { src: string; srcSet?: string; width?: number; height?: number } {
  const preview = projectPreviewSources[source];
  if (!preview) return { src: source };
  return {
    src: `${preview.target}-${preview.widths.find(width => width >= 768) ?? preview.widths[0]}.webp`,
    srcSet: preview.widths.length > 1 ? preview.widths.map(width => `${preview.target}-${width}.webp ${width}w`).join(", ") : undefined,
    width: preview.size[0], height: preview.size[1],
  };
}
