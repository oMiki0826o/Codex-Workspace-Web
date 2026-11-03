import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ui=read('src/components/Workspace.tsx');
const css=read('src/styles/openwebui.css');

test('composer has ONE model-and-effort trigger rather than three native dropdowns',()=>{
 assert.match(ui,/className="composer-model-trigger"/);
 assert.match(ui,/aria-label="選擇模型與推理強度"/);
 assert.match(ui,/className="composer-sandbox-trigger"/);
 assert.doesNotMatch(ui,/className="v2-chip-select"/);
});

test('model selection leads to supported reasoning strengths, with a back action',()=>{
 assert.match(ui,/modelPickerStep==='model'/);
 assert.match(ui,/setModelPickerStep\('effort'\)/);
 assert.match(ui,/setModelPickerStep\('model'\)/);
 assert.match(ui,/onClick=\{\(\)=>setModal\('sandbox'\)\}/);
 assert.match(ui,/setEffort\(''\)/);
 assert.match(ui,/reasoningEfforts/);
});

test('send and stop are separate flow elements, never overlaid on sandbox',()=>{
 assert.match(css,/\.composer-actions\s*>\s*\.send-btn\s*\{[^}]*position:static!important/);
 assert.match(css,/\.composer-actions\s*>\s*\.v2-stop-btn\s*\{[^}]*position:static!important/);
 assert.match(css,/\.composer-actions\s*\{[^}]*overflow-x:hidden!important/);
 assert.match(css,/\.composer-model-label\s*\{[^}]*text-overflow:ellipsis/);
 assert.match(css,/\.composer-sandbox-trigger\s*\{[^}]*min-width:0/);
});

test('mobile controls use the same contained toolbar and preserve statusbar clearance',()=>{
 assert.match(css,/@media\s*\(max-width:767px\)/);
 assert.match(css,/\.composer-actions\s*\{[^}]*padding:6px 0 0!important/);
 assert.match(css,/\.app\{[^}]*padding-top:max\(66px,env\(safe-area-inset-top/);
});
