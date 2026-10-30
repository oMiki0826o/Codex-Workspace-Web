import { StringDecoder } from 'node:string_decoder';

const MODEL = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/;
export function buildCodexArgs({dir, sessionId, sandbox='workspace-write', model='', effort=''}) {
  if (!['workspace-write','read-only'].includes(sandbox)) throw new Error('不允許的 Sandbox 模式');
  if (!dir || !dir.startsWith('/')) throw new Error('工作目錄必須是絕對路徑');
  if (model && !MODEL.test(model)) throw new Error('模型名稱格式不正確');
  if (effort && !['low','medium','high','xhigh','max','ultra'].includes(effort)) throw new Error('不允許的推理強度');
  if (sessionId && !/^[a-zA-Z0-9_-]{1,128}$/.test(sessionId)) throw new Error('工作階段 ID 格式不正確');
  const args=['exec','--json','--sandbox',sandbox,'-C',dir];
  if(model) args.push('--model',model);
  if(effort) args.push('-c',`model_reasoning_effort="${effort}"`);
  if(sessionId) args.push('resume',sessionId);
  args.push('-');
  return args;
}
export class JsonlDecoder {
  #decoder=new StringDecoder('utf8');
  #buffer='';
  #handler;
  constructor(handler){this.#handler=handler;}
  push(bytes){this.#buffer+=this.#decoder.write(bytes);this.#lines(false);}
  flush(){this.#buffer+=this.#decoder.end();this.#lines(true);}
  #lines(end){
    let pos;
    while((pos=this.#buffer.indexOf('\n'))!==-1){this.#emit(this.#buffer.slice(0,pos));this.#buffer=this.#buffer.slice(pos+1);}
    if(end && this.#buffer.trim()){this.#emit(this.#buffer);this.#buffer='';}
    if(this.#buffer.length>512*1024) {this.#buffer=''; this.#handler({type:'webui.warning',message:'JSONL 單行超出大小限制，已略過'});}
  }
  #emit(line){if(!line.trim())return;try{const o=JSON.parse(line);if(o&&typeof o==='object'&&!Array.isArray(o))this.#handler(o);}catch{/* invalid diagnostic line is ignored */}}
}
