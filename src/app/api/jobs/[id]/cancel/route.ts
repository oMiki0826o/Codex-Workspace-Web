import { getStore } from '@/lib/store.mjs';import { getJobManager } from '@/lib/jobs.mjs';import { guard,error } from '@/lib/http.mjs';
export const runtime='nodejs';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){const denied=guard(req,true);if(denied)return denied;const {id}=await params;const store=getStore();if(!store.getJob(id))return error('找不到工作',404);
 return getJobManager(store).cancel(id)?Response.json({ok:true}):error('工作目前沒有執行程序',409);}
