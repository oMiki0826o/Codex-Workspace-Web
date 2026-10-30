import { getStore } from '@/lib/store.mjs';import { guard,error } from '@/lib/http.mjs';
export const runtime='nodejs';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){const denied=guard(req);if(denied)return denied;const {id}=await params;const job=getStore().getJob(id);return job?Response.json({job}):error('找不到工作',404);}
