import { getStore } from '@/lib/store.mjs';import { guard,error } from '@/lib/http.mjs';
export const runtime='nodejs';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){const denied=guard(req);if(denied)return denied;const {id}=await params;const store=getStore();if(!store.getJob(id))return error('找不到工作',404);const cursor=Number(new URL(req.url).searchParams.get('after')||'0');return Response.json({events:store.getEvents(id,Number.isSafeInteger(cursor)&&cursor>=0?cursor:0)});}
