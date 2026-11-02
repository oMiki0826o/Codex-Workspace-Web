export const emptyTimeline=()=>({items:[],plans:{},diffs:{},usage:{},approvals:[],seen:[]});
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
const str=x=>typeof x==='string'?x:'';
export function reduceTimeline(state,event){
 if(!event||typeof event!=='object')return state;
 const key=String(event.jobId||'')+':'+String(event.id??'');
 if(event.id!=null&&state.seen.includes(key))return state;
 const s={...state,items:[...state.items],plans:{...state.plans},diffs:{...state.diffs},usage:{...state.usage},approvals:[...state.approvals],seen:event.id==null?state.seen:[...state.seen,key]};
 const p=obj(event.payload),item=obj(p.item),id=String(item.id??p.itemId??'');
 const mutate=(patch,done=false)=>{
  if(!id)return;const i=s.items.findIndex(x=>x.id===id&&x.jobId===(event.jobId||''));
  if(i<0)s.items.push({id,jobId:event.jobId||'',type:'unknown',...patch,done});
  else if(!(s.items[i].done&&!done))s.items[i]={...s.items[i],...patch,done:done||s.items[i].done};
 };
 if(['item.started','item.updated','item.completed'].includes(event.type)){mutate({...item,text:str(item.text)||str(item.content)||undefined},event.type==='item.completed');}
 if(event.type==='item.delta'){const prev=s.items.find(x=>x.id===id);mutate({type:prev?.type||'agentMessage',text:(prev?.text||'')+str(p.delta)});}
 if(event.type==='item.output'){const prev=s.items.find(x=>x.id===id);mutate({type:prev?.type||'commandExecution',output:(prev?.output||'')+str(p.delta)});}
 if(event.type==='turn.plan')s.plans[String(p.turnId||'current')]=p.plan||[];
 if(event.type==='turn.diff')s.diffs[String(p.turnId||'current')]=str(p.diff);
 if(event.type==='turn.usage')s.usage[String(p.turnId||'current')]=obj(p.usage);
 if(event.type==='approval.request')s.approvals.push({...p,jobId:event.jobId});
 if(['approval.resolved','appserver.serverRequest.resolved'].includes(event.type))s.approvals=s.approvals.filter(x=>String(x.requestId)!==String(p.requestId??p.id));
 return s;
}
export const mergeTimeline=(state,events)=>events.reduce(reduceTimeline,state);
