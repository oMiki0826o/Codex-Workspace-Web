import { getStore } from '@/lib/store.mjs';
import { getNativeSessionSync } from '@/lib/native-session-sync.mjs';
import { resolveAllowedWorkspace } from '@/lib/paths.mjs';
import { guard,bodyJson,error } from '@/lib/http.mjs';
export const runtime='nodejs';
export async function GET(req:Request){const denied=guard(req);if(denied)return denied;const projectId=new URL(req.url).searchParams.get('projectId');if(!projectId)return error('缺少 projectId');return Response.json({threads:getStore().listThreads(projectId)});}
export async function POST(req:Request){const denied=guard(req,true);if(denied)return denied;const data=await bodyJson(req);try{const store=getStore();if(typeof data?.codexThreadId==='string'){const project=store.getProject(data?.projectId);if(!project)return error('無效的專案');const workspace=resolveAllowedWorkspace(project.path);const native=getNativeSessionSync(workspace).read(data.codexThreadId);if(!native)return error('找不到工作區原生對話',404);return Response.json({thread:store.importNativeThread(project.id,native.id,native.items.find((item:{role:string})=>item.role==='user')?.text||'新的對話')},{status:201});}return Response.json({thread:store.addThread(data?.projectId)},{status:201});}catch{return error('無效的專案');}}
