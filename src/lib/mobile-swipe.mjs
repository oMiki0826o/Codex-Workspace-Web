/** Return a deliberate horizontal chat gesture, preserving system edges and interactive targets. */
export function getSwipeAction(g) {
 const {startX,startY,endX,endY,elapsedMs,width,protectedTarget=false}=g;
 if(protectedTarget||!Number.isFinite(width)||width<280||elapsedMs>900||elapsedMs<40)return null;
 if(startX<22||startX>width-22)return null;
 const dx=endX-startX,dy=endY-startY;
 if(Math.abs(dx)<85||Math.abs(dx)<Math.abs(dy)*1.5)return null;
 return dx>0?'conversations':'settings';
}
