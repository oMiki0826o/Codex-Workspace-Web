import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('development and production servers listen on all interfaces for private VPN access',()=>{
 const scripts=JSON.parse(readFileSync(new URL('../package.json',import.meta.url))).scripts;
 assert.match(scripts.dev,/--hostname 0\.0\.0\.0/);
 assert.match(scripts.start,/--hostname 0\.0\.0\.0/);
});
