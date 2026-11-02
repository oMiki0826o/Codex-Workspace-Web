import {AppServerClient} from '@/lib/app-server-client.mjs';
import {guard} from '@/lib/http.mjs';
export const runtime='nodejs';
export async function GET(req:Request){
 const denied=guard(req);if(denied)return denied;const client=new AppServerClient();
 try{
  const servers:Record<string,unknown>[]=[];let cursor:string|null=null;const seen=new Set<string>();
  for(let page=0;page<6;page++){
   const data=await client.listMcpServers(cursor);
   servers.push(...(Array.isArray(data?.data)?data.data:Array.isArray(data?.servers)?data.servers:[]));
   const next=data?.nextCursor;
   if(typeof next!=='string'||!next||seen.has(next))break;
   seen.add(next);cursor=next;
  }
  const items=servers.map(server=>({name:server.name||server.serverName,status:server.status,tools:Array.isArray(server.tools)?server.tools.map((tool:Record<string,unknown>)=>({name:tool.name,description:tool.description})):[]}));
  return Response.json({supported:true,items});}
 catch{return Response.json({supported:false,items:[],message:'這個 Codex App Server 未提供 MCP 狀態。'});}
 finally{client.close();}
}
