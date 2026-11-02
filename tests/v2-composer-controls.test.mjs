import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('composer model, effort, sandbox have distinct native pickers, not three nested modal clones',()=>{
 const s=read('src/components/Workspace.tsx');
 assert.match(s,/aria-label="選擇 Codex 模型"/);
 assert.match(s,/aria-label="推理強度"/);
 assert.match(s,/aria-label="執行權限"/);
 assert.doesNotMatch(s,/className="chip" onClick=\{\(\)=>setModal\('(model|effort|sandbox)'\)/);
 assert.match(s,/setModel\(e.target.value\);setEffort\(''\)/);
});
test('reasoning effort is constrained by selected model rather than global guessed strengths',()=>{
 const s=read('src/components/Workspace.tsx');
 assert.match(s,/models\.find\(x=>x\.id===\(model\|\|codexStatus\?\.defaultModel\)\)\?\.reasoningEfforts/);
 const css=read('src/styles/openwebui.css');
 assert.match(css,/\.v2-chip-select\{position:relative/);
 assert.match(css,/\.v2-chip-select select\{/);
});
