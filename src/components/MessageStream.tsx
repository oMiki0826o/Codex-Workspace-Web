'use client';
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';
import remarkGfm from 'remark-gfm';
import { Check, AlertCircle, ChevronDown, ChevronRight, LoaderCircle, CircleStop, Bot, UserRound } from 'lucide-react';
import type {EventRecord,Job} from './types';

const textOf=(x:unknown)=>typeof x==='string'?x:'';
const obj=(x:unknown):Record<string,unknown>=>x&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:{};
function TimelineItem({event}:{event:EventRecord}){
 const [open,setOpen]=useState(false);const p=event.payload;
 const item=obj(p.item);const type=textOf(item.type);const output=textOf(item.aggregated_output)||textOf(item.output)||textOf(item.text);
 const cmd=textOf(item.command)||textOf(item.cmd);
 const detail=cmd||output;const ongoing=event.type==='item.started'||event.type==='item.updated';
 const label=type==='command_execution'?`執行指令 · ${cmd.slice(0,100)||'Terminal'}`:
 type==='file_change'?'修改專案檔案':type==='web_search'?'查詢資料':type==='reasoning'?'分析任務':type||event.type;
 return <div className="timeline-row">
   <button type="button" onClick={()=>setOpen(x=>!x)} className="timeline-trigger" aria-expanded={open}>
    {ongoing?<LoaderCircle size={15} className="spin accent-fg"/>:<Check size={15} className="success-fg"/>}
    <span>{label}</span>{detail&&<span className="disclosure">{open?<ChevronDown size={14}/>:<ChevronRight size={14}/>}</span>}
   </button>
   {open&&detail&&<pre className="tool-output">{[cmd,output].filter(Boolean).filter((s,i,a)=>a.indexOf(s)===i).join('\n\n').slice(0,12000)}</pre>}
 </div>
}
function StatusBadge({status}:{status:string}){const caption:Record<string,string>={queued:'等待執行',running:'執行中',completed:'已完成',failed:'執行失敗',cancelled:'已停止',interrupted:'服務重啟後中斷'};
 return <span className={`status-badge status-${status}`}>{status==='running'?<LoaderCircle size={13} className="spin"/>:status==='completed'?<Check size={13}/>:status==='failed'?<AlertCircle size={13}/>:<CircleStop size={13}/>} {caption[status]||status}</span>}
type ApprovalDecision='accept'|'acceptForSession'|'decline';
export default function MessageStream({jobs,events,onApproval}:{jobs:Job[];events:Record<string,EventRecord[]>;onApproval:(jobId:string,requestId:string,decision:ApprovalDecision)=>void}){
 if(!jobs.length)return <div className="empty-chat"><div className="empty-mark"><Bot size={31}/></div><h2>今天要處理什麼？</h2><p>開始一段對話，Codex 將直接在 Ubuntu 伺服器的專案目錄中工作。</p><div className="example-prompts">試試看：<span>檢查專案架構</span><span>執行測試並修復錯誤</span><span>整理 README</span></div></div>;
 return <div className="message-stack">
 {jobs.map(job=>{
   const seen=new Map<string,EventRecord>();const agentText=new Map<string,string>();let answer='';let failure='';
   for(const e of events[job.id]||[]){const p=e.payload;const item=obj(p.item);
     if(e.type==='item.started'||e.type==='item.updated'||e.type==='item.completed'){
       const ident=textOf(item.id);if(ident){seen.set(ident,e);if(item.type==='agent_message'){const content=textOf(item.text);agentText.set(ident,e.type==='item.updated'?(agentText.get(ident)||'')+content:content||agentText.get(ident)||'');}}
     }
     if(e.type==='webui.error'||e.type==='turn.failed'||e.type==='error')failure=textOf(p.message)||textOf(obj(p.error).message)||'Codex 回報錯誤';
   }
   const tools=[];const resolvedApprovals=new Set((events[job.id]||[]).filter(e=>e.type==='approval.resolved'||e.type==='appserver.serverRequest.resolved').map(e=>textOf(e.payload.requestId)||textOf(e.payload.id)));const approvals=(job.status==='running'||job.status==='queued'?(events[job.id]||[]):[]).filter(e=>e.type==='approval.request'&&!resolvedApprovals.has(textOf(e.payload.requestId)));for(const e of seen.values()){const item=obj(e.payload.item);if(item.type==='agent_message')answer=agentText.get(textOf(item.id))||textOf(item.text)||answer;else if(item.type==='reasoning'){/* avoid displaying internal reasoning */}else tools.push(e);}
   return <div className="conversation-turn" key={job.id}>
     <div className="msg"><div className="msg-avatar user"><UserRound size={17}/></div><div className="msg-area"><div className="msg-author">你 <span className="msg-time">{new Date(job.createdAt).toLocaleString('zh-TW',{hour:'2-digit',minute:'2-digit'})}</span></div><div className="user-bubble">{job.prompt}</div></div></div>
     <div className="msg"><div className="msg-avatar assistant-avatar"><Bot size={18}/></div><div className="msg-area"><div className="msg-author">Codex <StatusBadge status={job.status}/></div>
       {tools.length>0&&<div className="timeline">{tools.map(e=><TimelineItem key={e.id} event={e}/>)}</div>}
       {approvals.map(event=>{const requestId=textOf(event.payload.requestId);const command=textOf(event.payload.command);const reason=textOf(event.payload.reason);const changes=event.payload.changes;return <div className="approval-card" key={event.id}><strong>需要你的允許</strong><span>{reason||'Codex 要在工作區外執行操作。'}</span>{command&&<code>{command}</code>}{changes!=null&&<pre className="approval-changes">{JSON.stringify(changes,null,2).slice(0,8000)}</pre>}<div><button type="button" onClick={()=>onApproval(job.id,requestId,'accept')}>允許這次</button><button type="button" onClick={()=>onApproval(job.id,requestId,'acceptForSession')}>此對話都允許</button><button type="button" className="decline" onClick={()=>onApproval(job.id,requestId,'decline')}>拒絕</button></div></div>;})}
       {answer?<div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{answer}</ReactMarkdown></div>:<div className="assistant-placeholder">{job.status==='running'||job.status==='queued'?<><LoaderCircle size={15} className="spin"/> Codex 正在處理你的要求…</>:job.status==='completed'?'任務已完成。':'這個任務沒有產生完整文字回覆。'}</div>}
       {failure&&<div className="error-box"><AlertCircle size={16}/>{failure}</div>}
     </div></div>
   </div>
 })}
 </div>
}
