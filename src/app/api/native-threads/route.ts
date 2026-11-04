import {guard} from '@/lib/http.mjs';
import {resolveAllowedWorkspace} from '@/lib/paths.mjs';
import {getNativeSessionSync} from '@/lib/native-session-sync.mjs';
import {AppServerClient} from '@/lib/app-server-client.mjs';
import {listAppServerSessions} from '@/lib/native-appserver.mjs';
export const runtime='nodejs';
export async function GET(req:Request){
 const denied=guard(req);if(denied)return denied;
 const workspace=resolveAllowedWorkspace(process.env.DEFAULT_PROJECT_PATH||'');
 const client=new AppServerClient();
 try{
  const threads=await listAppServerSessions(client,workspace);
  if(threads.length)return Response.json({threads,source:'app-server'},{headers:{'Cache-Control':'no-store'}});
 }catch{/* fallback for older clients; never return unrelated paths */}
 finally{await client.close();}
 return Response.json({threads:getNativeSessionSync(workspace).list(),source:'legacy-jsonl'},{headers:{'Cache-Control':'no-store'}});
}
