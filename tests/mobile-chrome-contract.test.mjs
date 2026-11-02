import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/components/Workspace.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/app/ux-fixes.css',import.meta.url),'utf8');
test('permanent dark theme has no toggle or option',()=>{
 assert.match(src,/document\.documentElement\.dataset\.theme='dark'/);
 assert.doesNotMatch(src,/setTheme\(|initialTheme\(|切換主題|網站外觀|<option value="light">/);
});
test('mobile phone has status-bar breathing room',()=>{
 assert.match(css,/padding-top:max\(66px,env\(safe-area-inset-top/);
});
