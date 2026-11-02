/**
 * Coordinates of the visible viewport in the document's coordinate system.
 * Safari may scroll the document to reveal an input. pageTop already includes
 * that scroll; offsetTop alone cannot locate the visible frame.
 *
 * @param {{ visualHeight:number, layoutHeight:number, visualPageTop:number,
 *           visualScale:number, focused:boolean, baselineHeight:number }} state
 */
export function computeViewportGeometry(state) {
  const {visualHeight, layoutHeight, visualPageTop, visualScale, focused, baselineHeight} = state;
  const height = Number.isFinite(visualHeight) && visualHeight > 0 ? visualHeight : layoutHeight;
  const full = Math.max(baselineHeight || 0, layoutHeight || 0, height || 0);
  const shrink = full - height;
  const keyboardOpen = Boolean(focused && visualScale <= 1.05 && shrink > Math.max(110, full * 0.18));
  const top = Number.isFinite(visualPageTop) ? visualPageTop : 0;
  return {
    keyboardOpen,
    height: keyboardOpen ? `${Math.round(height)}px` : '100dvh',
    pageTop: keyboardOpen ? `${Math.round(Math.max(0, top))}px` : '0px',
  };
}
