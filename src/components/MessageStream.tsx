'use client';
import {useMemo,useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {Check,LoaderCircle,AlertCircle,ChevronDown,ChevronRight,TerminalSquare,GitBranch,ListChecks,Globe,Puzzle,Bot,UserRound} from 'lucide-react';
import type {Job,EventRecord} from './types';

type Decision='accept'|'acceptForSession'|'decline';
type Item={id:string;type:string;text?:string;command?:string;output?:string;aggregated_output?:string;changes?:unknown;exitCode?:number;done?:boolean;[key:string]:unknown};
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const str=(v:unknown)=>typeof v==='string'?v:'';
const safeJSON=(v:unknown)=>{try{return JSON.stringify(v,null,2).slice(0,30000);}catch{return '無法顯示內容';}};
const labels:Record<string,string>={commandExecution:'終端指令',command_execution:'終端指令',fileChange:'檔案變更',file_change:'檔案變更',webSearch:'網頁搜尋',web_search:'網頁搜尋',mcpToolCall:'MCP 工具',mcp_tool_call:'MCP 工具',dynamicToolCall:'工具執行',agentMessage:'Codex 回覆',agent_message:'Codex 回覆',collabAgentToolCall:'協作代理',imageView:'圖片檢視'};
function Tool({item}:{item:Item}){
 const [open,setOpen]=useState(false);
 const command=str(item.command)||str(item.cmd),output=str(item.aggregated_output)||str(item.output)||str(item.text);
 const icon=/command|terminal/i.test(item.type)?<TerminalSquare size={15}/>: /file|diff/i.test(item.type)?<GitBranch size={15}/>: /search|web/i.test(item.type)?<Globe size={15}/>:<Puzzle size={15}/>;
 return <section className="v2-tool"><button type="button" className="v2-tool-heading" onClick={()=>setOpen(!open)} aria-expanded={open}>{icon}<span>{labels[item.type]||'其他工具：'+item.type}</span>{item.done?<Check size={14}/>:<LoaderCircle size={14} className="spin"/>}{open?<ChevronDown size={15}/>:<ChevronRight size={15}/>}</button>
 {open&&<div className="v2-tool-content">{command&&<code>{command}</code>}{output&&<pre>{output.slice(0,32000)}</pre>}{!command&&!output&&<pre>{safeJSON(item)}</pre>}{item.exitCode!=null&&<small>Exit code: {item.exitCode}</small>}</div>}</section>;
}
function Plan({steps}:{steps:unknown}){
 const data=Array.isArray(steps)?steps:[];return <section className="v2-plan"><strong><ListChecks size={15}/>執行計畫</strong>{data.map((x,i)=>{const row=obj(x);return <div className="v2-plan-step" key={i}><span>{row.status==='completed'?'✓':row.status==='inProgress'?'●':'○'}</span><span>{str(row.step)||str(row.description)||'計畫步驟'}</span></div>})}</section>;
}
function Approval({jobId,event,onApproval}:{jobId:string;event:EventRecord;onApproval:(jobId:string,requestId:string,decision:Decision)=>void}){
 const p=event.payload;const id=str(p.requestId);
 return <section className="v2-approval" role="group" aria-label="Codex 操作批准"><strong><AlertCircle size={16}/>需要你的允許</strong><p>{str(p.reason)||'Codex 要執行需要明確批准的操作。'}</p>
 {str(p.cwd)&&<small>工作目錄：{str(p.cwd)}</small>}{str(p.command)&&<pre>{str(p.command)}</pre>}{p.changes!=null&&<details><summary>檢查修改內容</summary><pre>{safeJSON(p.changes)}</pre></details>}
 <div className="v2-approval-actions"><button type="button" onClick={()=>onApproval(jobId,id,'accept')}>允許這次</button><button type="button" onClick={()=>onApproval(jobId,id,'acceptForSession')}>此對話允許</button><button type="button" className="danger" onClick={()=>onApproval(jobId,id,'decline')}>拒絕</button></div></section>;
}
function Turn({job,events,onApproval}:{job:Job;events:EventRecord[];onApproval:(jobId:string,requestId:string,decision:Decision)=>void}){
 const state=useMemo(()=>{
  const items=new Map<string,Item>(),plans=new Map<string,unknown>(),diffs=new Map<string,string>(),pending=new Map<string,EventRecord>(),seen=new Set<number>();let failure='';
  for(const event of events){if(seen.has(event.id))continue;seen.add(event.id);const p=event.payload,raw=obj(p.item),id=str(raw.id)||str(p.itemId);
   if(['item.started','item.updated','item.completed'].includes(event.type)&&id){const old=items.get(id);if(!old?.done||event.type==='item.completed'){const completed=event.type==='item.completed';const item:Item={...old,...raw,id,type:str(raw.type)||old?.type||'unknown',done:completed||old?.done||false};const content=str(raw.text);if(content){item.text=completed?content:event.type==='item.updated'&&/agent.?message/i.test(item.type)?str(old?.text)+content:content;}items.set(id,item);}}
   if(['item.delta','item.output'].includes(event.type)&&id){const old=items.get(id)||{id,type:event.type==='item.delta'?'agentMessage':'commandExecution'};const field=event.type==='item.delta'?'text':'output';if(!old.done)items.set(id,{...old,[field]:str(old[field])+str(p.delta)});}
   if(event.type==='turn.plan')plans.set(str(p.turnId)||'current',p.plan||[]);
   if(event.type==='turn.diff')diffs.set(str(p.turnId)||'current',str(p.diff));
   if(event.type==='approval.request')pending.set(str(p.requestId),event);
   if(['approval.resolved','appserver.serverRequest.resolved'].includes(event.type))pending.delete(str(p.requestId)||str(p.id));
   if(['webui.error','turn.failed','error'].includes(event.type))failure=str(p.message)||str(obj(p.error).message)||'Codex 執行失敗';
  }
  return {items:[...items.values()],plans:[...plans.values()],diffs:[...diffs.values()],pending:[...pending.values()],failure};
 },[events]);
 const messages=state.items.filter(x=>['agentMessage','agent_message'].includes(x.type));
 const tools=state.items.filter(x=>!['agentMessage','agent_message','reasoning'].includes(x.type));
 return <article className="v2-turn"><div className="v2-message"><div className="v2-avatar"><UserRound size={16}/></div><div className="v2-message-body"><div className="v2-author">你 <small>{new Date(job.createdAt).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'})}</small></div><p className="v2-user-text">{job.prompt}</p></div></div>
 <div className="v2-message"><div className="v2-avatar"><Bot size={17}/></div><div className="v2-message-body"><div className="v2-author">Codex <small>{job.status==='running'?'執行中':job.status==='queued'?'等待中':job.status==='completed'?'已完成':job.status==='cancelled'?'已停止':'已中斷'}</small></div>
 {state.plans.map((plan,i)=><Plan key={i} steps={plan}/>)}{tools.map(item=><Tool key={item.id} item={item}/>)}
 {state.diffs.map((diff,i)=><details key={i} className="v2-tool"><summary>Git / 檔案變更</summary><pre>{diff.slice(0,32000)}</pre></details>)}
 {['running','queued'].includes(job.status)&&state.pending.map(x=><Approval key={x.id} jobId={job.id} event={x} onApproval={onApproval}/>)}
 {messages.map(x=><div className="markdown-body v2-answer" key={x.id}><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{x.text||''}</ReactMarkdown></div>)}
 {!messages.length&&<p className="v2-muted">{job.status==='running'||job.status==='queued'?'Codex 正在處理…':job.status==='completed'?'已完成，沒有文字回覆。':'此回合沒有完整文字回覆。'}</p>}{state.failure&&<p className="v2-error">{state.failure}</p>}
 </div></div></article>;
}
export default function MessageStream({jobs,events,onApproval}:{jobs:Job[];events:Record<string,EventRecord[]>;onApproval:(jobId:string,requestId:string,decision:Decision)=>void}){
 if(!jobs.length)return null;return <div className="v2-timeline">{jobs.map(job=><Turn key={job.id} job={job} events={events[job.id]||[]} onApproval={onApproval}/>)}</div>;
}
