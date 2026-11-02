const METHODS=['model/list','thread/list','thread/read','thread/turns/list','skills/list','mcpServerStatus/list'];
export async function discoverCodexCapabilities(client){
 const result={experimental:false,methods:{},models:[],checkedAt:new Date().toISOString()};
 for(const method of METHODS){
  try{const response=await client.request(method,{});result.methods[method]=true;
   if(method==='model/list'){
    const data=response?.data||response?.models||[];
    result.models=data.filter(x=>typeof x?.id==='string').map(x=>({id:x.id,name:x.displayName||x.name||x.id,
     efforts:(x.supportedReasoningEfforts||x.reasoningEfforts||x.reasoning_efforts||[]).map(e=>typeof e==='string'?e:e.reasoningEffort||e.reasoning_effort).filter(Boolean)}));
   }
  }catch{result.methods[method]=false;}
 }
 return result;
}
export const effortsForModel=(capabilities,id)=>capabilities.models.find(x=>x.id===id)?.efforts||[];
