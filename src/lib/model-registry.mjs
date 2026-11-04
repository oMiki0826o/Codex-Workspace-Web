import { AppServerClient } from './app-server-client.mjs';

const CLOUD='cloud';
const QWEN='qwen';
const qwenModelsUrl=()=>process.env.QWEN_OLLAMA_MODELS_URL||'http://192.168.1.167:11434/v1/models';
const qwenBin=()=>process.env.CODEX_QWEN_BIN||'codex-qwen';
const cloudBin=()=>process.env.CODEX_BIN||'codex';

const efforts=(model)=>Array.isArray(model?.supportedReasoningEfforts)?model.supportedReasoningEfforts
  :Array.isArray(model?.reasoningEfforts)?model.reasoningEfforts
  :Array.isArray(model?.reasoning_efforts)?model.reasoning_efforts:[];
const normalizeEfforts=model=>efforts(model).map(value=>typeof value==='string'?value:value?.reasoningEffort||value?.reasoning_effort).filter(Boolean);

async function cloudModels(clientFactory=(bin)=>new AppServerClient(bin)){
 const client=clientFactory(cloudBin());
 try{
  await client.connect();
  const response=await client.listModels();
  const items=Array.isArray(response?.data)?response.data:Array.isArray(response?.models)?response.models:[];
  return items.map(model=>({id:model.slug||model.id||model.model,name:model.display_name||model.displayName||model.name||model.slug||model.id,reasoningEfforts:normalizeEfforts(model),route:CLOUD})).filter(model=>typeof model.id==='string');
 }finally{await client.close();}
}

async function qwenModels(fetcher=fetch){
 const response=await fetcher(qwenModelsUrl(),{headers:{accept:'application/json'},signal:AbortSignal.timeout(4000)});
 if(!response.ok)throw new Error(`Ollama 模型清單回應 ${response.status}`);
 const body=await response.json();
 const items=Array.isArray(body?.data)?body.data:Array.isArray(body?.models)?body.models:[];
 return items.map(model=>({id:model.id||model.name,name:model.name||model.id,reasoningEfforts:[],route:QWEN})).filter(model=>typeof model.id==='string');
}

/** Server-only dynamic registry. Model ids from a browser are never trusted. */
export async function listModels({clientFactory,fetcher}={}){
 const [cloud,qwen]=await Promise.allSettled([cloudModels(clientFactory),qwenModels(fetcher)]);
 const models=[];
 if(cloud.status==='fulfilled')models.push(...cloud.value);
 if(qwen.status==='fulfilled')models.push(...qwen.value);
 if(qwen.status==='rejected')console.warn(`Qwen model discovery unavailable: ${qwen.reason instanceof Error?qwen.reason.message:String(qwen.reason)}`);
 return {models,availability:{cloud:cloud.status==='fulfilled',qwen:qwen.status==='fulfilled'}};
}

export async function resolveModel(id,{clientFactory,fetcher}={}){
 const registry=await listModels({clientFactory,fetcher});
 if(!id)return {model:'',route:CLOUD,registry};
 const selected=registry.models.find(model=>model.id===id);
 if(!selected)throw new Error('選取的模型目前不可用，請重新整理模型清單');
 return {model:selected.id,route:selected.route,registry};
}

export const modelBinForRoute=(route)=>route===QWEN?qwenBin():cloudBin();
export const MODEL_ROUTES={CLOUD,QWEN};
