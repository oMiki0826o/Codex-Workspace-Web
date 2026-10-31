'use client';
import React, {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import { Plus, FolderClosed, PanelLeft, PanelRight, Settings2, Search, Moon, Sun, Bot, CircleCheck, CircleAlert, LoaderCircle, Send, Square, ChevronRight, ChevronDown, GitBranch, FileCode2, TerminalSquare, X, LockKeyhole, SlidersHorizontal, ShieldCheck, RefreshCw, FolderGit2, Command, Code2 } from 'lucide-react';
import type {Project,ThreadSummary,Thread,Job,EventRecord,FileNode,NativeThread,CodexStatus} from './types';
import MessageStream from './MessageStream';

async function api<T>(path:string,init?:RequestInit):Promise<T>{
 const response=await fetch(path,{cache:'no-store',...init,headers:{...(init?.body?{'Content-Type':'application/json'}:{}),...init?.headers}});
 const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||`HTTP ${response.status}`);return body as T;
}
const post=(path:string,data:unknown)=>api<Record<string,unknown>>(path,{method:'POST',body:JSON.stringify(data)});
const finishStates=['completed','failed','cancelled','interrupted'];
const initialTheme=()=>typeof window==='undefined'?'dark':localStorage.getItem('codex-web-theme')||'dark';

