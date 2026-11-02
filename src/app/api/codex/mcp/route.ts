import {AppServerClient} from '@/lib/app-server-client.mjs';
import {guard} from '@/lib/http.mjs';
export const runtime='nodejs';
export async function GET(req:Request){
 const denied=guard(req);if(denied)return denied;const client=new AppServerClient();
 try{const data=await client.listMcpServers();const servers=data?.data||data?.servers||[];
  const items=servers.map((server:Record<string,unknown>)=>({name:server.name||server.serverName,status:server.status,tools:Array.isArray(server.tools)?server.tools.map((tool:Record<string,unknown>)=>({name:tool.name,description:tool.description})):[]}));
  return Response.json({supported:true,items});}
 catch{return Response.json({supported:false,items:[],message:'這個 Codex App Server 未提供 MCP 狀態。'});}
 finally{client.close();}
}
