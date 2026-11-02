import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getSwipeAction} from '../src/lib/mobile-swipe.mjs';
test('swipe right conversations, left settings',()=>{
 assert.equal(getSwipeAction({startX:140,startY:210,endX:275,endY:224,elapsedMs:240,width:390}),'conversations');
 assert.equal(getSwipeAction({startX:275,startY:210,endX:130,endY:224,elapsedMs:240,width:390}),'settings');
});
test('vertical, short, system-edge and input gestures are ignored',()=>{
 assert.equal(getSwipeAction({startX:150,startY:170,endX:175,endY:370,elapsedMs:350,width:390}),null);
 assert.equal(getSwipeAction({startX:8,startY:170,endX:190,endY:180,elapsedMs:250,width:390}),null);
 assert.equal(getSwipeAction({startX:120,startY:200,endX:250,endY:202,elapsedMs:200,width:390,protectedTarget:true}),null);
});
