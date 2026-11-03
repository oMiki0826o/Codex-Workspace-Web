import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('src/components/Workspace.tsx');
const css=read('src/styles/openwebui.css');
test('right inspector uses a complete in-body mobile screen rather than a clipped fixed drawer',()=>{
 const mobile=css.slice(css.lastIndexOf('/* iOS inspector:'));
 assert.match(mobile,/\.app \.body > \.right\.open\{[\s\S]*?position:absolute!important/);
 assert.match(mobile,/\.app \.body > \.right\.open\{[\s\S]*?inset:0!important/);
 assert.match(mobile,/\.app \.body > \.right\.open\{[\s\S]*?width:100%!important/);
 assert.match(mobile,/\.app \.body\{position:relative!important/);
 assert.match(mobile,/\.app \.body > \.right\.open\{[\s\S]*?left:0!important/);
});
test('inspector stays below topbar and scrolls separately from keyboard layout',()=>{
 const mobile=css.slice(css.lastIndexOf('/* iOS inspector:'));
 assert.match(mobile,/\.app \.body > \.right\.open\{[\s\S]*?height:100%!important/);
 assert.match(mobile,/\.app \.body > \.right\.open \.right-body\{[\s\S]*?overflow-y:auto!important/);
 assert.match(mobile,/\.app \.body > \.right\.open \.right-bottom\{[\s\S]*?env\(safe-area-inset-bottom/);
});
test('inspector has a reliably visible close control and scrim action',()=>{
 assert.match(source,/className="inspector-scrim"/);
 assert.match(source,/className="icon-btn right-close"/);
 assert.match(source,/aria-label="關閉檔案檢視"/);
 const mobile=css.slice(css.lastIndexOf('/* iOS inspector:'));
 assert.match(mobile,/\.app \.body > \.right\.open \.right-close\{[\s\S]*?width:44px!important/);
});
test('mobile inspector styles are scoped and do not replace desktop split panel',()=>{
 const mobile=css.slice(css.lastIndexOf('/* iOS inspector:'));
 assert.match(mobile,/@media\(max-width:767px\)/);
 assert.doesNotMatch(mobile,/@media\(min-width:768px\)/);
});
