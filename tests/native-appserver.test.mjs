import {test} from 'node:test';import assert from 'node:assert/strict';
import {listAppServerSessions,readAppServerSession} from '../src/lib/native-appserver.mjs';
test('thread list filters outside workspace even if server returns it',async()=>{
 const client={listThreads:async()=>({data:[{id:'ok',cwd:'/app/project',updatedAt:1760000000},{id:'bad',cwd:'/etc',updatedAt:1760000000}],nextCursor:null})};
 const data=await listAppServerSessions(client,'/app/project');
 assert.deepEqual(data.map(x=>x.id),['ok']);
});
test('stored thread flattens user, agent and tool items',async()=>{
 const client={readThread:async()=>({thread:{id:'t',cwd:'/app/project',turns:[{id:'turn',items:[
  {id:'m1',type:'userMessage',content:[{type:'text',text:'Hi'}]},
  {id:'cmd',type:'commandExecution',command:'pwd',aggregatedOutput:'/app/project'},
  {id:'m2',type:'agentMessage',text:'Done'}
 ]}]}})};
 const data=await readAppServerSession(client,'/app/project','t');
 assert.deepEqual(data.items.map(x=>x.role),['user','tool','assistant']);
 assert.equal(data.items[1].text,'pwd\n/app/project');
});
test('foreign thread read fails closed',async()=>{
 const client={readThread:async()=>({thread:{id:'t',cwd:'/outside',turns:[]}})};
 assert.equal(await readAppServerSession(client,'/app/project','t'),null);
});
