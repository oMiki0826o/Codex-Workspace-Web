import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/app/ux-fixes.css',import.meta.url),'utf8');
const src=readFileSync(new URL('../src/components/Workspace.tsx',import.meta.url),'utf8');
const block=selector=>{const i=css.indexOf(selector+' {');assert.notEqual(i,-1,'Missing '+selector);return css.slice(i,css.indexOf('}',i)+1)};
test('safe area header stays inside a single fixed shell',()=>{
 assert.match(block('.app'),/position:fixed!important/);
 assert.match(block('.app'),/top:var\(--chat-viewport-top/);
 assert.match(block('.app'),/padding-top:max\(66px,env\(safe-area-inset-top/);
 assert.doesNotMatch(css,/html\[data-keyboard-open="true"\] \.topbar/);
});
test('composer stays in flex flow; no independent fixed viewport footer',()=>{
 assert.match(block('.composer-wrap'),/position:relative!important/);
 assert.doesNotMatch(block('.composer-wrap'),/position:fixed|top:var\(--chat-visible-height|translateY\(-100%\)/);
 assert.match(block('.main'),/padding-bottom:0!important/);
});
test('iOS focus avoids document scroll and viewport uses offsetTop',()=>{
 assert.match(src,/focus\(\{preventScroll:true\}\)/);
 assert.match(src,/offsetTop:viewport\?\.offsetTop/);
 assert.match(src,/--chat-viewport-top/);
});
