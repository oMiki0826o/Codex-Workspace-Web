import { getStore } from '@/lib/store.mjs';
import { getJobManager } from '@/lib/jobs.mjs';
import { resolveAllowedWorkspace } from '@/lib/paths.mjs';
import { buildCodexArgs } from '@/lib/codex.mjs';
import { modelBinForRoute, resolveModel } from '@/lib/model-registry.mjs';
import { guard,bodyJson,error } from '@/lib/http.mjs';
export const runtime='nodejs';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const denied=guard(req,true);if(denied)return denied;const {id}=await params;const data=await bodyJson(req);
 const prompt=typeof data?.prompt==='string'?data.prompt.trim():'';if(!prompt||prompt.length>25000)return error('請輸入 1 至 25000 字元的指令');
 const key=data?.requestKey;if(typeof key!=='string'||!/^[-a-zA-Z0-9]{8,90}$/.test(key))return error('缺少有效的 requestKey');
 const store=getStore();const thread=store.getThread(id);if(!thread)return error('找不到對話',404);
 const project=store.getProject(thread.projectId);if(!project)return error('找不到專案',404);
 let dir;let sandbox='workspace-write';let model='';let effort='';let route='cloud';let bin='';try{dir=resolveAllowedWorkspace(project.path);sandbox=data.sandbox||'workspace-write';model=typeof data.model==='string'?data.model:'';effort=typeof data.effort==='string'?data.effort:'';const selected=await resolveModel(model);model=selected.model;route=selected.route;bin=modelBinForRoute(route);if(thread.codexThreadId&&thread.modelRoute&&thread.modelRoute!==route)throw new Error('此對話已使用另一個模型提供者；請建立新對話後切換模型');buildCodexArgs({dir,sandbox,model,effort,sessionId:thread.codexThreadId});}catch(e){return error(e instanceof Error?e.message:'不允許的工作設定');}
 // Idempotency lookup is performed by addJob; do not start an already-existing job.
 const repeated=store.getJobByRequestKey(id,key);if(repeated)return Response.json({job:repeated},{status:200});
 const prior=thread.jobs.filter((j:{status:string})=>['queued','running'].includes(j.status));
 if(prior.length) return error('此對話已有進行中的任務',409);
 if(store.activeCount()>=Number(process.env.CODEX_WEB_MAX_ACTIVE||2))return error('目前執行中的任務已達上限',429);
 const job=store.addJob(id,prompt,key);
 if(job.status!=='queued')return Response.json({job});
 if(thread.title==='新的對話')store.renameThread(id,prompt.slice(0,36));
 void getJobManager(store).start(job.id,{dir,sandbox,model,effort,route,bin}).catch((e:unknown)=>{store.event(job.id,'webui.error',{type:'webui.error',message:String(e)});store.finishJob(job.id,'failed',1);});
 return Response.json({job},{status:202});
}
