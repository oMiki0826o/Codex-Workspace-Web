import { getStore } from '@/lib/store.mjs';
import { getJobManager } from '@/lib/jobs.mjs';
import { bodyJson, guard, error } from '@/lib/http.mjs';
export const runtime='nodejs';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const denied=guard(req,true);if(denied)return denied;const {id}=await params;const job=getStore().getJob(id);if(!job)return error('找不到工作',404);
 const data=await bodyJson(req);const requestId=typeof data?.requestId==='string'?data.requestId:'';const decision=typeof data?.decision==='string'?data.decision:'';
 if(!requestId)return error('缺少批准請求');
 try{await getJobManager(getStore()).approve(id,requestId,decision);return Response.json({ok:true});}
 catch(e){return error(e instanceof Error?e.message:'無法處理批准',409);}
}
