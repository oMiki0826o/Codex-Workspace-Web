import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('single staged model picker resets strength when changing model',()=>{
 const s=read('src/components/Workspace.tsx');
 assert.match(s,/aria-label="選擇模型與推理強度"/);
 assert.match(s,/modelPickerStep==='model'/);
 assert.match(s,/setModel\(option.value\)/);
 assert.match(s,/setEffort\(''\)/);
 assert.match(s,/setModelPickerStep\('effort'\)/);
 assert.doesNotMatch(s,/className="v2-chip-select"/);
});
test('only model-advertised effort options are presented',()=>{
 const s=read('src/components/Workspace.tsx');
 assert.match(s,/supportedReasoningEfforts|reasoningEfforts/);
 assert.match(s,/models\.find\(m=>m\.id===\(model\|\|codexStatus\?\.defaultModel\)\)/);
});

test('settings uses the same two-stage model and reasoning picker as composer',()=>{
 const src=read('src/components/Workspace.tsx');
 assert.match(src,/className="outline-btn v2-settings-model-trigger"/);
 assert.match(src,/setModelPickerStep\('model'\);setModal\('model'\)/);
 assert.doesNotMatch(src,/<label className="form-field"><span className="form-label">推理強度<\/span><select/);
});
test('send button has a normal-flow position override at the end of active CSS',()=>{
 const css=read('src/styles/openwebui.css');
 assert.match(css,/\.composer-actions > \.send-btn\{position:static!important/);
 assert.match(css,/\.composer-actions > \.composer-model-trigger\{flex:1 1 0/);
 assert.match(css,/@media\(max-width:359px\)/);
});
