import assert from 'node:assert/strict';
import worker,{validateQuestion} from '../worker/index.js';
import {generateWithCodex} from '../codex-provider.mjs';
const res=await worker.fetch(new Request('http://localhost/api/generate',{method:'POST',body:JSON.stringify({type:'multiply',difficulty:'easy'})}),{CODEX_GENERATE:generateWithCodex});
assert.equal(res.status,200);const data=await res.json();validateQuestion(data.question);assert.equal(data.provider,'codex');
console.log(JSON.stringify(data));
