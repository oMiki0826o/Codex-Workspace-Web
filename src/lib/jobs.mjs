import { spawn } from 'node:child_process';
import { buildCodexArgs, JsonlDecoder } from './codex.mjs';
import { AppServerClient } from './app-server-client.mjs';

export class JobManager {
  #store;
  #bin;
  #running=new Map();
  constructor(store,bin='codex'){this.#store=store;this.#bin=bin;}
  async start(jobId,{dir,sandbox='workspace-write',model='',effort=''}){
    const job=this.#store.getJob(jobId);if(!job)throw new Error('找不到工作');
    if(job.status!=='queued')throw new Error('工作並非等待狀態');
    const thread=this.#store.getThread(job.threadId);
    const args=buildCodexArgs({dir,sandbox,model,effort,sessionId:thread.codexThreadId});
    let child;
    try{child=spawn(this.#bin,args,{cwd:dir,detached:process.platform!=='win32',shell:false,stdio:['pipe','pipe','pipe'],env:process.env});}
    catch(error){this.#store.event(jobId,'webui.error',{type:'webui.error',message:String(error)});this.#store.finishJob(jobId,'failed',1);return;}
    this.#store.setJobRunning(jobId,child.pid??null);
    this.#running.set(jobId,{child,cancelled:false});
    let sawCompleted=false;let sawFailed=false;let lastError='';let seen=0;
    const persist=(event)=>{
      if(event.type==='thread.started'&&event.thread_id&&!thread.codexThreadId)this.#store.setCodexThread(job.threadId,event.thread_id);
      if(event.type==='turn.completed')sawCompleted=true;
      if(event.type==='turn.failed'||event.type==='error')sawFailed=true;
      if(seen++<5000 || ['turn.completed','turn.failed','error','thread.started'].includes(event.type))this.#store.event(jobId,event.type||'unknown',event);
      else if(seen===5001)this.#store.event(jobId,'webui.warning',{type:'webui.warning',message:'事件數量達上限，已停止儲存部分中間事件'});
    };
    const parser=new JsonlDecoder(persist);
    child.stdout.on('data',data=>parser.push(data));
    child.stderr.on('data',data=>{
      lastError=(lastError+data.toString('utf8')).slice(-2000);
    });
    child.stdin.on('error',()=>{});
    child.stdin.end(job.prompt);
    return await new Promise(resolve=>{
      let settled=false;
      const finish=(status,code,error)=>{
        if(settled)return;settled=true;
        parser.flush();
        if(error)persist({type:'webui.error',message:error.slice(0,1800)});
        this.#store.finishJob(jobId,status,code);
        persist({type:'webui.finished',status,exitCode:code});
        this.#running.delete(jobId);resolve();
      };
      child.on('error',e=>finish('failed',1,e.message));
      child.on('close',code=>{
        const interrupted=this.#running.get(jobId)?.cancelled;
        finish(interrupted?'cancelled':(code===0&&sawCompleted&&!sawFailed?'completed':'failed'),code,
          !interrupted&&(code!==0||sawFailed||!sawCompleted)?lastError||'Codex 未完成任務，請查看 CLI 狀態與 stderr。':'');
      });
    });
  }
  cancel(id){const run=this.#running.get(id);if(!run)return false;run.cancelled=true;
    const signal=(sig)=>{try{if(process.platform==='win32')run.child.kill(sig);else process.kill(-run.child.pid,sig);}catch{try{run.child.kill(sig);}catch{}}};
    signal('SIGINT');const grace=setTimeout(()=>{if(this.#running.has(id))signal('SIGTERM');},3500);
    const hard=setTimeout(()=>{if(this.#running.has(id))signal('SIGKILL');},7000);
    grace.unref();hard.unref();return true;
  }
}

const itemType=(type='')=>String(type).replace(/[A-Z]/g,letter=>`_${letter.toLowerCase()}`);
const normalizeItem=item=>({
  ...item,
  type:itemType(item?.type),
  aggregated_output:item?.aggregated_output||item?.aggregatedOutput||item?.output||'',
  text:item?.text||''
});
/**
 * Keeps the web UI's durable job/event model while using Codex's supported
 * App Server protocol.  The separate CLI JobManager above is deliberately
 * retained for its focused process-lifecycle tests and as an implementation
 * reference; production requests use this manager.
 */
export class AppServerJobManager {
  #store;
  #clientFactory;
  #clients=new Map();
  #running=new Map();
  #starting=new Map();
  #pendingApprovals=new Map();
  constructor(store,clientOrFactory){
    this.#store=store;
    this.#clientFactory=typeof clientOrFactory==='function'?clientOrFactory:bin=>clientOrFactory||new AppServerClient(bin);
  }
  async start(jobId,{dir,sandbox='workspace-write',model='',effort='',route='cloud',bin=undefined}){
    const job=this.#store.getJob(jobId);if(!job)throw new Error('找不到工作');
    if(job.status!=='queued')throw new Error('工作並非等待狀態');
    const thread=this.#store.getThread(job.threadId);if(!thread)throw new Error('找不到對話');
    const client=this.#clientFactory(bin);this.#clients.set(jobId,client);
    let released=false;
    const releaseClient=()=>{if(released)return;released=true;this.#clients.delete(jobId);if(typeof client.close==='function')client.close();};
    const starting={cancelled:false};this.#starting.set(jobId,starting);
    const finishBeforeTurn=()=>{
      if(!starting.cancelled)return false;
      this.#store.finishJob(jobId,'cancelled');
      this.#store.event(jobId,'webui.finished',{type:'webui.finished',status:'cancelled',exitCode:null});
      this.#starting.delete(jobId);releaseClient();return true;
    };
    const startup=async action=>{try{return await action();}catch(error){this.#starting.delete(jobId);releaseClient();throw error;}};
    await startup(()=>client.connect());
    if(finishBeforeTurn())return;
    let nativeThreadId=thread.codexThreadId;
    if(nativeThreadId){
      if(!thread.modelRoute)this.#store.setModelRoute(thread.id,route);
      await startup(()=>client.resumeThread(nativeThreadId,{cwd:dir,sandbox}));
    }
    else {
      const started=await startup(()=>client.startThread({cwd:dir,sandbox,model}));
      nativeThreadId=started.thread?.id;
      if(!nativeThreadId)throw new Error('Codex App Server 沒有回傳對話識別碼');
      this.#store.setCodexThread(thread.id,nativeThreadId,route);
      this.#store.event(jobId,'thread.started',{type:'thread.started',thread_id:nativeThreadId});
    }
    if(finishBeforeTurn())return;
    let settled=false;let turnId='';let onNotification;let onRequest;let onExit;
    const proposedFileChanges=new Map();
    const finish=(status,code=0,message='')=>{
      if(settled)return;settled=true;
      if(message)this.#store.event(jobId,'webui.error',{type:'webui.error',message});
      this.#store.finishJob(jobId,status,code);
      this.#store.event(jobId,'webui.finished',{type:'webui.finished',status,exitCode:code});
      client.off('notification',onNotification);
      client.off('request',onRequest);
      client.off('exit',onExit);
      this.#running.delete(jobId);
      this.#pendingApprovals.delete(jobId);
      this.#starting.delete(jobId);
      if(nativeThreadId&&typeof client.unsubscribeThread==='function')client.unsubscribeThread(nativeThreadId).catch(error=>this.#store.event(jobId,'webui.warning',{type:'webui.warning',message:`無法釋放原生對話：${error instanceof Error?error.message:String(error)}`})).finally(releaseClient);
      else releaseClient();
    };
    onNotification=message=>{
      const params=message?.params||{};
      // Some valid turn events omit threadId. Bind them by the active turn id
      // of this one-job App Server client, but never process another thread.
      if(params.threadId&&params.threadId!==nativeThreadId)return;
      if(!params.threadId&&params.turnId&&turnId&&params.turnId!==turnId)return;
      const eventType=message.method||'appserver.notification';
      if(eventType==='item/started'||eventType==='item/updated'||eventType==='item/completed'){
        const phase=eventType.split('/')[1];
        if(params.item?.type==='fileChange'||params.item?.type==='file_change'){
          if(params.item.id)proposedFileChanges.set(params.item.id,params.item.changes||null);
        }
        this.#store.event(jobId,`item.${phase}`,{type:`item.${phase}`,item:normalizeItem(params.item||{})});
        return;
      }
      if(eventType==='item/agentMessage/delta'){
        this.#store.event(jobId,'item.delta',{type:'item.delta',itemId:params.itemId,turnId:params.turnId,delta:params.delta||''});return;
      }
      if(eventType==='item/commandExecution/outputDelta'){
        this.#store.event(jobId,'item.output',{type:'item.output',itemId:params.itemId,turnId:params.turnId,delta:params.delta||''});return;
      }
      if(eventType==='turn/plan/updated'){
        this.#store.event(jobId,'turn.plan',{type:'turn.plan',turnId:params.turnId||turnId,plan:params.plan||[]});return;
      }
      if(eventType==='turn/diff/updated'){
        this.#store.event(jobId,'turn.diff',{type:'turn.diff',turnId:params.turnId||turnId,diff:params.diff||''});return;
      }
      if(eventType==='thread/tokenUsage/updated'){
        this.#store.event(jobId,'turn.usage',{type:'turn.usage',turnId:params.turnId||turnId,usage:params.tokenUsage||params.usage||{}});return;
      }
      if(eventType==='serverRequest/resolved'){
        const requestId=String(params.requestId??params.id??'');
        this.#pendingApprovals.get(jobId)?.delete(requestId);
        this.#store.event(jobId,'approval.resolved',{type:'approval.resolved',requestId,external:true});return;
      }
      if(eventType==='turn/completed'&&params.turn?.id===turnId){
        for(const item of params.turn.items||[])this.#store.event(jobId,'item.completed',{type:'item.completed',item:normalizeItem(item)});
        finish(params.turn.status==='completed'?'completed':params.turn.status==='interrupted'?'cancelled':'failed',params.turn.status==='completed'?0:1);
        return;
      }
      if(eventType==='turn/failed'&&params.turnId===turnId)finish('failed',1,params.error?.message||'Codex 無法完成此任務');
      else if(eventType==='turn/status/changed'&&params.turn?.id===turnId&&params.turn.status==='failed')finish('failed',1,'Codex 無法完成此任務');
      else this.#store.event(jobId,`appserver.${eventType.replaceAll('/','.')}`,{type:`appserver.${eventType.replaceAll('/','.')}`,...params});
    };
    onRequest=message=>{
      const params=message?.params||{};
      if(params.threadId!==nativeThreadId)return;
      if(!['item/commandExecution/requestApproval','item/fileChange/requestApproval','item/permissions/requestApproval'].includes(message.method)){
        this.#store.event(jobId,'webui.warning',{type:'webui.warning',message:`Codex 要求尚未支援的互動：${message.method}。不會自動批准。`});return;
      }
      const requestId=String(message.id);let approvals=this.#pendingApprovals.get(jobId);if(!approvals){approvals=new Map();this.#pendingApprovals.set(jobId,approvals);}approvals.set(requestId,message);
      this.#store.event(jobId,'approval.request',{type:'approval.request',requestId,method:message.method,itemId:params.itemId,command:params.command||'',reason:params.reason||'',cwd:params.cwd||'',kind:message.method,changes:params.changes||params.fileChanges||proposedFileChanges.get(params.itemId)||null,permissions:params.permissions||null,networkApprovalContext:params.networkApprovalContext||null,availableDecisions:params.availableDecisions||null});
    };
    onExit=()=>{if(this.#running.has(jobId))finish('interrupted',1,'Codex App Server 已停止，工作已中斷');};
    client.on('notification',onNotification);
    client.on('request',onRequest);
    client.on('exit',onExit);
    try {
      const turn=await client.startTurn({threadId:nativeThreadId,prompt:job.prompt,model,effort,sandbox});
      turnId=turn.turn?.id||turn.id||'';
      if(!turnId)throw new Error('Codex App Server 沒有回傳回合識別碼');
      this.#store.setJobRunning(jobId,null);
      this.#starting.delete(jobId);
      this.#running.set(jobId,{threadId:nativeThreadId,turnId,cancelled:false,finish});
      if(starting.cancelled){await client.interruptTurn(nativeThreadId,turnId);finish('cancelled');return;}
      this.#store.event(jobId,'turn.started',{type:'turn.started',thread_id:nativeThreadId,turn_id:turnId});
    }catch(error){
      finish('failed',1,error instanceof Error?error.message:String(error));
      throw error;
    }
  }
  async steer(jobId,prompt){
    const run=this.#running.get(jobId),client=this.#clients.get(jobId);
    if(!run||!client||run.cancelled)throw new Error('目前沒有執行中的 Codex 回合');
    if(typeof client.steerTurn!=='function')throw new Error('此 Codex 版本尚未提供追加指示');
    await client.steerTurn(run.threadId,run.turnId,[{type:'text',text:prompt}]);
    this.#store.event(jobId,'turn.steered',{type:'turn.steered',turnId:run.turnId,prompt});
  }
  cancel(jobId){
    const starting=this.#starting.get(jobId);if(starting){starting.cancelled=true;return true;}
    const run=this.#running.get(jobId);if(!run)return false;
    run.cancelled=true;
    const client=this.#clients.get(jobId);if(!client)return false;
    client.interruptTurn(run.threadId,run.turnId).catch(error=>run.finish('failed',1,error instanceof Error?error.message:String(error)));
    return true;
  }
  async approve(jobId,requestId,decision){
    if(!['accept','acceptForSession','decline','cancel'].includes(decision))throw new Error('無效的批准選項');
    const request=this.#pendingApprovals.get(jobId)?.get(requestId);if(!request)throw new Error('批准請求已失效，請重新整理對話');
    const client=this.#clients.get(jobId);if(!client)throw new Error('Codex 連線已關閉，請重新整理對話');
    const response=request.method==='item/permissions/requestApproval'
      ?{scope:decision==='acceptForSession'?'session':'turn',permissions:decision==='accept'||decision==='acceptForSession'?(request.params?.permissions||{}):{}}
      :{decision};
    await client.respond(request.id,response);
    this.#pendingApprovals.get(jobId)?.delete(requestId);
    this.#store.event(jobId,'approval.resolved',{type:'approval.resolved',requestId,decision});
  }
}
const k=Symbol.for('codex-webui.appServerJobManager');
export function getJobManager(store){if(!globalThis[k])globalThis[k]=new AppServerJobManager(store);return globalThis[k];}
