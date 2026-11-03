'use client';
import React, {useCallback,useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import { Plus, FolderClosed, PanelLeft, PanelRight, Settings2, Search, Bot, CircleCheck, CircleAlert, AlertCircle, LoaderCircle, Send, Square, ChevronRight, ChevronDown, GitBranch, FileCode2, TerminalSquare, X, LockKeyhole, ShieldCheck, RefreshCw, FolderGit2, Command, Code2 } from 'lucide-react';
import type {Project,ThreadSummary,Thread,Job,EventRecord,FileNode,NativeThread,CodexStatus} from './types';
import MessageStream from './MessageStream';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { computeKeyboardViewport } from '@/lib/viewport-geometry.mjs';
import { getSwipeAction } from '@/lib/mobile-swipe.mjs';
import { viewportSample } from '@/lib/viewport-diagnostics.mjs';

async function api<T>(path:string,init?:RequestInit):Promise<T>{
 const response=await fetch(path,{cache:'no-store',...init,headers:{...(init?.body?{'Content-Type':'application/json'}:{}),...init?.headers}});
 const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||`HTTP ${response.status}`);return body as T;
}
const post=(path:string,data:unknown)=>api<Record<string,unknown>>(path,{method:'POST',body:JSON.stringify(data)});
const subscribeDebugFlag=()=>()=>{};
const getDebugFlag=()=>new URLSearchParams(window.location.search).has('viewportDebug');
const finishStates=['completed','failed','cancelled','interrupted'];

function FileList({files,depth=0}:{files:FileNode[],depth?:number}){return <div className="file-tree">{files.map((file,index)=><FileRow file={file} depth={depth} key={index}/>)}</div>}
function FileRow({file,depth}:{file:FileNode,depth:number}){const [open,setOpen]=useState(depth<2);return <div>
 <button className="file-row" type="button" style={{paddingLeft:10+depth*16}} onClick={()=>file.type==='directory'&&setOpen(!open)}>
 {file.type==='directory'?open?<ChevronDown size={13}/>:<ChevronRight size={13}/>:<span className="file-chevron"/>}
 {file.type==='directory'?<FolderClosed size={15} className="folder-glyph"/>:<FileCode2 size={14} className="file-glyph"/>}<span>{file.name}</span>
 </button>{file.type==='directory'&&open&&file.children&&<FileList files={file.children} depth={depth+1}/>}</div>}

const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const label=(value:unknown):string=>typeof value==='string'?value:'';
function SkillDirectory({items,onUse}:{items:unknown[],onUse:(name:string)=>void}){
 return <div className="v2-directory">{items.map((item,i)=>{const row=record(item);const name=label(row.name);
  return <div className="v2-directory-card" key={name||i}><div className="v2-directory-heading"><strong>{name||'未命名 Skill'}</strong><span>{row.enabled===false?'已停用':'可用'}</span></div>
  <p>{label(row.description)||'這個 Skill 未提供描述。'}</p>
  <button type="button" className="outline-btn" disabled={!name||row.enabled===false} onClick={()=>onUse(name)}>在對話中使用</button></div>;})}</div>;
}
function McpDirectory({items}:{items:unknown[]}){
 return <div className="v2-directory">{items.map((item,i)=>{const row=record(item);const name=label(row.name);const tools=Array.isArray(row.tools)?row.tools:[];
  return <section className="v2-directory-card" key={name||i}><div className="v2-directory-heading"><strong>{name||'未命名伺服器'}</strong><span>{label(row.status)||'狀態未知'}</span></div>
  <small>{tools.length} 項已公開工具</small>{tools.map((tool,j)=>{const t=record(tool);return <details key={j}><summary>{label(t.name)||'工具'}</summary><p>{label(t.description)||'沒有描述'}</p></details>})}</section>;})}</div>;
}

