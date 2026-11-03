import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {handlePractice} from '../worker/practice.js';
import worker from '../worker/index.js';

function database(){const sqlite=new DatabaseSync(':memory:');for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')))sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));return{prepare(sql){const statement=sqlite.prepare(sql);const bind=(...args)=>({first:async()=>statement.get(...args)||null,all:async()=>({results:statement.all(...args)}),run:async()=>({meta:statement.run(...args)})});return{...bind(),bind};},async batch(statements){sqlite.exec('BEGIN');try{const rows=[];for(const s of statements)rows.push(await s.run());sqlite.exec('COMMIT');return rows;}catch(e){sqlite.exec('ROLLBACK');throw e;}},close:()=>sqlite.close()};}
const token='a'.repeat(64),other='b'.repeat(64);
const req=(route,body,key=token)=>new Request('http://localhost/api/practice/'+route,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+key},...(body===undefined?{}:{body:JSON.stringify(body)})});
const pair=s=>({en:s,zh:s});
function question(i){return{question:pair('Simplify '+i+'x'),hint:pair('A hint'),options:[1,2,3,4].map(n=>({latex:n+'x',feedback:pair('Reason '+n)})),correctIndex:0,steps:[pair('One step')]};}

test('single generation, saved history and first-answer grading without background refill',async()=>{
 const db=database(),counts=[];let sequence=0;
 const ctx={waitUntil(){assert.fail('Single-question practice must not schedule background generation');}};
 const generate=async({count})=>{counts.push(count);return[question(++sequence)];};
 const call=async(route,body,key=token)=>{const r=await handlePractice(req(route,body,key),{DB:db},ctx,generate);return{status:r.status,data:await r.json()};};
 try{
  const start=await call('start',{type:'multiply',difficulty:'easy'});const poolId=start.data.pool.id;assert.equal(start.data.items.length,0);assert.equal(counts.length,0);
  for(let i=0;i<5;i++){
   const requestId=crypto.randomUUID();const result=await call('generate',{poolId,requestId});assert.equal(result.status,200);assert.equal(result.data.items.length,i+1);assert.equal(result.data.item.question.correctIndex,undefined);
   const retry=await call('generate',{poolId,requestId});assert.equal(retry.data.item.id,result.data.item.id);assert.equal(counts.length,i+1);
   await call('answer',{itemId:result.data.item.id,selected:i===0?1:0});
   await call('answer',{itemId:result.data.item.id,selected:0});
  }
  const state=await call('state?pool='+poolId);assert.equal(state.data.pool.generated,5);assert.equal(state.data.pool.completed,5);assert.deepEqual(counts,[1,1,1,1,1]);assert.equal(state.data.items[0].selected,1);
  assert.equal((await call('history')).data.items.length,5);assert.equal((await call('history?wrong=1')).data.items.length,1);assert.equal((await call('history',undefined,other)).data.items.length,0);assert.equal((await call('state?pool='+poolId,undefined,other)).status,404);
  const resume=await call('start',{type:'multiply',difficulty:'easy'});assert.equal(resume.data.items.length,5);assert.equal(counts.length,5);
 }finally{db.close();}
});
test('concurrent generate requests create one item and release their lease',async()=>{
 const db=database();let release,calls=0;const gate=new Promise(resolve=>release=resolve);const ctx={waitUntil(){assert.fail();}};
 const generate=async()=>{calls++;await gate;return[question(1)];};
 try{
  const start=await handlePractice(req('start',{type:'divide',difficulty:'easy'}),{DB:db},ctx,generate);const poolId=(await start.json()).pool.id;
  const first=handlePractice(req('generate',{poolId,requestId:crypto.randomUUID()}),{DB:db},ctx,generate);
  const second=handlePractice(req('generate',{poolId,requestId:crypto.randomUUID()}),{DB:db},ctx,generate);
  const rejected=await second;assert.equal(rejected.status,409);release();assert.equal((await first).status,200);assert.equal(calls,1);
 }finally{release();db.close();}
});
test('generation failures keep saved questions and allow retry',async()=>{
 const db=database();let fail=false;const generate=async()=>{if(fail)throw Error('AI_GENERATION_TIMEOUT');return[question(1)];};
 try{
  const start=await handlePractice(req('start',{type:'powers',difficulty:'hard'}),{DB:db},{},generate);const poolId=(await start.json()).pool.id;
  await handlePractice(req('generate',{poolId}),{DB:db},{},generate);fail=true;
  const result=await handlePractice(req('generate',{poolId}),{DB:db},{},generate);assert.equal((await result.json()).error,'AI_GENERATION_TIMEOUT');
  const state=await handlePractice(req('state?pool='+poolId),{DB:db},{},generate);const data=await state.json();assert.equal(data.items.length,1);assert.equal(data.pool.generating,false);
 }finally{db.close();}
});
test('state and start never silently generate, including old error records',async()=>{
 const db=database();const generate=()=>assert.fail('Loading practice must not start AI work');
 try{const r=await handlePractice(req('start',{type:'mixed',difficulty:'hard'}),{DB:db},{},generate);const poolId=(await r.json()).pool.id;await db.prepare('UPDATE practice_pools SET last_error=? WHERE id=?').bind('DEMO_DAILY_LIMIT',poolId).run();const state=await handlePractice(req('state?pool='+poolId),{DB:db},{},generate);assert.equal((await state.json()).items.length,0);}finally{db.close();}
});
test('multi-question requests are rejected without contacting a model',async()=>{const original=globalThis.fetch;globalThis.fetch=()=>assert.fail('No batch generation');try{const r=await worker.fetch(new Request('http://localhost/api/generate',{method:'POST',body:JSON.stringify({type:'powers',difficulty:'easy',count:10})}),{AI_API_KEY:'test'});assert.equal(r.status,400);}finally{globalThis.fetch=original;}});
