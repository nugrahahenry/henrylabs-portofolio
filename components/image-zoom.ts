export const certificateZoomSteps = [1, 1.5, 2, 3] as const;

export function imageLayout(width: number, height: number, viewportWidth: number, viewportHeight: number, zoom: number) {
  const ratio = Math.min(Math.max(1, viewportWidth - 16) / Math.max(1, width), Math.max(1, viewportHeight - 16) / Math.max(1, height));
  const w = Math.max(1, width) * ratio * zoom, h = Math.max(1, height) * ratio * zoom;
  const sheetWidth = Math.max(viewportWidth, w + 16), sheetHeight = Math.max(viewportHeight, h + 16);
  return { width: w, height: h, x: (sheetWidth - w) / 2, y: (sheetHeight - h) / 2, sheetWidth, sheetHeight, viewportWidth, viewportHeight };
}

type Layout = ReturnType<typeof imageLayout>;
const clamp = (value: number, max = 1) => Math.min(max, Math.max(0, value));

export function imageAnchor(layout: Layout, left: number, top: number, x = layout.viewportWidth / 2, y = layout.viewportHeight / 2) {
  return { u: clamp((left + x - layout.x) / layout.width), v: clamp((top + y - layout.y) / layout.height), x, y };
}

export function imageScroll(layout: Layout, anchor: ReturnType<typeof imageAnchor>) {
  return {
    left: clamp(layout.x + anchor.u * layout.width - anchor.x, Math.max(0, layout.sheetWidth - layout.viewportWidth)),
    top: clamp(layout.y + anchor.v * layout.height - anchor.y, Math.max(0, layout.sheetHeight - layout.viewportHeight)),
  };
}
