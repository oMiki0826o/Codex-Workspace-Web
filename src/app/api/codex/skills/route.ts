import {AppServerClient} from '@/lib/app-server-client.mjs';
import {guard} from '@/lib/http.mjs';
export const runtime='nodejs';
export async function GET(req:Request){
 const denied=guard(req);if(denied)return denied;const client=new AppServerClient();
 try{const data=await client.listSkills();const groups=data?.data||data?.skills||[];
  const items=groups.flatMap((group:{skills?:unknown[];cwd?:string})=>Array.isArray(group.skills)?group.skills.map((s:unknown)=>{const row=s as Record<string,unknown>;return {name:row.name,description:row.description,enabled:row.enabled,cwd:group.cwd};}):[]);
  return Response.json({supported:true,items});}
 catch{return Response.json({supported:false,items:[],message:'這個 Codex App Server 未提供 Skills 清單。'});}
 finally{client.close();}
}
