import {getStore} from '@/lib/store.mjs';
import {getJobManager} from '@/lib/jobs.mjs';
import {guard,error,bodyJson} from '@/lib/http.mjs';
export const runtime='nodejs';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const denied=guard(req,true);if(denied)return denied;
 const {id}=await params;const store=getStore();const job=store.getJob(id);
 if(!job)return error('找不到工作',404);
 if(job.status!=='running')return error('目前回合並非執行中',409);
 const data=await bodyJson(req),prompt=typeof data?.prompt==='string'?data.prompt.trim():'';
 if(!prompt||prompt.length>25000)return error('追加指示必須為 1–25000 個字元');
 try{await getJobManager(store).steer(id,prompt);return Response.json({ok:true});}
 catch(e){return error(e instanceof Error?e.message:'Codex 不支援追加指示',409);}
}
