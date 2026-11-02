import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/styles/openwebui.css'),src=read('src/components/Workspace.tsx');
const mobile=css.slice(css.indexOf('@media(max-width:767px)'));
test('no separate fixed-position composer or translated header',()=>{
 assert.match(mobile,/\.app\{[^}]*position:relative!important/);
 assert.match(mobile,/\.composer-wrap\{[^}]*position:relative!important/);
 assert.doesNotMatch(mobile,/\.composer-wrap\{[^}]*position:fixed/);
 assert.match(mobile,/\.chat-scroll\{[^}]*overflow-y:auto/);
});
test('status bar headroom persists when keyboard shrinks viewport',()=>{
 assert.match(mobile,/\.app\{[^}]*padding-top:max\(66px/);
 assert.doesNotMatch(mobile,/padding-top:max\(45px/);
});
test('focus requests no auto-scroll; viewport updates only height',()=>{
 assert.match(src,/focus\(\{preventScroll:true\}\)/);
 assert.match(src,/--v2-height/);
});
