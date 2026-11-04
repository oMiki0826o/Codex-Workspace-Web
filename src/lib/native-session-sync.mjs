import { watch, existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { listWorkspaceSessions, readNativeSession } from './native-sessions.mjs';

export class NativeSessionSync extends EventEmitter {
 #workspace;#sessionsDir;#watcher=null;#poller=null;#debounce=null;#sessions=null;#snapshot=new Map();#watch;
 constructor({workspace,sessionsDir=process.env.CODEX_SESSIONS_DIR||join(homedir(),'.codex','sessions'),watcher=watch,pollMs=Number(process.env.CODEX_NATIVE_FALLBACK_POLL_MS||30000)}){super();this.#workspace=workspace;this.#sessionsDir=sessionsDir;this.#watch=watcher;this.pollMs=Number.isFinite(pollMs)&&pollMs>0?pollMs:30000;}
 list(){if(!this.#sessions)this.#sessions=listWorkspaceSessions({workspace:this.#workspace,sessionsDir:this.#sessionsDir});this.#snapshot=this.#fingerprint();return this.#sessions;}
 read(id){return readNativeSession({sessionId:id,workspace:this.#workspace,sessionsDir:this.#sessionsDir,session:this.list().find(session=>session.id===id)});}
 start(){if(this.#watcher||this.#poller)return;this.#snapshot=this.#fingerprint();try{this.#watcher=this.#watch(this.#sessionsDir,{recursive:true},()=>this.#schedule());}catch{}this.#poller=setInterval(()=>this.#changed(),this.pollMs);this.#poller.unref();}
 stop(){this.#watcher?.close();this.#watcher=null;if(this.#poller)clearInterval(this.#poller);this.#poller=null;if(this.#debounce)clearTimeout(this.#debounce);this.#debounce=null;}
 #schedule(){if(this.#debounce)return;this.#debounce=setTimeout(()=>{this.#debounce=null;this.#changed();},350);this.#debounce.unref();}
 #fingerprint(dir=this.#sessionsDir,result=new Map()){if(!existsSync(dir))return result;for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())this.#fingerprint(path,result);else if(entry.isFile()&&entry.name.endsWith('.jsonl')){const stat=statSync(path);result.set(path,{mtimeMs:stat.mtimeMs,size:stat.size});}}return result;}
 #changed(){const next=this.#fingerprint();const changedPaths=new Set([...this.#snapshot.keys(),...next.keys()].filter(path=>{const before=this.#snapshot.get(path),after=next.get(path);return !before||!after||before.mtimeMs!==after.mtimeMs||before.size!==after.size;}));if(!changedPaths.size)return;const oldByPath=new Map((this.#sessions||[]).map(session=>[session.path,session.id]));this.#sessions=listWorkspaceSessions({workspace:this.#workspace,sessionsDir:this.#sessionsDir});this.#snapshot=next;const changedSessionIds=new Set([...changedPaths].map(path=>oldByPath.get(path)).filter(Boolean));for(const session of this.#sessions)if(changedPaths.has(session.path))changedSessionIds.add(session.id);this.emit('changed',{changedSessionIds:[...changedSessionIds]});}
}
const key=Symbol.for('codex-webui.nativeSessionSync');
export function getNativeSessionSync(workspace){if(!globalThis[key]){globalThis[key]=new NativeSessionSync({workspace});globalThis[key].start();}return globalThis[key];}
