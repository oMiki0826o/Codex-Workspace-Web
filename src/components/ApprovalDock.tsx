'use client';
import {useMemo,useState} from 'react';
import {AlertCircle,LoaderCircle} from 'lucide-react';
import {collectPendingApprovals} from '@/lib/approvals/pending.mjs';
import type {Job,EventRecord} from './types';

type Decision='accept'|'acceptForSession'|'decline';
type Pending={jobId:string;requestId:string;event:EventRecord};
type Approve=(jobId:string,requestId:string,decision:Decision)=>Promise<void>;
const asString=(value:unknown)=>typeof value==='string'?value:'';
const formatJSON=(value:unknown)=>{try{return JSON.stringify(value,null,2);}catch{return '無法顯示內容';}};

function ApprovalPrompt({pending,count,onApproval}:{pending:Pending;count:number;onApproval:Approve}){
 const [busy,setBusy]=useState(false);
 const {jobId,requestId,event}=pending;
 const payload=event.payload;
 const command=asString(payload.command);
 const firstLine=command.split('\n')[0]||'';
 async function respond(decision:Decision){
  if(busy)return;
  setBusy(true);
  try{await onApproval(jobId,requestId,decision);}
  catch{setBusy(false);}
 }
 return <div className="v2-approval-dock-card" aria-busy={busy}>
  <div className="v2-approval-dock-heading"><strong><AlertCircle size={18}/>{payload.method==='item/permissions/requestApproval'?'需要額外權限':'需要你的允許'}</strong>{count>1&&<span className="v2-approval-count">另有 {count-1} 項待確認</span>}</div>
  <p className="v2-approval-reason">{asString(payload.reason)||'Codex 要執行需要你明確批准的操作。'}</p>
  {asString(payload.cwd)&&<small className="v2-approval-cwd">工作目錄：{asString(payload.cwd)}</small>}
  {command&&<details className="v2-approval-details"><summary title={firstLine}>檢視終端指令：<code>{firstLine}</code></summary><pre>{command}</pre></details>}
  {payload.permissions!=null&&<details className="v2-approval-details"><summary>檢視要求的權限範圍</summary><pre>{formatJSON(payload.permissions)}</pre></details>}
  {payload.networkApprovalContext!=null&&<details className="v2-approval-details"><summary>檢視網路存取目的地</summary><pre>{formatJSON(payload.networkApprovalContext)}</pre></details>}
  {payload.changes!=null&&<details className="v2-approval-details"><summary>檢查修改內容</summary><pre>{formatJSON(payload.changes)}</pre></details>}
  <div className="v2-approval-dock-actions">
   <button type="button" disabled={busy} onClick={()=>void respond('accept')}>允許這次</button>
   <button type="button" disabled={busy} onClick={()=>void respond('acceptForSession')}>此對話允許</button>
   <button type="button" disabled={busy} className="danger" onClick={()=>void respond('decline')}>拒絕</button>
  </div>
  {busy&&<p className="v2-approval-submitting" role="status"><LoaderCircle size={14} className="spin"/>已提交決定，等候 Codex 確認…</p>}
 </div>;
}

/**
 * Fixed-position in the *layout flow*: below the scrollable conversation and
 * directly above the composer, including iOS Safari's keyboard-height layout.
 */
export default function ApprovalDock({jobs,events,onApproval}:{jobs:Job[];events:Record<string,EventRecord[]>;onApproval:Approve}){
 const pending=useMemo(()=>collectPendingApprovals(jobs,events) as Pending[],[jobs,events]);
 if(!pending.length)return null;
 const current=pending[0];
 return <aside className="v2-approval-dock" role="region" aria-label="Codex 待批准操作">
  <div className="v2-approval-dock-inner">
   <ApprovalPrompt key={current.jobId+':'+current.requestId} pending={current} count={pending.length} onApproval={onApproval}/>
  </div>
 </aside>;
}