export default function Workspace(){
 const [auth,setAuth]=useState<'checking'|'login'|'ready'>('checking');const [configured,setConfigured]=useState(true);
 const [password,setPassword]=useState('');const [loginBusy,setLoginBusy]=useState(false);
 const [projects,setProjects]=useState<Project[]>([]);const [project,setProject]=useState<Project|null>(null);
 const [threads,setThreads]=useState<ThreadSummary[]>([]);const [thread,setThread]=useState<Thread|null>(null);
 const [events,setEvents]=useState<Record<string,EventRecord[]>>({});
 const [native,setNative]=useState<NativeThread|null>(null);const [nativeThreads,setNativeThreads]=useState<{id:string;title:string;updatedAt:string}[]>([]);const [codexStatus,setCodexStatus]=useState<CodexStatus|null>(null);
 const [files,setFiles]=useState<FileNode[]>([]);const [git,setGit]=useState({status:'',diff:''});
 const [rightTab,setRightTab]=useState<'files'|'changes'|'output'>('files');
 const [sidebarOpen,setSidebarOpen]=useState(false);const [rightOpen,setRightOpen]=useState(false);
 const [modal,setModal]=useState<'settings'|'project'|'search'|'model'|'sandbox'|'skills'|'mcp'|null>(null);const [path,setPath]=useState('');const [projectName,setProjectName]=useState('');
 const [modelPickerStep,setModelPickerStep]=useState<'model'|'effort'>('model');
 const [search,setSearch]=useState('');const [prompt,setPrompt]=useState('');const [sandbox,setSandbox]=useState('workspace-write');const [model,setModel]=useState('');const [effort,setEffort]=useState('');
 const [connected,setConnected]=useState(false);const [version,setVersion]=useState('');
 const [loading,setLoading]=useState(false);const [submitting,setSubmitting]=useState(false);const [error,setError]=useState('');
 const [historyTruncated,setHistoryTruncated]=useState(false);
 const [skillData,setSkillData]=useState<{supported:boolean;items:unknown[];message?:string}|null>(null);
 const [mcpData,setMcpData]=useState<{supported:boolean;items:unknown[];message?:string}|null>(null);
 const viewportDebug=useSyncExternalStore(subscribeDebugFlag,getDebugFlag,()=>false);
 const chatScrollRef=useRef<HTMLDivElement>(null);
 const closeToBottom=useRef(true);
 const selection=useRef(0);
 const gestureStart=useRef<{x:number;y:number;t:number;width:number;protectedTarget:boolean}|null>(null);
 const handleSwipeStart=(e:React.TouchEvent<HTMLElement>)=>{
  if(e.touches.length!==1 || window.innerWidth>767 || sidebarOpen || modal || rightOpen){gestureStart.current=null;return;}
  const target=e.target as Element;
  const protectedTarget=Boolean(target.closest('button,a,input,textarea,select,pre,code,[contenteditable="true"],.composer-actions,.approval-card,.tool-output,.git-output'));
  const touch=e.touches[0];
  gestureStart.current={x:touch.clientX,y:touch.clientY,t:Date.now(),width:window.innerWidth,protectedTarget};
 };
 const handleSwipeEnd=(e:React.TouchEvent<HTMLElement>)=>{
  const start=gestureStart.current;gestureStart.current=null;
  if(!start||!e.changedTouches.length)return;
  const touch=e.changedTouches[0];
  const action=getSwipeAction({startX:start.x,startY:start.y,endX:touch.clientX,endY:touch.clientY,
   elapsedMs:Date.now()-start.t,width:start.width,protectedTarget:start.protectedTarget});
  if(action==='conversations'){setSidebarOpen(true);setRightOpen(false);}
  if(action==='settings'){setModal('settings');setSidebarOpen(false);}
 };
 useEffect(()=>{void api<{authenticated:boolean,configured:boolean}>('/api/auth').then(x=>{setConfigured(x.configured);setAuth(x.authenticated?'ready':'login');}).catch(()=>setAuth('login'));},[]);
 useEffect(()=>{document.documentElement.dataset.theme='dark';try{localStorage.removeItem('codex-web-theme')}catch{/* Safari private mode */}},[]);
 // iOS Safari moves the visual viewport when the keyboard opens.
 // Only .app is fixed; all its children, including the composer, remain
 // in a single flex layout. offsetTop is measured in fixed layout coordinates.
 useEffect(()=>{
  const root=document.documentElement;
  const viewport=window.visualViewport;

  let frame=0;
  let timers:ReturnType<typeof setTimeout>[]=[];
  let baseline=Math.max(window.innerHeight,viewport?.height||0);
  const sync=()=>{
   cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{
    const active=document.activeElement;
    const focused=active instanceof HTMLElement && active.matches('input, textarea, [contenteditable="true"]');
    const vheight=viewport?.height||window.innerHeight;
    if(!focused)baseline=Math.max(baseline,vheight,window.innerHeight);
    const state=computeKeyboardViewport({visualHeight:vheight,layoutHeight:window.innerHeight,
     baselineHeight:baseline,focused,scale:viewport?.scale||1,offsetTop:viewport?.offsetTop||0});
    root.dataset.keyboardOpen=String(state.keyboardOpen);
    root.style.setProperty('--chat-visible-height',state.height);
    root.style.setProperty('--v2-height',state.height);
    root.style.setProperty('--chat-viewport-top',state.top);
    root.style.setProperty('--chat-safe-bottom',state.keyboardOpen?'0px':'env(safe-area-inset-bottom,0px)');
    root.style.setProperty('--v2-bottom',state.keyboardOpen?'0px':'env(safe-area-inset-bottom,0px)');
    if(new URLSearchParams(location.search).has('viewportDebug')){
     const app=document.querySelector('.app')?.getBoundingClientRect();
     const composerRect=document.querySelector('.composer-wrap')?.getBoundingClientRect();
     const record=viewportSample({innerHeight:innerHeight,scrollY:scrollY,
      visualHeight:viewport?.height??null,offsetTop:viewport?.offsetTop??null,
      pageTop:viewport?.pageTop??null,scale:viewport?.scale??1,
      appTop:app?.top??null,appBottom:app?.bottom??null,
      composerTop:composerRect?.top??null,composerBottom:composerRect?.bottom??null,focused});
     try{
      const key='codex-viewport-diagnostic-v1';
      const history=JSON.parse(sessionStorage.getItem(key)||'[]') as unknown[];
      sessionStorage.setItem(key,JSON.stringify([...history.slice(-59),{at:Date.now(),...record}]));
     }catch{/* Safari private mode */}
    }
   });
  };
  const resync=()=>{sync();timers.forEach(clearTimeout);timers=[setTimeout(sync,70),setTimeout(sync,220),setTimeout(sync,450)];};
  const orient=()=>{baseline=0;resync();};
  resync();
  viewport?.addEventListener('resize',resync);
  viewport?.addEventListener('scroll',resync);
  window.addEventListener('resize',resync);
  window.addEventListener('orientationchange',orient);
  document.addEventListener('focusin',resync);
  document.addEventListener('focusout',resync);
  const onShow=()=>resync();window.addEventListener('pageshow',onShow);
  return ()=>{
   cancelAnimationFrame(frame);timers.forEach(clearTimeout);
   viewport?.removeEventListener('resize',resync);
   viewport?.removeEventListener('scroll',resync);
   window.removeEventListener('resize',resync);window.removeEventListener('orientationchange',orient);
   window.removeEventListener('pageshow',onShow);
   document.removeEventListener('focusin',resync);document.removeEventListener('focusout',resync);
   delete root.dataset.keyboardOpen;
   root.style.removeProperty('--chat-visible-height');root.style.removeProperty('--chat-safe-bottom');root.style.removeProperty('--v2-height');root.style.removeProperty('--v2-bottom');
   root.style.removeProperty('--chat-viewport-top');
  };
 },[]);
 useEffect(()=>{
   if(modal!=='skills'&&modal!=='mcp')return;
   let active=true;
   const kind=modal;
   void api<{supported:boolean;items:unknown[];message?:string}>(`/api/codex/${kind}`).then(data=>{
    if(!active)return;
    if(kind==='skills')setSkillData(data);
    else setMcpData(data);
   }).catch(()=>{
    if(!active)return;
    const fallback={supported:false,items:[],message:'無法向 Codex App Server 讀取資料'};
    if(kind==='skills')setSkillData(fallback);else setMcpData(fallback);
   });
   return()=>{active=false;};
 },[modal]);
 useEffect(()=>{document.body.classList.toggle('drawer-active',sidebarOpen||rightOpen||Boolean(modal));return()=>document.body.classList.remove('drawer-active');},[sidebarOpen,rightOpen,modal]);
 const notify=useCallback((message:string)=>{setError(message);window.setTimeout(()=>setError(''),6000)},[]);
 const loadThreads=useCallback(async(projectId:string)=>{const result=await api<{threads:ThreadSummary[]}>(`/api/threads?projectId=${encodeURIComponent(projectId)}`);setThreads(result.threads);return result.threads},[]);
 const loadThread=useCallback(async(id:string)=>{const token=++selection.current;setLoading(true);
 try{const data=await api<{thread:Thread}>(`/api/threads/${id}`);const all=await Promise.all(data.thread.jobs.map(async j=>{let after=0;let truncated=false;const gathered:EventRecord[]=[];for(let page=0;page<200;page++){const res=await api<{events:EventRecord[],hasMore:boolean}>(`/api/jobs/${j.id}/history?after=${after}`).catch(()=>({events:[],hasMore:false}));gathered.push(...res.events);if(!res.hasMore)break;after=res.events.at(-1)?.id||after;if(page===199)truncated=true;}return [j.id,gathered,truncated] as const;}));
 const nativeData=data.thread.codexThreadId?await api<{thread:NativeThread}>(`/api/native-threads/${data.thread.codexThreadId}`).catch(()=>null):null;
 if(token===selection.current){setThread(data.thread);setEvents(Object.fromEntries(all.map(([jobId,items])=>[jobId,items])));setHistoryTruncated(all.some(([, ,truncated])=>truncated));setNative(nativeData?.thread||null);}}
 catch(e){if(token===selection.current)notify(String(e));}finally{if(token===selection.current)setLoading(false);}
 },[notify]);
 const loadProject=useCallback(async(p:Project,selectFirst=true)=>{selection.current++;setProject(p);setThread(null);setNative(null);setThreads([]);setEvents({});setHistoryTruncated(false);setSidebarOpen(false);
 try{const list=await loadThreads(p.id);if(selectFirst&&list[0])await loadThread(list[0].id);const inspect=await api<{files:FileNode[];status:string;diff:string}>(`/api/projects/${p.id}/inspect`).catch(()=>({files:[],status:'',diff:''}));setFiles(inspect.files);setGit({status:inspect.status,diff:inspect.diff});}catch(e){notify(String(e));}
 },[loadThreads,loadThread,notify]);
 const init=useCallback(async()=>{try{const [{projects:ps},health,status,nativeData]=await Promise.all([api<{projects:Project[]}>('/api/projects'),api<{connected:boolean;version:string}>('/api/health'),api<CodexStatus>('/api/codex/status').catch(()=>null),api<{threads:{id:string;title:string;updatedAt:string}[]}>('/api/native-threads').catch(()=>({threads:[]}))]);setProjects(ps);setConnected(health.connected);setVersion(health.version);setCodexStatus(status);setNativeThreads(nativeData.threads);
 if(ps.length){const saved=localStorage.getItem('codex-last-project');const selected=ps.find(p=>p.id===saved)||ps[0];await loadProject(selected);} }
 catch(e){notify(e instanceof Error?e.message:'無法連線至伺服器');}},[loadProject,notify]);
 useEffect(()=>{if(auth!=='ready')return;const timer=window.setTimeout(()=>{void init();},0);return()=>window.clearTimeout(timer);},[auth,init]);
 useEffect(()=>{if(project)localStorage.setItem('codex-last-project',project.id);},[project]);
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setSearch('');setModal('search');}if(e.key==='Escape'){setModal(null);setSidebarOpen(false);setRightOpen(false);}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[]);
 const activeJob=useMemo(()=>thread?.jobs.find(j=>j.status==='running'||j.status==='queued')||null,[thread]);
 const sidebarThreads=useMemo(()=>{
  const nativeById=new Map(nativeThreads.map(item=>[item.id,item]));const knownNativeIds=new Set<string>();
  const combined:Array<{key:string;threadId:string|null;codexThreadId:string|null;title:string;updatedAt:string}>=threads.map(item=>{if(item.codexThreadId)knownNativeIds.add(item.codexThreadId);const nativeItem=item.codexThreadId?nativeById.get(item.codexThreadId):null;return {key:`web-${item.id}`,threadId:item.id,codexThreadId:item.codexThreadId,title:nativeItem?.title||item.title,updatedAt:nativeItem?.updatedAt||item.updatedAt};});
  for(const item of nativeThreads)if(!knownNativeIds.has(item.id))combined.push({key:`native-${item.id}`,threadId:null,codexThreadId:item.id,title:item.title,updatedAt:item.updatedAt});
  return combined.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 },[threads,nativeThreads]);
 // Native sessions include the messages produced by WebUI jobs. Display only
 // native turns not represented by those jobs to avoid showing the same prompt
 // and reply twice. Match from newest to oldest so repeated prompts remain stable.
 const nativeVisibleItems=useMemo(()=>{
  if(!native)return [];
  const groups:Array<typeof native.items>=[];
  for(const item of native.items){
   if(item.role==='user'||!groups.length)groups.push([item]);
   else groups[groups.length-1].push(item);
  }
  const hidden=new Set<number>();
  for(const job of [...(thread?.jobs||[])].reverse()){
   for(let i=groups.length-1;i>=0;i--){
    if(!hidden.has(i)&&groups[i][0]?.role==='user'&&groups[i][0].text.trim()===job.prompt.trim()){
     hidden.add(i);break;
    }
   }
  }
  return groups.flatMap((group,index)=>hidden.has(index)?[]:group);
 },[native,thread?.jobs]);
 const selectedProjectId=project?.id;
 const jobIds=thread?.jobs.filter(j=>!finishStates.includes(j.status)).map(j=>j.id).join(',')||'';
 useEffect(()=>{if(!thread||!jobIds)return;
 const live=jobIds.split(',').filter(Boolean).map(id=>{
   const current=events[id]||[];const cursor=current.at(-1)?.id||0;const stream=new EventSource(`/api/jobs/${id}/events?after=${cursor}`);
   stream.onmessage=message=>{try{const item=JSON.parse(message.data) as EventRecord;setEvents(s=>{const list=s[id]||[];if(list.some(e=>e.id===item.id))return s;return {...s,[id]:[...list,item]};});
      if(item.type==='webui.finished'){stream.close();void loadThread(thread.id);if(project){void loadThreads(project.id);void api<{files:FileNode[],status:string,diff:string}>(`/api/projects/${project.id}/inspect`).then(x=>{setFiles(x.files);setGit({status:x.status,diff:x.diff})});}}
    }catch{}};
   stream.onerror=()=>{stream.close();window.setTimeout(()=>{void loadThread(thread.id)},1600)};
   return stream;
 });return()=>live.forEach(s=>s.close());
 // Do not re-create streams per incoming event (cursor only used at connection time).
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[jobIds,thread?.id,project?.id,loadThread,loadThreads]);
 useEffect(()=>{if(!native?.id||!thread?.id)return;const stream=new EventSource(`/api/native-threads/${native.id}/events`);stream.onmessage=()=>{void loadThread(thread.id);if(selectedProjectId)void loadThreads(selectedProjectId);};stream.onerror=()=>{stream.close();};return()=>stream.close();},[native?.id,thread?.id,selectedProjectId,loadThread,loadThreads]);
 useEffect(()=>{
  const container=chatScrollRef.current;
  if(container&&closeToBottom.current)container.scrollTop=container.scrollHeight;
 },[thread?.jobs.length,events,native?.items.length]);
 async function login(e:React.FormEvent){e.preventDefault();setLoginBusy(true);try{await post('/api/auth',{password});setPassword('');setAuth('ready');}catch(e){notify(e instanceof Error?e.message:'登入失敗');}finally{setLoginBusy(false);}}
 async function addProject(e:React.FormEvent){e.preventDefault();try{const result=await post('/api/projects',{name:projectName,path});const newP=result.project as Project;setProjects(s=>[newP,...s.filter(p=>p.id!==newP.id)]);setPath('');setProjectName('');setModal(null);await loadProject(newP,false);}catch(e){notify(e instanceof Error?e.message:'新增失敗');}}
 async function newThread(){if(!project){setModal('project');return;}try{const data=await post('/api/threads',{projectId:project.id});const t=data.thread as Thread;selection.current++;setThreads(x=>[{id:t.id,projectId:t.projectId,title:t.title,updatedAt:t.updatedAt,codexThreadId:null,modelRoute:null},...x]);setThread(t);setNative(null);setEvents({});setHistoryTruncated(false);setSidebarOpen(false);setPrompt('');}catch(e){notify(String(e));}}
 async function selectNative(codexThreadId:string){if(!project)return;try{const data=await post('/api/threads',{projectId:project.id,codexThreadId});const current=data.thread as Thread;await loadThreads(project.id);await loadThread(current.id);setSidebarOpen(false);}catch(e){notify(e instanceof Error?e.message:'無法開啟原生對話');}}
 async function submit(){const content=prompt.trim();if(!project||!content||submitting||activeJob?.status==='queued')return;
 setSubmitting(true);try{
 if(activeJob){await post(`/api/jobs/${activeJob.id}/steer`,{prompt:content});setPrompt('');return;}
 let current=thread;if(!current){const data=await post('/api/threads',{projectId:project.id});current=data.thread as Thread;setThread(current);}
 const requestKey=globalThis.crypto?.randomUUID?.()||`webui-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
 const data=await post(`/api/threads/${current!.id}/turns`,{prompt:content,sandbox,model,effort,requestKey});
 setPrompt('');const job=data.job as Job;
 setThread(s=>s&&s.id===current!.id?{...s,title:s.title==='新的對話'?content.slice(0,36):s.title,jobs:[...s.jobs,job]}:s);
 await loadThreads(project.id);
 }catch(e){notify(e instanceof Error?e.message:'發送失敗');}finally{setSubmitting(false);}}
 async function stop(){if(!activeJob)return;try{await post(`/api/jobs/${activeJob.id}/cancel`,{});}catch(e){notify(String(e));}}
 async function approve(jobId:string,requestId:string,decision:'accept'|'acceptForSession'|'decline'){try{await post(`/api/jobs/${jobId}/approval`,{requestId,decision});}catch(e){notify(e instanceof Error?e.message:'無法處理批准');}}
 const selectThread=async(id:string)=>{setSidebarOpen(false);await loadThread(id);};
 const filtered=useMemo(()=>threads.map(t=>({id:t.id,type:'thread',text:t.title,sub:'此工作區的對話'})).filter(x=>(x.text+x.sub).toLowerCase().includes(search.toLowerCase())),[threads,search]);
 const selectedModel=codexStatus?.models.find(m=>m.id===(model||codexStatus?.defaultModel));
 const modelDisplay=selectedModel?.name||model||codexStatus?.defaultModel||'預設模型';
 const modelEfforts=selectedModel?.reasoningEfforts||[];
 const cliBadge=connected?<><CircleCheck size={14}/><span>{version||'Codex CLI 已連接'}</span></>:<><CircleAlert size={14}/><span>Codex CLI 未連接</span></>;
 if(auth==='checking')return <main className="auth-page"><div className="loading-box"><LoaderCircle size={26} className="spin"/>正在連線至伺服器…</div></main>;
 if(auth==='login')return <main className="auth-page"><form onSubmit={login} className="login-card"><div className="login-icon"><Bot size={30}/></div><h1>Codex WebUI</h1><p>登入你的 Ubuntu Codex 工作空間</p>{!configured&&<div className="setup-warning"><CircleAlert size={17}/>尚未設定網站密碼。請在 Ubuntu 設定 WEBUI_PASSWORD_HASH。</div>}
 <label htmlFor="password">登入密碼</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="輸入網站密碼"/><button className="primary-button" disabled={loginBusy||!configured}>{loginBusy?<LoaderCircle size={16} className="spin"/>:<LockKeyhole size={16}/>}登入</button><span className="login-hint"><ShieldCheck size={14}/> 僅供私人 VPN 網路存取</span></form>{error&&<div role="alert" className="toast">{error}</div>}</main>;
 return <div className="app">
 <header className="topbar"><button className="icon-btn hamburger" type="button" title="開啟選單" onClick={()=>setSidebarOpen(true)}><PanelLeft size={19}/></button>
 <div className="brand"><span>Codex</span></div>
 <button className="top-search" type="button" onClick={()=>{setSearch('');setModal('search');}}><Search size={16}/><span>搜尋對話...</span><span className="keycap">⌘ K</span></button>
 <div className="top-actions"><span className={`connected-label ${connected?'connected':'disconnected'}`}><span className="dot"/>{connected?'Codex 已連接':'Codex 離線'}</span><button className="icon-btn" title="設定" onClick={()=>setModal('settings')}><Settings2 size={19}/></button></div>
 </header>
 <div className="body">
 <aside className={`sidebar ${sidebarOpen?'open':''}`}>
  <button className="new-btn" onClick={()=>void newThread()}><Plus size={18}/>新增對話</button>
  <nav className="side-nav"><button className="nav-item active" onClick={()=>setSidebarOpen(false)}><Command size={17}/>工作區</button><button className="nav-item" onClick={()=>setModal('skills')}><Code2 size={17}/>Skills</button><button className="nav-item" onClick={()=>setModal('mcp')}><TerminalSquare size={17}/>MCP</button><button className="nav-item" onClick={()=>setModal('settings')}><Settings2 size={17}/>設定</button></nav>
  <div className="workspace-path"><FolderGit2 size={15}/><span>{project?.path||'正在載入工作區…'}</span></div>
  <div className="sidebar-conversations"><div className="section"><div className="section-heading"><span>對話</span><span>{sidebarThreads.length}</span></div>
   {sidebarThreads.map(item=><button className={`thread ${thread?.id===item.threadId||thread?.codexThreadId===item.codexThreadId?'selected':''}`} key={item.key} onClick={()=>item.threadId?void selectThread(item.threadId):void selectNative(item.codexThreadId!)}><Code2 size={16}/><span className="thread-label">{item.title}</span></button>)}
   {!sidebarThreads.length&&<div className="empty-side">尚無對話紀錄</div>}
  </div>
  </div><div className="sidebar-footer"><span className={`status-dot ${connected?'ok':''}`}/><strong>Codex</strong><span>{connected?'已連接':'無法連接'}</span><span className="version">LOCAL</span></div>
 </aside>
 <div className={`scrim ${sidebarOpen?'active':''}`} onClick={()=>setSidebarOpen(false)}/>
 <main className="main" onTouchStart={handleSwipeStart} onTouchEnd={handleSwipeEnd} onTouchCancel={()=>{gestureStart.current=null;}}>
  <div className="session-head"><div className="session-heading-group"><div className="session-title"><span>{thread?.title||'新增對話'}</span></div><div className="session-subtitle">{project?.path||'固定工作區'}</div></div>
   <div className="session-actions"><span className="project-branch"><GitBranch size={13}/> workspace</span><button type="button" className="outline-btn" onClick={()=>setRightOpen(x=>!x)}><PanelRight size={15}/><span className="hide-small">檔案</span></button></div>
  </div>
  <div className="chat-scroll" ref={chatScrollRef} onScroll={event=>{const el=event.currentTarget;closeToBottom.current=el.scrollHeight-el.scrollTop-el.clientHeight<110;}}><div className="chat-content">
  {!project?<div className="welcome-screen"><div className="welcome-icon"><Bot size={31}/></div><h1>正在連接固定工作區</h1><p>確認 DEFAULT_PROJECT_PATH 指向這個 Codex 工作區即可開始使用。</p></div>:
   thread?<>{historyTruncated&&<div className="error-box"><AlertCircle size={16}/>此對話的歷史事件過多，僅載入前 200,000 筆。</div>}{native?<><div className="native-messages">{nativeVisibleItems.map(item=><div className={`native-message ${item.role}`} key={item.id}>{item.role==='tool'?<details className="v2-tool"><summary>{item.type||'Codex 工具'} · 檢視原生紀錄</summary><pre>{item.text||'此工具沒有文字輸出'}</pre></details>:<><strong>{item.role==='user'?'你':'Codex'}</strong>{item.role==='assistant'?<div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{item.text}</ReactMarkdown></div>:<p>{item.text}</p>}</>}</div>)}</div>{native.usage&&<div className="token-usage">本對話累計 · 輸入 {native.usage.input_tokens||0} · 輸出 {native.usage.output_tokens||0} · 總計 {native.usage.total_tokens||0} tokens</div>}</>:null}{thread.jobs.length>0&&<MessageStream jobs={thread.jobs} events={events} onApproval={approve}/>}</>:<div className="empty-chat"><div className="empty-mark"><Bot size={32}/></div><h2>從一個指令開始</h2><p>Codex 將在 <strong>{project.name}</strong> 專案目錄中工作。</p><div className="example-prompts"><span onClick={()=>setPrompt('檢查專案架構並提出改善建議')}>檢查專案架構</span><span onClick={()=>setPrompt('執行現有測試並整理問題')}>執行測試</span><span onClick={()=>setPrompt('閱讀 README 並說明專案如何運作')}>瞭解專案</span></div></div>}
   </div></div>
  <div className="composer-wrap"><form className="composer" onSubmit={e=>{e.preventDefault();void submit();}}>
   <label htmlFor="prompt" className="screen-reader-only">傳送訊息給 Codex</label>
   <textarea id="prompt" onMouseDown={e=>{if(window.matchMedia('(pointer: coarse)').matches && document.activeElement!==e.currentTarget){e.currentTarget.focus({preventScroll:true});e.preventDefault();}}} placeholder={activeJob?.status==='running'?'追加指示至進行中的 Codex…':project?'向 Codex 傳送訊息...':'請先新增或選擇專案'} value={prompt} onChange={e=>setPrompt(e.target.value)} disabled={!project||activeJob?.status==='queued'} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void submit();}}} rows={3}/>
   <div className="composer-actions">
    <button type="button" className="composer-model-trigger" aria-label="選擇模型與推理強度" aria-haspopup="dialog" title={modelDisplay+(effort?' · '+effort:'')} disabled={Boolean(activeJob)} onClick={()=>{setModelPickerStep('model');setModal('model');}}>
     <span className="composer-model-label">{modelDisplay}{effort?' · '+effort:''}</span><ChevronDown size={13}/>
    </button>
    <button type="button" className="composer-sandbox-trigger" aria-label={`選擇執行權限：${sandbox==='workspace-write'?'工作區寫入':'唯讀'}`} title={sandbox==='workspace-write'?'工作區寫入':'唯讀'} aria-haspopup="dialog" disabled={Boolean(activeJob)} onClick={()=>setModal('sandbox')}>
     <span className="composer-sandbox-label">{sandbox==='workspace-write'?'工作區寫入':'唯讀'}</span><ChevronDown size={13}/>
    </button>
    {activeJob&&<button type="button" className="v2-stop-btn" onClick={()=>void stop()} title="停止目前回合" aria-label="停止目前回合"><Square size={15} fill="currentColor"/></button>}
    <button type="submit" className="send-btn" disabled={!prompt.trim()||!project||submitting||activeJob?.status==='queued'} title={activeJob?'追加指示':'傳送'} aria-label={activeJob?'追加指示':'傳送'}>{submitting?<LoaderCircle size={17} className="spin"/>:<Send size={18}/>}</button>
   </div>
   </form><div className="footer-note">{loading?'正在載入對話…':activeJob?'工作正在 Ubuntu 持續執行；離開網頁不會停止它。':'本機 Codex App Server · 固定工作區'}</div></div>
 </main>
 {rightOpen&&<aside className="right open" id="right-panel"><div className="right-tabs"><button className={`right-tab ${rightTab==='files'?'active':''}`} onClick={()=>setRightTab('files')}><FolderClosed size={15}/>檔案</button><button className={`right-tab ${rightTab==='changes'?'active':''}`} onClick={()=>setRightTab('changes')}><GitBranch size={15}/>變更</button><button className={`right-tab ${rightTab==='output'?'active':''}`} onClick={()=>setRightTab('output')}><TerminalSquare size={15}/>輸出</button><button className="icon-btn right-close" onClick={()=>setRightOpen(false)} aria-label="關閉側欄"><X size={17}/></button></div><div className="right-body">
 {rightTab==='files'?<><div className="right-h2"><span><FolderGit2 size={15}/> {project?.name||'專案檔案'}</span><button className="tiny-btn" aria-label="重新整理檔案" onClick={()=>{if(project)void api<{files:FileNode[],status:string,diff:string}>(`/api/projects/${project.id}/inspect`).then(x=>{setFiles(x.files);setGit({status:x.status,diff:x.diff})})}}><RefreshCw size={14}/></button></div><FileList files={files}/>{!files.length&&<p className="empty-side">沒有可顯示的檔案</p>}</>:
 rightTab==='changes'?<><div className="right-h2">Git 工作目錄變更</div><pre className="git-output">{git.status||'工作目錄乾淨，或目前未選取專案。'}</pre><div className="right-h2">變更摘要</div><pre className="git-output">{git.diff||'沒有未提交的差異摘要。'}</pre></>:
 <><div className="right-h2">目前對話的事件輸出</div><pre className="git-output terminal-output">{thread?.jobs.flatMap(j=>(events[j.id]||[]).filter(e=>['item.completed','webui.error','turn.failed'].includes(e.type)).map(e=>JSON.stringify(e.payload,null,2))).slice(-12).join('\n\n')||'尚無 Codex 執行事件。'}</pre></>}
 </div><div className="right-bottom"><span className="circle"/>僅顯示 Ubuntu 已授權專案中的資訊</div></aside>}
 </div>
 {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><div className="modal" role="dialog" aria-modal="true" aria-label="視窗"><header className="modal-title"><h2>{modal==='settings'?'偏好設定':modal==='project'?'新增專案':modal==='model'?(modelPickerStep==='effort'?'選擇推理強度':'選擇模型'):modal==='sandbox'?'執行權限':modal==='skills'?'Codex Skills':modal==='mcp'?'MCP 伺服器':'搜尋對話'}</h2><button className="icon-btn" onClick={()=>setModal(null)} aria-label="關閉"><X size={20}/></button></header>
 {modal==='model'?<div className="quick-options v2-model-picker">{modelPickerStep==='model'
   ?[{value:'',label:`預設 · ${codexStatus?.defaultModel||'Codex CLI'}`},...(codexStatus?.models||[]).map(m=>({value:m.id,label:m.name}))].map(option=><button type="button" key={option.value} className="quick-option" onClick={()=>{setModel(option.value);setEffort('');const selected=codexStatus?.models.find(m=>m.id===(option.value||codexStatus?.defaultModel));if(selected?.reasoningEfforts?.length)setModelPickerStep('effort');else setModal(null);}}><span>{option.label}</span><span>{model===option.value?'✓':''}</span></button>)
   :<><button type="button" className="v2-picker-back" onClick={()=>setModelPickerStep('model')}>← 返回模型列表</button><p className="v2-picker-caption">{modelDisplay}</p>{[{value:'',label:'預設強度'},...modelEfforts.map(v=>({value:v,label:v}))].map(option=><button type="button" key={option.value} className="quick-option" onClick={()=>{setEffort(option.value);setModal(null);}}><span>{option.label}</span><span>{effort===option.value?'✓':''}</span></button>)}</>}
   </div>:modal==='sandbox'?<div className="quick-options">{[{value:'workspace-write',label:'可修改工作區 · workspace-write'},{value:'read-only',label:'唯讀 · read-only'}].map(option=><button type="button" key={option.value} className="quick-option" onClick={()=>{setSandbox(option.value);setModal(null);}}><span>{option.label}</span><span>{sandbox===option.value?'✓':''}</span></button>)}</div>:modal==='settings'?<div className="settings-content"><div className="settings-section-label">執行設定</div>
 <div className="form-field"><span className="form-label">模型與推理強度</span><button type="button" className="outline-btn v2-settings-model-trigger" disabled={Boolean(activeJob)} onClick={()=>{setModelPickerStep('model');setModal('model');}}><span>{modelDisplay} · {effort||'預設強度'}</span><ChevronRight size={16}/></button></div>
 <label className="form-field"><span className="form-label">Sandbox 權限</span><select className="select" value={sandbox} onChange={e=>setSandbox(e.target.value)}><option value="workspace-write">workspace-write · 可修改專案</option><option value="read-only">read-only · 唯讀</option></select></label>
 <div className="settings-section-label">剩餘額度</div><div className="usage-list">{codexStatus?.usageWindows.length?codexStatus.usageWindows.map(window=><div className="usage-row" key={window.label}><span>{window.label}</span><strong>{window.remainingPercent}%</strong></div>):<p className="form-help">目前 Codex CLI 未提供可顯示的額度資料。</p>}</div>
 {viewportDebug&&<button className="outline-btn" type="button" onClick={()=>{
  const data=sessionStorage.getItem('codex-viewport-diagnostic-v1')||'[]';
  const file=new Blob([data],{type:'application/json'});
  const url=URL.createObjectURL(file);const link=document.createElement('a');
  link.href=url;link.download='codex-viewport-diagnostic.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }}>匯出 iPhone 版面診斷（不含訊息內容）</button>}
 <div className="settings-section-label">伺服器</div><div className="settings-health">{cliBadge}<button className="outline-btn" onClick={()=>void api<{connected:boolean;version:string}>('/api/health').then(h=>{setConnected(h.connected);setVersion(h.version)})}><RefreshCw size={14}/>重新檢查</button></div><p className="form-help">此頁使用 Ubuntu 本機既有的 Codex 登入狀態；不會要求或儲存網站密碼。</p></div>:
 modal==='skills'||modal==='mcp'?<div className="settings-content"><div className="settings-section-label">{modal==='skills'?'本機 Skills':'MCP 工具與伺服器'}</div>{(()=>{const data=modal==='skills'?skillData:mcpData;if(!data)return <p className="form-help">正在讀取 Codex 資料…</p>;if(!data.supported)return <p className="form-help">{data.message||'目前的 Codex 版本未提供此功能。'}</p>;return data.items.length?(modal==='skills'?<SkillDirectory items={data.items} onUse={name=>{setPrompt(prev=>(prev?prev+' ':'')+String.fromCharCode(36)+name+' ');setModal(null);}}/>:<McpDirectory items={data.items}/>):<p className="form-help">目前沒有可顯示的項目。</p>;})()}</div>:modal==='project'?<form onSubmit={e=>void addProject(e)} className="settings-content"><p className="form-help">只能加入位於伺服器 ALLOWED_PROJECT_ROOTS 下，且已初始化 Git 的資料夾。</p><label className="form-field"><span className="form-label">絕對路徑</span><input className="select" placeholder="/home/allen/projects/my-project" value={path} required onChange={e=>setPath(e.target.value)}/></label><label className="form-field"><span className="form-label">顯示名稱（可留空）</span><input className="select" placeholder="我的專案" value={projectName} onChange={e=>setProjectName(e.target.value)}/></label><button className="primary-button" type="submit"><Plus size={16}/>加入專案</button></form>:
 <div className="search-pane"><label className="search-input"><Search size={19}/><input autoFocus placeholder="搜尋..." value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="search-results">{filtered.map(x=><button className="search-result" key={x.type+x.id} onClick={()=>{setModal(null);if(x.type==='project'){const p=projects.find(p=>p.id===x.id);if(p)void loadProject(p);}else void selectThread(x.id)}}><Search size={16}/><span><strong>{x.text}</strong><small>{x.sub}</small></span></button>)}{filtered.length===0&&<p className="empty-side">找不到結果</p>}</div></div>}
 </div></div>}
 {error&&<div className="toast" role="alert"><CircleAlert size={17}/>{error}<button onClick={()=>setError('')}><X size={14}/></button></div>}
 </div>
}
