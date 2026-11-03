import { AppServerClient } from './app-server-client.mjs';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
const efforts=['low','medium','high','xhigh','max','ultra'];
const config=()=>{try{return readFileSync(join(process.env.CODEX_HOME||join(homedir(),'.codex'),'config.toml'),'utf8');}catch{return '';}};
const value=name=>config().match(new RegExp(`^${name}\\s*=\\s*"([^"]+)"`,'m'))?.[1]||'';
export async function getCodexStatus(client=new AppServerClient(process.env.CODEX_CLOUD_BIN||'codex-cloud')){
 let rawModels={};let rawUsage={};try{await client.connect();try{rawModels=await client.listModels();}catch{}try{rawUsage=await client.readRateLimits();}catch{}}finally{client.close();}
 const source=Array.isArray(rawModels?.data)?rawModels.data:Array.isArray(rawModels?.models)?rawModels.models:Array.isArray(rawModels)?rawModels:[];
 const models=source.map(model=>({id:model.slug||model.id||model.model,name:model.display_name||model.displayName||model.slug||model.id,reasoningEfforts:(model.supportedReasoningEfforts||model.reasoning_efforts||model.reasoningEfforts||[]).map(effort=>typeof effort==='string'?effort:effort.reasoningEffort).filter(effort=>efforts.includes(effort))})).filter(model=>model.id&&model.name);
 const limits=rawUsage?.rateLimits;const usageWindows=limits?[['5 小時',limits.primary],['每週',limits.secondary]].filter(([,window])=>window).map(([label,window])=>({label,remainingPercent:Math.max(0,100-Number(window.usedPercent||0)),resetsAt:window.resetsAt||null,durationMins:window.windowDurationMins||null})):[];
 return {models,defaultModel:value('model'),defaultEffort:value('model_reasoning_effort'),usageWindows};
}
