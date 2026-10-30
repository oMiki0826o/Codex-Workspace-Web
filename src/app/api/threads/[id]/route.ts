import { getStore } from '@/lib/store.mjs';import { guard,bodyJson,error } from '@/lib/http.mjs';
export const runtime='nodejs';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){const denied=guard(req);if(denied)return denied;const {id}=await params;const thread=getStore().getThread(id);if(!thread)return error('找不到對話',404);return Response.json({thread});}
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){const denied=guard(req,true);if(denied)return denied;const {id}=await params;const b=await bodyJson(req);if(!getStore().getThread(id))return error('找不到對話',404);if(typeof b?.title!=='string'||!b.title.trim())return error('標題不正確');getStore().renameThread(id,b.title.slice(0,80));return Response.json({ok:true});}
