const COMMAND='item/commandExecution/requestApproval',FILE='item/fileChange/requestApproval';
export function describeApproval(method,params={}){
 const kind=method===COMMAND?'command':method===FILE?'file':'unsupported';
 return {method,kind,reason:typeof params.reason==='string'?params.reason:'',command:typeof params.command==='string'?params.command:'',cwd:typeof params.cwd==='string'?params.cwd:'',changes:params.changes||null,decisions:kind==='unsupported'?[]:['accept','acceptForSession','decline']};
}
export const validDecision=(request,decision)=>Boolean(request?.decisions?.includes(decision));
