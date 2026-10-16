"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { imageAnchor, imageLayout, imageScroll } from "./image-zoom";

export function useCertificateZoom() {
  const area = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [viewport, setViewport] = useState({ width: 1, height: 1 });
  const layout = imageLayout(size.width, size.height, viewport.width, viewport.height, zoom);
  const current = useRef(layout);
  const pending = useRef<ReturnType<typeof imageAnchor> | null>(null);
  const focusAfterZoom = useRef(false);

  useLayoutEffect(() => {
    const node = area.current;
    if (!node) return;
    const measure = () => {
      const { clientWidth: width, clientHeight: height } = node;
      if (!width || !height || (width === current.current.viewportWidth && height === current.current.viewportHeight)) return;
      const anchor = imageAnchor(current.current, node.scrollLeft, node.scrollTop);
      pending.current = { ...anchor, x: width / 2, y: height / 2 };
      setViewport({ width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    current.current = layout;
    const node = area.current;
    if (!node) return;
    if (zoom === 1) node.scrollTo({ left: 0, top: 0, behavior: "instant" });
    else if (pending.current) node.scrollTo({ ...imageScroll(layout, pending.current), behavior: "instant" });
    pending.current = null;
    if (focusAfterZoom.current) { node.focus({ preventScroll: true }); focusAfterZoom.current = false; }
  }, [layout.width, layout.height, layout.viewportWidth, layout.viewportHeight, zoom]);

  const changeZoom = (value: number, point?: { x: number; y: number }) => {
    const node = area.current;
    if (!node) return;
    pending.current = imageAnchor(current.current, node.scrollLeft, node.scrollTop, point?.x, point?.y);
    focusAfterZoom.current = true;
    setZoom(value);
  };
  const imageReady = useCallback((image: HTMLImageElement) => {
    if (image.naturalWidth && image.naturalHeight) setSize({ width: image.naturalWidth, height: image.naturalHeight });
  }, []);

  return { area, zoom, layout, changeZoom, imageReady };
}
