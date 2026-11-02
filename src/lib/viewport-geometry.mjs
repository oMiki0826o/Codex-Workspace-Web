/** Fixed shell uses layout viewport coordinates, not document pageTop. */
export function computeKeyboardViewport({visualHeight,layoutHeight,baselineHeight,focused,scale,offsetTop=0}) {
 const vh=Number.isFinite(visualHeight)&&visualHeight>0?visualHeight:layoutHeight;
 const full=Math.max(baselineHeight||0,layoutHeight||0,vh||0);
 const keyboardOpen=Boolean(focused&&scale<=1.05&&full-vh>Math.max(110,full*0.18));
 return {
  keyboardOpen,
  height:keyboardOpen?String(Math.round(vh))+'px':'100dvh',
  top:keyboardOpen?String(Math.round(Math.max(0,Number.isFinite(offsetTop)?offsetTop:0)))+'px':'0px'
 };
}
