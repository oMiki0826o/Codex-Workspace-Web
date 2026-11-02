import {relative,isAbsolute} from 'node:path';
const allowed=(root,path)=>{
 if(typeof path!=='string'||!isAbsolute(path))return false;
 const rel=relative(root,path);return rel===''||(!rel.startsWith('..')&&!isAbsolute(rel));
};
const asArray=value=>Array.isArray(value)?value:[];
const date=value=>{
 if(typeof value==='number')return new Date(value>1e12?value:value*1000).toISOString();
 if(typeof value==='string'&&!Number.isNaN(Date.parse(value)))return new Date(value).toISOString();
 return new Date(0).toISOString();
};
const readText=item=>{
 if(typeof item?.text==='string')return item.text;
 return asArray(item?.content).map(part=>typeof part?.text==='string'?part.text:'').join('');
};
export function normalizeAppServerThread(thread,workspace){
 if(!thread||!allowed(workspace,thread.cwd)||typeof thread.id!=='string')return null;
 const updates=thread.updatedAt??thread.createdAt;
 return {id:thread.id,cwd:thread.cwd,title:thread.name||thread.preview||'新的對話',updatedAt:date(updates)};
}
export async function listAppServerSessions(client,workspace){
 const found=new Map(),cursors=new Set();let cursor=null;
 for(let i=0;i<6;i++){
  const params={cwd:workspace,limit:100,sortKey:'updated_at',sortDirection:'desc',...(cursor?{cursor}:{})};
  const result=await client.listThreads(params);
  for(const entry of asArray(result?.data||result?.threads)){const record=normalizeAppServerThread(entry,workspace);if(record)found.set(record.id,record);}
  const next=result?.nextCursor;
  if(typeof next!=='string'||!next||cursors.has(next))break;
  cursors.add(next);cursor=next;
 }
 return [...found.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}
export function normalizeAppServerItems(thread){
 const turns=asArray(thread?.turns);
 const result=[];
 for(const turn of turns)for(const item of asArray(turn?.items)){
  const type=item?.type||'unknown';if(type==='reasoning')continue;
  const role=type==='userMessage'?'user':type==='agentMessage'?'assistant':'tool';
  const content=readText(item);
  const command=typeof item?.command==='string'?item.command:'';
  const output=typeof item?.aggregatedOutput==='string'?item.aggregatedOutput:typeof item?.aggregated_output==='string'?item.aggregated_output:'';
  const text=content||(role==='tool'?[command,output].filter(Boolean).join('\n'):'' );
  if(role!=='tool'&&!text)continue;
  result.push({id:item?.id||turn?.id+'-'+result.length,role,text,createdAt:item?.createdAt||null,type});
 }
 return result;
}
export async function readAppServerSession(client,workspace,threadId){
 const response=await client.readThread(threadId,{includeTurns:true});
 const thread=response?.thread;
 const record=normalizeAppServerThread(thread,workspace);
 if(!record)return null;
 let turns=asArray(thread.turns);
 if(!turns.length){
  try{const page=await client.listTurns(threadId,{limit:100,sortDirection:'desc',itemsView:'full'});
   turns=asArray(page?.data).reverse();
  }catch{/* version without paginated history */}
 }
 const items=normalizeAppServerItems({...thread,turns});
 return {...record,items,usage:null};
}
