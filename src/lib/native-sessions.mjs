import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, isAbsolute } from 'node:path';

const inside=(root,path)=>{if(typeof path!=='string'||!isAbsolute(path))return false;const rel=relative(root,path);return rel===''||(!rel.startsWith('..')&&!isAbsolute(rel));};
const files=(dir)=>!existsSync(dir)?[]:readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const path=join(dir,entry.name);return entry.isDirectory()?files(path):entry.isFile()&&entry.name.endsWith('.jsonl')?[path]:[];});
const records=path=>readFileSync(path,'utf8').split('\n').flatMap((line,index)=>{if(!line.trim())return [];try{return [{...JSON.parse(line),_index:index}];}catch{return [];}});
const meta=path=>records(path).find(record=>record.type==='session_meta')?.payload||null;
const text=content=>(Array.isArray(content)?content:[]).map(part=>part?.text||part?.content||'').filter(value=>typeof value==='string').join('');
const item=(record,index)=>{const payload=record.payload||{};if(record.type!=='response_item'||payload.type!=='message')return null;const role=payload.role;if(!['user','assistant'].includes(role))return null;const value=text(payload.content);if(!value||value.startsWith('# AGENTS.md instructions'))return null;return {id:payload.id||`${record._index}-${index}`,role,text:value,createdAt:record.timestamp||null};};
const sessionFor=(path,workspace)=>{const data=meta(path);if(!data||!inside(workspace,data.cwd))return null;const stat=statSync(path);const title=records(path).map(item).filter(value=>value?.role==='user').map(value=>value.text.replace(/\s+/g,' ')).find(value=>!value.startsWith('# AGENTS.md instructions'))?.slice(0,72)||'新的對話';return {id:data.id||data.session_id,path,cwd:data.cwd,title,updatedAt:stat.mtime.toISOString()};};

export function listWorkspaceSessions({workspace,sessionsDir}){
 return files(sessionsDir).map(path=>sessionFor(path,workspace)).filter(Boolean).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id));
}

export function readNativeSession({sessionId,workspace,sessionsDir,session=null}){
 session=session||listWorkspaceSessions({workspace,sessionsDir}).find(candidate=>candidate.id===sessionId);if(!session)return null;
 const rows=records(session.path);const usage=rows.filter(row=>row.type==='event_msg'&&row.payload?.type==='token_count'&&row.payload?.info?.total_token_usage).at(-1)?.payload?.info?.total_token_usage||rows.filter(row=>row.type==='token_usage_record').at(-1)?.payload?.thread_token_usage||null;
 return {...session,items:rows.map(item).filter(Boolean),usage};
}
