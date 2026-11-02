/** Measure keyboard height without translating the document. */
export function computeKeyboardViewport({visualHeight,layoutHeight,baselineHeight,focused,scale}) {
 const vh=visualHeight>0&&Number.isFinite(visualHeight)?visualHeight:layoutHeight;
 const full=Math.max(baselineHeight||0,layoutHeight||0,vh||0);
 const keyboardOpen=Boolean(focused&&scale<=1.05&&full-vh>Math.max(110,full*0.18));
 return {keyboardOpen,height:keyboardOpen?String(Math.round(vh))+'px':'100dvh'};
}
