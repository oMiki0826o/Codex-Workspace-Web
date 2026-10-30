import { watch } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { listWorkspaceSessions, readNativeSession } from './native-sessions.mjs';

export class NativeSessionSync extends EventEmitter {
 #workspace;#sessionsDir;#watcher=null;#poller=null;#debounce=null;
 constructor({workspace,sessionsDir=process.env.CODEX_SESSIONS_DIR||join(homedir(),'.codex','sessions')}){super();this.#workspace=workspace;this.#sessionsDir=sessionsDir;}
 list(){return listWorkspaceSessions({workspace:this.#workspace,sessionsDir:this.#sessionsDir});}
 read(id){return readNativeSession({sessionId:id,workspace:this.#workspace,sessionsDir:this.#sessionsDir});}
 start(){if(this.#watcher||this.#poller)return;try{this.#watcher=watch(this.#sessionsDir,{recursive:true},()=>this.#schedule());}catch{}this.#poller=setInterval(()=>this.emit('changed'),5000);this.#poller.unref();}
 stop(){this.#watcher?.close();this.#watcher=null;if(this.#poller)clearInterval(this.#poller);this.#poller=null;if(this.#debounce)clearTimeout(this.#debounce);this.#debounce=null;}
 #schedule(){if(this.#debounce)return;this.#debounce=setTimeout(()=>{this.#debounce=null;this.emit('changed');},350);this.#debounce.unref();}
}
const key=Symbol.for('codex-webui.nativeSessionSync');
export function getNativeSessionSync(workspace){if(!globalThis[key]){globalThis[key]=new NativeSessionSync({workspace});globalThis[key].start();}return globalThis[key];}
