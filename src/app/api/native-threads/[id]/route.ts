import {guard,error} from '@/lib/http.mjs';
import {resolveAllowedWorkspace} from '@/lib/paths.mjs';
import {getNativeSessionSync} from '@/lib/native-session-sync.mjs';
import {AppServerClient} from '@/lib/app-server-client.mjs';
import {readAppServerSession} from '@/lib/native-appserver.mjs';
export const runtime='nodejs';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const denied=guard(req);if(denied)return denied;
 const {id}=await params;
 const workspace=resolveAllowedWorkspace(process.env.DEFAULT_PROJECT_PATH||'');
 const client=new AppServerClient();
 try{
  const thread=await readAppServerSession(client,workspace,id);
  if(thread&&thread.items.length)return Response.json({thread,source:'app-server'},{headers:{'Cache-Control':'no-store'}});
 }catch{/* fallback with strict local workspace filter */}
 finally{client.close();}
 const thread=getNativeSessionSync(workspace).read(id);
 return thread?Response.json({thread,source:'legacy-jsonl'},{headers:{'Cache-Control':'no-store'}}):error('找不到工作區原生對話',404);
}
