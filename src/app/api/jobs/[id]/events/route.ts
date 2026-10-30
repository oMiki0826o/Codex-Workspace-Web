import { getStore } from '@/lib/store.mjs';import { guard,error } from '@/lib/http.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
const done=new Set(['completed','failed','cancelled','interrupted']);
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){const denied=guard(req);if(denied)return denied;const {id}=await params;const store=getStore();if(!store.getJob(id))return error('找不到工作',404);
 const u=new URL(req.url);let cursor=Number(u.searchParams.get('after')||req.headers.get('last-event-id')||'0');if(!Number.isSafeInteger(cursor)||cursor<0)cursor=0;
 const encoder=new TextEncoder();let timer:ReturnType<typeof setInterval>|undefined;let heartbeat:ReturnType<typeof setInterval>|undefined;let closed=false;
 const stream=new ReadableStream({start(controller){
 const close=()=>{if(closed)return;closed=true;if(timer)clearInterval(timer);if(heartbeat)clearInterval(heartbeat);try{controller.close();}catch{}};
 const pump=()=>{if(closed)return;try{const data=store.getEvents(id,cursor);for(const item of data){cursor=item.id;controller.enqueue(encoder.encode(`id: ${item.id}\ndata: ${JSON.stringify(item)}\n\n`));}
 if(done.has(store.getJob(id)?.status)&&data.length<1000)close();}catch{close();}};
 timer=setInterval(pump,650);heartbeat=setInterval(()=>{if(!closed)controller.enqueue(encoder.encode(': keepalive\n\n'));},18000);pump();req.signal.addEventListener('abort',close,{once:true});
 },cancel(){closed=true;if(timer)clearInterval(timer);if(heartbeat)clearInterval(heartbeat);}});
 return new Response(stream,{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'}});
}
