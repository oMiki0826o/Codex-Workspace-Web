import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { StringDecoder } from 'node:string_decoder';

export class AppServerClient extends EventEmitter {
 #bin; #child=null; #nextId=1; #pending=new Map(); #decoder=new StringDecoder('utf8'); #buffer='';
 constructor(bin=process.env.CODEX_BIN||'codex'){super();this.#bin=bin;}
 get connected(){return Boolean(this.#child&&!this.#child.killed);}
 async connect(){
  if(this.connected)return;
  const child=spawn(this.#bin,['app-server','--listen','stdio://'],{shell:false,stdio:['pipe','pipe','pipe'],env:process.env});
  this.#child=child;
  child.stdout.on('data',data=>this.#push(data));
  child.stderr.on('data',data=>this.emit('stderr',data.toString('utf8')));
  child.on('exit',(code,signal)=>{this.#child=null;for(const {reject} of this.#pending.values())reject(new Error(`Codex App Server ended (${code??signal??'unknown'})`));this.#pending.clear();this.emit('exit',{code,signal});});
  await this.request('initialize',{clientInfo:{name:'codex-local-pwa',version:'1.0.0'},capabilities:{experimentalApi:false}});
  this.notify('initialized',{});
 }
 async request(method,params){
  await this.connect();const id=this.#nextId++;const payload=JSON.stringify({jsonrpc:'2.0',id,method,params});
  return await new Promise((resolve,reject)=>{this.#pending.set(id,{resolve,reject});this.#child.stdin.write(`${payload}\n`,error=>{if(error){this.#pending.delete(id);reject(error);}});});
 }
 async notify(method,params){if(!this.connected)return;const payload=JSON.stringify({jsonrpc:'2.0',method,params});await new Promise((resolve,reject)=>this.#child.stdin.write(`${payload}\n`,error=>error?reject(error):resolve()));}
 async startThread({cwd,model='',sandbox='workspace-write'}){return this.request('thread/start',{cwd,model:model||null,sandbox});}
 async listModels(){return this.request('model/list',{});}
 async readRateLimits(){return this.request('account/rateLimits/read',{});}
 async listModels(){return this.request('model/list',{});}
 async readRateLimits(){return this.request('account/rateLimits/read',{});}
 async resumeThread(threadId){return this.request('thread/resume',{threadId});}
 async unsubscribeThread(threadId){return this.request('thread/unsubscribe',{threadId});}
 async startTurn({threadId,prompt,model='',effort=''}){return this.request('turn/start',{threadId,input:[{type:'text',text:prompt}],model:model||null,effort:effort||null});}
 async interruptTurn(threadId,turnId){return this.request('turn/interrupt',{threadId,turnId});}
 async respond(id,result){
  if(!this.connected)throw new Error('Codex App Server 未連接');
  const payload=JSON.stringify({jsonrpc:'2.0',id,result});
  return await new Promise((resolve,reject)=>this.#child.stdin.write(`${payload}\n`,error=>error?reject(error):resolve()));
 }
 close(){this.#child?.kill('SIGTERM');}
 #push(bytes){this.#buffer+=this.#decoder.write(bytes);let index;while((index=this.#buffer.indexOf('\n'))>=0){const line=this.#buffer.slice(0,index);this.#buffer=this.#buffer.slice(index+1);if(!line.trim())continue;try{const message=JSON.parse(line);if('id' in message&&this.#pending.has(message.id)){const pending=this.#pending.get(message.id);this.#pending.delete(message.id);if(message.error)pending.reject(new Error(message.error.message||'App Server request failed'));else pending.resolve(message.result);}else if('id' in message&&message.method)this.emit('request',message);else this.emit('notification',message);}catch{this.emit('protocolError',line);}}}
}
const key=Symbol.for('codex-webui.appServerClient');
export function getAppServerClient(){if(!globalThis[key])globalThis[key]=new AppServerClient();return globalThis[key];}
