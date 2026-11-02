import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { StringDecoder } from 'node:string_decoder';

export class AppServerClient extends EventEmitter {
 #bin; #child=null; #nextId=1; #pending=new Map(); #decoder=new StringDecoder('utf8'); #buffer=''; #connecting=null;
 constructor(bin=process.env.CODEX_BIN||'codex'){super();this.#bin=bin;}
 get connected(){return Boolean(this.#child&&!this.#child.killed);}
 async connect(){
  if(this.#connecting)return this.#connecting;
  this.#connecting=this.#initialize();
  try{await this.#connecting;}finally{this.#connecting=null;}
 }
 async #initialize(){
  if(this.connected)return;
  const child=spawn(this.#bin,['app-server','--listen','stdio://'],{shell:false,stdio:['pipe','pipe','pipe'],env:process.env});
  this.#child=child;
  child.stdout.on('data',data=>this.#push(data));
  child.stderr.on('data',data=>this.emit('stderr',data.toString('utf8')));
  let terminated=false;
  const terminate=(reason,code=null,signal=null)=>{
   if(terminated)return;terminated=true;
   this.#child=null;
   for(const {reject} of this.#pending.values())reject(new Error(`Codex App Server ended (${reason})`));
   this.#pending.clear();
   this.emit('exit',{code,signal});
  };
  child.on('error',error=>{this.emit('stderr',`Codex App Server spawn failed: ${error.message}`);terminate(error.message);});
  child.on('exit',(code,signal)=>terminate(String(code??signal??'unknown'),code,signal));
  await this.#requestRaw('initialize',{clientInfo:{name:'codex-local-pwa',version:'1.0.0'},capabilities:{experimentalApi:false}});
  await this.notify('initialized',{});
 }
 async request(method,params){
  await this.connect();return this.#requestRaw(method,params);
 }
 async #requestRaw(method,params){
  if(!this.#child)throw new Error('Codex App Server 尚未啟動');const id=this.#nextId++;const payload=JSON.stringify({jsonrpc:'2.0',id,method,params});
  return await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.#pending.delete(id);reject(new Error(`Codex App Server RPC timeout: ${method}`));},30000);timer.unref?.();this.#pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});this.#child.stdin.write(`${payload}\n`,error=>{if(error){const pending=this.#pending.get(id);this.#pending.delete(id);if(pending)pending.reject(error);}});});
 }
 async notify(method,params){if(!this.connected)return;const payload=JSON.stringify({jsonrpc:'2.0',method,params});await new Promise((resolve,reject)=>this.#child.stdin.write(`${payload}\n`,error=>error?reject(error):resolve()));}
 async startThread({cwd,model='',sandbox='workspace-write'}){return this.request('thread/start',{cwd,model:model||null,sandbox});}
 async listModels(){return this.request('model/list',{});}
 async readRateLimits(){return this.request('account/rateLimits/read',{});}
 async resumeThread(threadId,{cwd,sandbox}={}){return this.request('thread/resume',{threadId,...(cwd?{cwd}:{}),...(sandbox?{sandbox}:{})});}
 async unsubscribeThread(threadId){return this.request('thread/unsubscribe',{threadId});}
 async startTurn({threadId,prompt,model='',effort='',sandbox='workspace-write'}){return this.request('turn/start',{threadId,input:[{type:'text',text:prompt}],model:model||null,effort:effort||null,sandboxPolicy:{type:sandbox==='read-only'?'readOnly':'workspaceWrite',...(sandbox==='read-only'?{}:{writableRoots:[],networkAccess:false,excludeTmpdirEnvVar:false,excludeSlashTmp:false})}});}
 async interruptTurn(threadId,turnId){return this.request('turn/interrupt',{threadId,turnId});}
 async listThreads(params={}){return this.request('thread/list',params);}
 async readThread(threadId,options={}){return this.request('thread/read',{threadId,...options});}
 async listTurns(threadId,params={}){return this.request('thread/turns/list',{threadId,...params});}
 async listItems(threadId,params={}){return this.request('thread/items/list',{threadId,...params});}
 async listSkills(cwds=[]){return this.request('skills/list',{cwds,forceReload:false});}
 async listMcpServers(cursor=null){return this.request('mcpServerStatus/list',{detail:'toolsAndAuthOnly',limit:100,...(cursor?{cursor}:{})});}
 async steerTurn(threadId,expectedTurnId,input){return this.request('turn/steer',{threadId,expectedTurnId,input});}
 async archiveThread(threadId){return this.request('thread/archive',{threadId});}
 async respond(id,result){
  if(!this.connected)throw new Error('Codex App Server 未連接');
  const payload=JSON.stringify({jsonrpc:'2.0',id,result});
  return await new Promise((resolve,reject)=>this.#child.stdin.write(`${payload}\n`,error=>error?reject(error):resolve()));
 }
 close(){this.#child?.kill('SIGTERM');}
 #push(bytes){this.#buffer+=this.#decoder.write(bytes);if(this.#buffer.length>4*1024*1024){this.#buffer='';this.emit('protocolError','App Server message exceeded 4 MiB');return;}let index;while((index=this.#buffer.indexOf('\n'))>=0){const line=this.#buffer.slice(0,index);this.#buffer=this.#buffer.slice(index+1);if(!line.trim())continue;try{const message=JSON.parse(line);if('id' in message&&this.#pending.has(message.id)){const pending=this.#pending.get(message.id);this.#pending.delete(message.id);if(message.error)pending.reject(new Error(message.error.message||'App Server request failed'));else pending.resolve(message.result);}else if('id' in message&&message.method)this.emit('request',message);else this.emit('notification',message);}catch{this.emit('protocolError',line);}}}
}
const key=Symbol.for('codex-webui.appServerClient');
export function getAppServerClient(){if(!globalThis[key])globalThis[key]=new AppServerClient();return globalThis[key];}
