import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';

const now=()=>new Date().toISOString();
const rowProject=r=>r && ({id:r.id,name:r.name,path:r.path,createdAt:r.created_at});
const rowJob=r=>r && ({id:r.id,threadId:r.thread_id,prompt:r.prompt,status:r.status,exitCode:r.exit_code,startedAt:r.started_at,finishedAt:r.finished_at,createdAt:r.created_at,pid:r.pid});
export function createStore(filename){
  mkdirSync(dirname(filename),{recursive:true,mode:0o700});
  const db=new DatabaseSync(filename);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS threads(id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), codex_thread_id TEXT, title TEXT NOT NULL DEFAULT '新的對話', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, thread_id TEXT NOT NULL REFERENCES threads(id), prompt TEXT NOT NULL, request_key TEXT NOT NULL, status TEXT NOT NULL, exit_code INTEGER, pid INTEGER, started_at TEXT, finished_at TEXT, created_at TEXT NOT NULL, UNIQUE(thread_id,request_key));
    CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT NOT NULL REFERENCES jobs(id), type TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS events_job_cursor ON events(job_id,id);
    CREATE UNIQUE INDEX IF NOT EXISTS threads_codex_thread_id ON threads(codex_thread_id) WHERE codex_thread_id IS NOT NULL;
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
  `);
  db.prepare("UPDATE jobs SET status='interrupted', finished_at=? WHERE status IN ('running','queued')").run(now());
  const q=(sql,...params)=>db.prepare(sql).get(...params);
  const all=(sql,...params)=>db.prepare(sql).all(...params);
  const execute=(sql,...params)=>db.prepare(sql).run(...params);
  function getJob(id){return rowJob(q('SELECT * FROM jobs WHERE id=?',id));}
  function getThread(id){
    const r=q('SELECT * FROM threads WHERE id=?',id);if(!r)return null;
    return {id:r.id,projectId:r.project_id,codexThreadId:r.codex_thread_id,title:r.title,createdAt:r.created_at,updatedAt:r.updated_at,jobs:all('SELECT * FROM jobs WHERE thread_id=? ORDER BY created_at ASC',id).map(rowJob)};
  }
  return {
    close:()=>db.close(),
    addProject(name,path){const found=q('SELECT * FROM projects WHERE path=?',path);if(found)return rowProject(found); const id=randomUUID(); execute('INSERT INTO projects VALUES(?,?,?,?)',id,name,path,now());return rowProject(q('SELECT * FROM projects WHERE id=?',id));},
    listProjects:()=>all('SELECT * FROM projects ORDER BY created_at DESC').map(rowProject),
    getProject:id=>rowProject(q('SELECT * FROM projects WHERE id=?',id)),
    addThread(projectId){if(!q('SELECT id FROM projects WHERE id=?',projectId))throw new Error('無效的專案');const id=randomUUID();const t=now();execute('INSERT INTO threads(id,project_id,title,created_at,updated_at) VALUES(?,?,?,?,?)',id,projectId,'新的對話',t,t);return getThread(id);},
    importNativeThread(projectId,codexThreadId,title='新的對話'){
      const found=q('SELECT id FROM threads WHERE codex_thread_id=?',codexThreadId);if(found)return getThread(found.id);
      if(!q('SELECT id FROM projects WHERE id=?',projectId))throw new Error('無效的專案');const id=randomUUID();const t=now();execute('INSERT INTO threads(id,project_id,codex_thread_id,title,created_at,updated_at) VALUES(?,?,?,?,?,?)',id,projectId,codexThreadId,title.slice(0,80)||'新的對話',t,t);return getThread(id);
    },
    getThread,
    listThreads:(projectId)=>all('SELECT * FROM threads WHERE project_id=? ORDER BY updated_at DESC',projectId).map(r=>({id:r.id,projectId:r.project_id,title:r.title,updatedAt:r.updated_at,codexThreadId:r.codex_thread_id})),
    setCodexThread:(id,codexId)=>execute('UPDATE threads SET codex_thread_id=?,updated_at=? WHERE id=?',codexId,now(),id),
    renameThread:(id,title)=>execute('UPDATE threads SET title=?, updated_at=? WHERE id=?',title,now(),id),
    addJob(threadId,prompt,requestKey){const found=q('SELECT * FROM jobs WHERE thread_id=? AND request_key=?',threadId,requestKey);if(found)return rowJob(found);
      const id=randomUUID();execute('INSERT INTO jobs(id,thread_id,prompt,request_key,status,created_at) VALUES(?,?,?,?,?,?)',id,threadId,prompt,requestKey,'queued',now());execute('UPDATE threads SET updated_at=? WHERE id=?',now(),threadId);return getJob(id);},
    getJob,
    getJobByRequestKey:(threadId,key)=>rowJob(q('SELECT * FROM jobs WHERE thread_id=? AND request_key=?',threadId,key)),
    getActiveProjectJobs:projectId=>all("SELECT j.* FROM jobs j JOIN threads t ON t.id=j.thread_id WHERE t.project_id=? AND j.status IN ('queued','running')",projectId).map(rowJob),
    activeCount:()=>q("SELECT COUNT(*) AS n FROM jobs WHERE status IN ('queued','running')").n,
    setJobRunning:(id,pid)=>execute("UPDATE jobs SET status='running',pid=?,started_at=? WHERE id=?",pid,now(),id),
    finishJob:(id,status,code=null)=>execute('UPDATE jobs SET status=?,exit_code=?,finished_at=? WHERE id=?',status,code,now(),id),
    event(jobId,type,payload){const text=JSON.stringify(payload);const safe=text.length>100000?JSON.stringify({type:'webui.warning',message:'事件內容超出儲存上限'}):text;
      const result=execute('INSERT INTO events(job_id,type,payload,created_at) VALUES(?,?,?,?)',jobId,type,safe,now());return {id:Number(result.lastInsertRowid),jobId,type,payload:JSON.parse(safe)};},
    getEvents:(jobId,cursor=0)=>all('SELECT * FROM events WHERE job_id=? AND id>? ORDER BY id ASC LIMIT 1000',jobId,cursor).map(r=>({id:r.id,jobId:r.job_id,type:r.type,payload:JSON.parse(r.payload)})),
    addSession:(hash,expires)=>execute('INSERT INTO sessions VALUES(?,?)',hash,expires),
    hasSession:(hash)=>Boolean(q('SELECT token_hash FROM sessions WHERE token_hash=? AND expires_at>?',hash,Date.now())),
    removeSession:(hash)=>execute('DELETE FROM sessions WHERE token_hash=?',hash)
  };
}
const storeKey=Symbol.for('codex-webui.store');
export function getStore(){if(!globalThis[storeKey]){const name=join(process.env.CODEX_WEB_DATA_DIR||join(homedir(),'.local','share','codex-webui'),'state.db');globalThis[storeKey]=createStore(name);}return globalThis[storeKey];}
