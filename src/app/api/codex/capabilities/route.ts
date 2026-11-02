import {AppServerClient} from '@/lib/app-server-client.mjs';
import {discoverCodexCapabilities} from '@/lib/codex-gateway/capabilities.mjs';
import {guard} from '@/lib/http.mjs';
export const runtime='nodejs';
export async function GET(req:Request){
 const denied=guard(req);if(denied)return denied;
 const client=new AppServerClient();
 try{return Response.json(await discoverCodexCapabilities(client));}
 catch{return Response.json({methods:{},models:[],message:'無法取得 Codex 功能清單'},{status:503});}
 finally{client.close();}
}