function FileList({files,depth=0}:{files:FileNode[],depth?:number}){return <div className="file-tree">{files.map((file,index)=><FileRow file={file} depth={depth} key={index}/>)}</div>}
function FileRow({file,depth}:{file:FileNode,depth:number}){const [open,setOpen]=useState(depth<2);return <div>
 <button className="file-row" type="button" style={{paddingLeft:10+depth*16}} onClick={()=>file.type==='directory'&&setOpen(!open)}>
 {file.type==='directory'?open?<ChevronDown size={13}/>:<ChevronRight size={13}/>:<span className="file-chevron"/>}
 {file.type==='directory'?<FolderClosed size={15} className="folder-glyph"/>:<FileCode2 size={14} className="file-glyph"/>}<span>{file.name}</span>
 </button>{file.type==='directory'&&open&&file.children&&<FileList files={file.children} depth={depth+1}/>}</div>}

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
 const [modal,setModal]=useState<'settings'|'project'|'search'|'model'|'effort'|'sandbox'|null>(null);const [path,setPath]=useState('');const [projectName,setProjectName]=useState('');
 const [search,setSearch]=useState('');const [prompt,setPrompt]=useState('');const [sandbox,setSandbox]=useState('workspace-write');const [model,setModel]=useState('');const [effort,setEffort]=useState('');
 const [theme,setTheme]=useState(initialTheme);const [connected,setConnected]=useState(false);const [version,setVersion]=useState('');
 const [loading,setLoading]=useState(false);const [submitting,setSubmitting]=useState(false);const [error,setError]=useState('');
 const endRef=useRef<HTMLDivElement>(null);const selection=useRef(0);
 useEffect(()=>{void api<{authenticated:boolean,configured:boolean}>('/api/auth').then(x=>{setConfigured(x.configured);setAuth(x.authenticated?'ready':'login');}).catch(()=>setAuth('login'));},[]);
 useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('codex-web-theme',theme)},[theme]);
 useEffect(()=>{document.body.classList.toggle('drawer-active',sidebarOpen||rightOpen||Boolean(modal));return()=>document.body.classList.remove('drawer-active');},[sidebarOpen,rightOpen,modal]);
 const notify=useCallback((message:string)=>{setError(message);window.setTimeout(()=>setError(''),6000)},[]);
 const loadThreads=useCallback(async(projectId:string)=>{const result=await api<{threads:ThreadSummary[]}>(`/api/threads?projectId=${encodeURIComponent(projectId)}`);setThreads(result.threads);return result.threads},[]);
 const loadThread=useCallback(async(id:string)=>{const token=++selection.current;setLoading(true);
 try{const data=await api<{thread:Thread}>(`/api/threads/${id}`);const all=await Promise.all(data.thread.jobs.map(async j=>{let after=0;const gathered:EventRecord[]=[];for(let page=0;page<200;page++){const res=await api<{events:EventRecord[]}>(`/api/jobs/${j.id}/history?after=${after}`).catch(()=>({events:[]}));gathered.push(...res.events);if(res.events.length<1000)break;after=res.events[res.events.length-1].id;}return [j.id,gathered] as const;}));
 if(token===selection.current){setThread(data.thread);setEvents(Object.fromEntries(all));if(data.thread.codexThreadId){const nativeData=await api<{thread:NativeThread}>(`/api/native-threads/${data.thread.codexThreadId}`).catch(()=>null);setNative(nativeData?.thread||null);}else setNative(null);}}
 catch(e){if(token===selection.current)notify(String(e));}finally{if(token===selection.current)setLoading(false);}
 },[notify]);
 const loadProject=useCallback(async(p:Project,selectFirst=true)=>{selection.current++;setProject(p);setThread(null);setThreads([]);setEvents({});setSidebarOpen(false);
 try{const list=await loadThreads(p.id);if(selectFirst&&list[0])await loadThread(list[0].id);const inspect=await api<{files:FileNode[];status:string;diff:string}>(`/api/projects/${p.id}/inspect`).catch(()=>({files:[],status:'',diff:''}));setFiles(inspect.files);setGit({status:inspect.status,diff:inspect.diff});}catch(e){notify(String(e));}
 },[loadThreads,loadThread,notify]);
 const init=useCallback(async()=>{try{const [{projects:ps},health,status,nativeData]=await Promise.all([api<{projects:Project[]}>('/api/projects'),api<{connected:boolean;version:string}>('/api/health'),api<CodexStatus>('/api/codex/status').catch(()=>null),api<{threads:{id:string;title:string;updatedAt:string}[]}>('/api/native-threads').catch(()=>({threads:[]}))]);setProjects(ps);setConnected(health.connected);setVersion(health.version);setCodexStatus(status);setNativeThreads(nativeData.threads);
 if(ps.length){const saved=localStorage.getItem('codex-last-project');const selected=ps.find(p=>p.id===saved)||ps[0];await loadProject(selected);} }
 catch(e){notify(e instanceof Error?e.message:'無法連線至伺服器');}},[loadProject,notify]);
 useEffect(()=>{if(auth!=='ready')return;const timer=window.setTimeout(()=>{void init();},0);return()=>window.clearTimeout(timer);},[auth,init]);
 useEffect(()=>{if(project)localStorage.setItem('codex-last-project',project.id);},[project]);
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setSearch('');setModal('search');}if(e.key==='Escape'){setModal(null);setSidebarOpen(false);setRightOpen(false);}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[]);
 const activeJob=useMemo(()=>thread?.jobs.find(j=>j.status==='running'||j.status==='queued')||null,[thread]);
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
 useEffect(()=>endRef.current?.scrollIntoView({behavior:'smooth',block:'end'}),[thread?.jobs.length,events]);
 async function login(e:React.FormEvent){e.preventDefault();setLoginBusy(true);try{await post('/api/auth',{password});setPassword('');setAuth('ready');}catch(e){notify(e instanceof Error?e.message:'登入失敗');}finally{setLoginBusy(false);}}
 async function addProject(e:React.FormEvent){e.preventDefault();try{const result=await post('/api/projects',{name:projectName,path});const newP=result.project as Project;setProjects(s=>[newP,...s.filter(p=>p.id!==newP.id)]);setPath('');setProjectName('');setModal(null);await loadProject(newP,false);}catch(e){notify(e instanceof Error?e.message:'新增失敗');}}
 async function newThread(){if(!project){setModal('project');return;}try{const data=await post('/api/threads',{projectId:project.id});const t=data.thread as Thread;setThreads(x=>[{id:t.id,projectId:t.projectId,title:t.title,updatedAt:t.updatedAt,codexThreadId:null},...x]);setThread(t);setEvents({});setSidebarOpen(false);setPrompt('');}catch(e){notify(String(e));}}
 async function selectNative(codexThreadId:string){if(!project)return;try{const data=await post('/api/threads',{projectId:project.id,codexThreadId});const current=data.thread as Thread;await loadThreads(project.id);await loadThread(current.id);setSidebarOpen(false);}catch(e){notify(e instanceof Error?e.message:'無法開啟原生對話');}}
 async function submit(){const content=prompt.trim();if(!project||!content||submitting||activeJob)return;
 setSubmitting(true);try{
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
 const cliBadge=connected?<><CircleCheck size={14}/><span>{version||'Codex CLI 已連接'}</span></>:<><CircleAlert size={14}/><span>Codex CLI 未連接</span></>;
 if(auth==='checking')return <main className="auth-page"><div className="loading-box"><LoaderCircle size={26} className="spin"/>正在連線至伺服器…</div></main>;
 if(auth==='login')return <main className="auth-page"><form onSubmit={login} className="login-card"><div className="login-icon"><Bot size={30}/></div><h1>Codex WebUI</h1><p>登入你的 Ubuntu Codex 工作空間</p>{!configured&&<div className="setup-warning"><CircleAlert size={17}/>尚未設定網站密碼。請在 Ubuntu 設定 WEBUI_PASSWORD_HASH。</div>}
 <label htmlFor="password">登入密碼</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="輸入網站密碼"/><button className="primary-button" disabled={loginBusy||!configured}>{loginBusy?<LoaderCircle size={16} className="spin"/>:<LockKeyhole size={16}/>}登入</button><span className="login-hint"><ShieldCheck size={14}/> 僅供私人 VPN 網路存取</span></form>{error&&<div role="alert" className="toast">{error}</div>}</main>;
 return <div className="app">
 <header className="topbar"><button className="icon-btn hamburger" type="button" title="開啟選單" onClick={()=>setSidebarOpen(true)}><PanelLeft size={19}/></button>
 <div className="brand"><span>Codex</span></div>
 <button className="top-search" type="button" onClick={()=>{setSearch('');setModal('search');}}><Search size={16}/><span>搜尋對話...</span><span className="keycap">⌘ K</span></button>
 <div className="top-actions"><span className={`connected-label ${connected?'connected':'disconnected'}`}><span className="dot"/>{connected?'Codex 已連接':'Codex 離線'}</span><button className="icon-btn" title="切換主題" onClick={()=>setTheme(x=>x==='dark'?'light':'dark')}>{theme==='dark'?<Sun size={19}/>:<Moon size={19}/>}</button><button className="icon-btn" title="設定" onClick={()=>setModal('settings')}><Settings2 size={19}/></button></div>
 </header>
 <div className="body">
 <aside className={`sidebar ${sidebarOpen?'open':''}`}>
  <button className="new-btn" onClick={()=>void newThread()}><Plus size={18}/>新增對話</button>
  <nav className="side-nav"><button className="nav-item active" onClick={()=>setSidebarOpen(false)}><Command size={17}/>工作區</button><button className="nav-item" onClick={()=>setModal('settings')}><Settings2 size={17}/>設定</button></nav>
  <div className="workspace-path"><FolderGit2 size={15}/><span>{project?.path||'正在載入工作區…'}</span></div>
  <div className="sidebar-conversations"><div className="section"><div className="section-heading"><span>對話</span><span>{threads.length}</span></div>
   {nativeThreads.map(t=><button className={`thread ${thread?.codexThreadId===t.id?'selected':''}`} key={t.id} onClick={()=>void selectNative(t.id)}><Code2 size={16}/><span className="thread-label">{t.title}</span></button>)}
   {!threads.length&&<div className="empty-side">尚無對話紀錄</div>}
  </div>
  </div><div className="sidebar-footer"><span className={`status-dot ${connected?'ok':''}`}/><strong>Codex</strong><span>{connected?'已連接':'無法連接'}</span><span className="version">LOCAL</span></div>
 </aside>
 <div className={`scrim ${sidebarOpen?'active':''}`} onClick={()=>setSidebarOpen(false)}/>
 <main className="main">
  <div className="session-head"><div className="session-heading-group"><div className="session-title"><span>{thread?.title||'新增對話'}</span></div><div className="session-subtitle">{project?.path||'固定工作區'}</div></div>
   <div className="session-actions"><span className="project-branch"><GitBranch size={13}/> workspace</span><button type="button" className="outline-btn" onClick={()=>setRightOpen(x=>!x)}><PanelRight size={15}/><span className="hide-small">檔案</span></button><button type="button" className="outline-btn" onClick={()=>setModal('settings')}><SlidersHorizontal size={15}/><span className="hide-small">設定</span></button></div>
  </div>
  <div className="chat-scroll"><div className="chat-content">
  {!project?<div className="welcome-screen"><div className="welcome-icon"><Bot size={31}/></div><h1>正在連接固定工作區</h1><p>確認 DEFAULT_PROJECT_PATH 指向這個 Codex 工作區即可開始使用。</p></div>:
   thread?<>{native?<><div className="native-messages">{native.items.map(item=><div className={`native-message ${item.role}`} key={item.id}><strong>{item.role==='user'?'你':'Codex'}</strong><p>{item.text}</p></div>)}</div>{native.usage&&<div className="token-usage">本對話累計 · 輸入 {native.usage.input_tokens||0} · 輸出 {native.usage.output_tokens||0} · 總計 {native.usage.total_tokens||0} tokens</div>}</>:null}{thread.jobs.length>0&&<MessageStream jobs={thread.jobs} events={events} onApproval={approve}/>}<div ref={endRef}/></>:<div className="empty-chat"><div className="empty-mark"><Bot size={32}/></div><h2>從一個指令開始</h2><p>Codex 將在 <strong>{project.name}</strong> 專案目錄中工作。</p><div className="example-prompts"><span onClick={()=>setPrompt('檢查專案架構並提出改善建議')}>檢查專案架構</span><span onClick={()=>setPrompt('執行現有測試並整理問題')}>執行測試</span><span onClick={()=>setPrompt('閱讀 README 並說明專案如何運作')}>瞭解專案</span></div></div>}
   </div></div>
  <div className="composer-wrap"><form className="composer" onSubmit={e=>{e.preventDefault();void (activeJob?stop():submit());}}>
   <label htmlFor="prompt" className="screen-reader-only">傳送訊息給 Codex</label>
   <textarea id="prompt" placeholder={project?'向 Codex 傳送訊息...':'請先新增或選擇專案'} value={prompt} onChange={e=>setPrompt(e.target.value)} disabled={!project||Boolean(activeJob)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void (activeJob?stop():submit());}}} rows={3}/>
   <div className="composer-actions"><span className="composer-small-label"><TerminalSquare size={16}/> 本機</span><button type="button" className="chip" onClick={()=>setModal('model')}>{model||'模型'} <ChevronDown size={13}/></button><button type="button" className="chip" onClick={()=>setModal('effort')}>{effort||'推理'} <ChevronDown size={13}/></button><button type="button" className="chip" onClick={()=>setModal('sandbox')}>{sandbox==='workspace-write'?'工作區寫入':'唯讀'}<ChevronDown size={13}/></button><span className="composer-spacer"/><button type="submit" className={`send-btn ${activeJob?'stop':''}`} disabled={!activeJob&&(!prompt.trim()||!project||submitting)} title={activeJob?'停止':'傳送'}>{activeJob?<Square size={17} fill="currentColor"/>:submitting?<LoaderCircle size={17} className="spin"/>:<Send size={18}/>}</button></div>
   </form><div className="footer-note">{loading?'正在載入對話…':activeJob?'工作正在 Ubuntu 持續執行；離開網頁不會停止它。':'本機 Codex App Server · 固定工作區'}</div></div>
 </main>
 {rightOpen&&<aside className="right open" id="right-panel"><div className="right-tabs"><button className={`right-tab ${rightTab==='files'?'active':''}`} onClick={()=>setRightTab('files')}><FolderClosed size={15}/>檔案</button><button className={`right-tab ${rightTab==='changes'?'active':''}`} onClick={()=>setRightTab('changes')}><GitBranch size={15}/>變更</button><button className={`right-tab ${rightTab==='output'?'active':''}`} onClick={()=>setRightTab('output')}><TerminalSquare size={15}/>輸出</button><button className="icon-btn right-close" onClick={()=>setRightOpen(false)} aria-label="關閉側欄"><X size={17}/></button></div><div className="right-body">
 {rightTab==='files'?<><div className="right-h2"><span><FolderGit2 size={15}/> {project?.name||'專案檔案'}</span><button className="tiny-btn" aria-label="重新整理檔案" onClick={()=>{if(project)void api<{files:FileNode[],status:string,diff:string}>(`/api/projects/${project.id}/inspect`).then(x=>{setFiles(x.files);setGit({status:x.status,diff:x.diff})})}}><RefreshCw size={14}/></button></div><FileList files={files}/>{!files.length&&<p className="empty-side">沒有可顯示的檔案</p>}</>:
 rightTab==='changes'?<><div className="right-h2">Git 工作目錄變更</div><pre className="git-output">{git.status||'工作目錄乾淨，或目前未選取專案。'}</pre><div className="right-h2">變更摘要</div><pre className="git-output">{git.diff||'沒有未提交的差異摘要。'}</pre></>:
 <><div className="right-h2">目前對話的事件輸出</div><pre className="git-output terminal-output">{thread?.jobs.flatMap(j=>(events[j.id]||[]).filter(e=>['item.completed','webui.error','turn.failed'].includes(e.type)).map(e=>JSON.stringify(e.payload,null,2))).slice(-12).join('\n\n')||'尚無 Codex 執行事件。'}</pre></>}
 </div><div className="right-bottom"><span className="circle"/>僅顯示 Ubuntu 已授權專案中的資訊</div></aside>}
 </div>
 {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><div className="modal" role="dialog" aria-modal="true" aria-label="視窗"><header className="modal-title"><h2>{modal==='settings'?'偏好設定':modal==='project'?'新增專案':modal==='model'?'選擇模型':modal==='effort'?'推理強度':modal==='sandbox'?'執行權限':'搜尋專案與對話'}</h2><button className="icon-btn" onClick={()=>setModal(null)} aria-label="關閉"><X size={20}/></button></header>
 {modal==='model'||modal==='effort'||modal==='sandbox'?<div className="quick-options">{(modal==='model'?[{value:'',label:`預設 · ${codexStatus?.defaultModel||'Codex CLI'}`},...(codexStatus?.models||[]).map(m=>({value:m.id,label:m.name}))]:modal==='effort'?[{value:'',label:'預設推理'},...['low','medium','high','xhigh','max','ultra'].map(v=>({value:v,label:v}))]:[{value:'workspace-write',label:'可修改工作區 · workspace-write'},{value:'read-only',label:'唯讀 · read-only'}]).map(option=><button key={option.value} className="quick-option" onClick={()=>{if(modal==='model')setModel(option.value);else if(modal==='effort')setEffort(option.value);else setSandbox(option.value);setModal(null);}}><span>{option.label}</span><span>{(modal==='model'?model:modal==='effort'?effort:sandbox)===option.value?'✓':''}</span></button>)}</div>:modal==='settings'?<div className="settings-content"><div className="settings-section-label">執行設定</div>
 <label className="form-field"><span className="form-label">模型</span><select className="select" value={model} onChange={e=>setModel(e.target.value)}><option value="">預設 · {codexStatus?.defaultModel||'Codex CLI'}</option>{codexStatus?.models.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
 <label className="form-field"><span className="form-label">推理強度</span><select className="select" value={effort} onChange={e=>setEffort(e.target.value)}><option value="">預設</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="xhigh">Extra High</option><option value="max">Max</option><option value="ultra">Ultra</option></select></label>
 <label className="form-field"><span className="form-label">Sandbox 權限</span><select className="select" value={sandbox} onChange={e=>setSandbox(e.target.value)}><option value="workspace-write">workspace-write · 可修改專案</option><option value="read-only">read-only · 唯讀</option></select></label>
 <div className="settings-section-label">剩餘額度</div><div className="usage-list">{codexStatus?.usageWindows.length?codexStatus.usageWindows.map(window=><div className="usage-row" key={window.label}><span>{window.label}</span><strong>{window.remainingPercent}%</strong></div>):<p className="form-help">目前 Codex CLI 未提供可顯示的額度資料。</p>}</div><div className="settings-section-label">網站外觀</div><label className="form-field"><span className="form-label">主題</span><select className="select" value={theme} onChange={e=>setTheme(e.target.value)}><option value="dark">深色</option><option value="light">淺色</option></select></label>
 <div className="settings-section-label">伺服器</div><div className="settings-health">{cliBadge}<button className="outline-btn" onClick={()=>void api<{connected:boolean;version:string}>('/api/health').then(h=>{setConnected(h.connected);setVersion(h.version)})}><RefreshCw size={14}/>重新檢查</button></div><p className="form-help">此頁使用 Ubuntu 本機既有的 Codex 登入狀態；不會要求或儲存網站密碼。</p></div>:
 modal==='project'?<form onSubmit={e=>void addProject(e)} className="settings-content"><p className="form-help">只能加入位於伺服器 ALLOWED_PROJECT_ROOTS 下，且已初始化 Git 的資料夾。</p><label className="form-field"><span className="form-label">絕對路徑</span><input className="select" placeholder="/home/allen/projects/my-project" value={path} required onChange={e=>setPath(e.target.value)}/></label><label className="form-field"><span className="form-label">顯示名稱（可留空）</span><input className="select" placeholder="我的專案" value={projectName} onChange={e=>setProjectName(e.target.value)}/></label><button className="primary-button" type="submit"><Plus size={16}/>加入專案</button></form>:
 <div className="search-pane"><label className="search-input"><Search size={19}/><input autoFocus placeholder="搜尋..." value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="search-results">{filtered.map(x=><button className="search-result" key={x.type+x.id} onClick={()=>{setModal(null);if(x.type==='project'){const p=projects.find(p=>p.id===x.id);if(p)void loadProject(p);}else void selectThread(x.id)}}><Search size={16}/><span><strong>{x.text}</strong><small>{x.sub}</small></span></button>)}{filtered.length===0&&<p className="empty-side">找不到結果</p>}</div></div>}
 </div></div>}
 {error&&<div className="toast" role="alert"><CircleAlert size={17}/>{error}<button onClick={()=>setError('')}><X size={14}/></button></div>}
 </div>
}
