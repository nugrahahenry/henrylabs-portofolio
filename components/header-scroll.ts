export type HeaderScrollState = {
  y: number;
  anchor: number;
  direction: -1 | 0 | 1;
  hidden: boolean;
};

export function createHeaderScroll(y = 0): HeaderScrollState {
  return { y, anchor: y, direction: 0, hidden: false };
}

export function advanceHeaderScroll(state: HeaderScrollState, scrollY: number, maxY: number, pinned = false): HeaderScrollState {
  // Clamp touch overscroll so the top/bottom bounce cannot reverse the header.
  const y = Math.max(0, Math.min(scrollY, Math.max(0, maxY)));
  if (pinned || y <= 96) return createHeaderScroll(y);
  const delta = y - state.y;
  if (delta === 0) return state;
  const direction = delta > 0 ? 1 : -1;
  const anchor = direction === state.direction ? state.anchor : state.y;
  const distance = Math.abs(y - anchor);
  const hidden = direction === 1 && distance >= 32 ? true : direction === -1 && distance >= 12 ? false : state.hidden;
  return { y, anchor: hidden !== state.hidden ? y : anchor, direction, hidden };
}
