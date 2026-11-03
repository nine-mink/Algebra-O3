const practiceJson=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const practiceNow=()=>Date.now();
const practiceId=()=>crypto.randomUUID();
export async function practiceHash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');}
export function practicePublicItem(row){
 const full=JSON.parse(row.payload);const answered=row.selected!==null;
 const question=answered?full:{question:full.question,hint:full.hint,options:full.options.map(o=>({latex:o.latex})),steps:[]};
 return{id:row.id,poolId:row.pool_id,position:row.position,question,selected:row.selected,correct:answered?!!row.correct:null,answeredAt:row.answered_at,provider:full.provider||'api'};
}
async function practicePool(db,owner,id){return db.prepare('SELECT * FROM practice_pools WHERE id=? AND owner_hash=?').bind(id,owner).first();}
async function practiceState(db,pool){
 const rows=await db.prepare('SELECT * FROM practice_items WHERE pool_id=? ORDER BY position').bind(pool.id).all();
 return{pool:{id:pool.id,type:pool.topic,difficulty:pool.difficulty,generated:pool.generated,completed:pool.completed,checkpoint:pool.refill_checkpoint,generating:pool.lease_until>practiceNow(),error:pool.last_error,stale:pool.lease_until>0&&pool.lease_until<=practiceNow()},items:rows.results.map(practicePublicItem)};
}
async function practiceGenerateOne(db,owner,pool,requestId,generate){
 const cached=await db.prepare('SELECT * FROM practice_items WHERE id=? AND pool_id=?').bind(requestId,pool.id).first();
 if(cached)return{item:practicePublicItem(cached)};
 const lease=practiceId(),now=practiceNow();
 const claimed=await db.prepare('UPDATE practice_pools SET lease_id=?,lease_until=?,last_error=? WHERE id=? AND owner_hash=? AND lease_until<=? RETURNING *').bind(lease,now+35000,'',pool.id,owner,now).first();
 if(!claimed)return{error:'REQUEST_IN_PROGRESS',status:409};
 try{
  const recent=(await db.prepare('SELECT payload FROM practice_items WHERE pool_id=? ORDER BY position DESC LIMIT 10').bind(pool.id).all()).results.map(r=>JSON.parse(r.payload).question.en.slice(0,240));
  const generated=await generate({type:pool.topic,difficulty:pool.difficulty,count:1,avoid:recent});
  if(!Array.isArray(generated)||generated.length!==1)throw Error('GENERATION_FAILED');
  const question=generated[0],fingerprint=await practiceHash(question.question.en.replace(/\s/g,'').toLowerCase());
  const duplicate=await db.prepare('SELECT id FROM practice_items WHERE pool_id=? AND fingerprint=?').bind(pool.id,fingerprint).first();
  if(duplicate)throw Error('DUPLICATE_QUESTION');
  await db.batch([
   db.prepare('INSERT INTO practice_items (id,pool_id,position,fingerprint,payload) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM practice_pools WHERE id=? AND lease_id=?)').bind(requestId,pool.id,claimed.generated+1,fingerprint,JSON.stringify(question),pool.id,lease),
   db.prepare('UPDATE practice_pools SET generated=generated+1,lease_until=0,lease_id=?,last_error=? WHERE id=? AND lease_id=?').bind('','',pool.id,lease)
  ]);
  const row=await db.prepare('SELECT * FROM practice_items WHERE id=? AND pool_id=?').bind(requestId,pool.id).first();
  if(!row)throw Error('GENERATION_FAILED');
  return{item:practicePublicItem(row)};
 }catch(error){const safe=['CODEX_BUSY','DUPLICATE_QUESTION','AI_GENERATION_TIMEOUT','AI_NOT_CONFIGURED'].includes(error.message)?error.message:'GENERATION_FAILED';await db.prepare('UPDATE practice_pools SET lease_until=0,lease_id=?,last_error=? WHERE id=? AND lease_id=?').bind('',safe,pool.id,lease).run();return{error:safe,status:safe==='CODEX_BUSY'?429:502};}
}
export async function handlePractice(request,env,ctx,generate){
 if(!env.DB)return practiceJson({error:'PRACTICE_STORAGE_UNAVAILABLE'},503);
 const token=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
 if(!token)return practiceJson({error:'A browser practice key is required.'},401);
 const owner=await practiceHash(token),db=env.DB,url=new URL(request.url);
 if(!['GET','POST'].includes(request.method))return practiceJson({error:'Method not allowed'},405);
 if(request.method==='POST'&&request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return practiceJson({error:'Origin rejected'},403);
 try{
  if(url.pathname==='/api/practice/history'&&request.method==='GET'){
   const offset=Math.max(0,Math.min(100000,Number(url.searchParams.get('offset'))||0)),wrong=url.searchParams.get('wrong')==='1';
   const rows=await db.prepare('SELECT i.*,p.topic,p.difficulty FROM practice_items i JOIN practice_pools p ON p.id=i.pool_id WHERE p.owner_hash=? AND i.selected IS NOT NULL'+(wrong?' AND i.correct=0':'')+' ORDER BY i.answered_at DESC,i.id LIMIT 51 OFFSET ?').bind(owner,offset).all();
   return practiceJson({items:rows.results.slice(0,50).map(r=>({...practicePublicItem(r),type:r.topic,difficulty:r.difficulty})),more:rows.results.length>50});
  }
  if(url.pathname==='/api/practice/state'&&request.method==='GET'){
   let pool=await practicePool(db,owner,url.searchParams.get('pool'));if(!pool)return practiceJson({error:'Pool not found'},404);
   return practiceJson(await practiceState(db,pool));
  }
  if(request.method!=='POST')return practiceJson({error:'Not found'},404);
  const raw=await request.text();if(raw.length>2000)return practiceJson({error:'Too large'},413);
  let input;try{input=JSON.parse(raw);}catch{return practiceJson({error:'Invalid JSON'},400);}
  if(!input)return practiceJson({error:'Invalid input'},400);
  if(url.pathname==='/api/practice/start'){
   if(!['multiply','divide','powers','mixed'].includes(input.type)||!['easy','medium','hard'].includes(input.difficulty))return practiceJson({error:'Invalid settings'},400);
   await db.prepare('INSERT OR IGNORE INTO practice_pools (id,owner_hash,topic,difficulty,created_at) VALUES (?,?,?,?,?)').bind(practiceId(),owner,input.type,input.difficulty,practiceNow()).run();
   let pool=await db.prepare('SELECT * FROM practice_pools WHERE owner_hash=? AND topic=? AND difficulty=?').bind(owner,input.type,input.difficulty).first();
   return practiceJson(await practiceState(db,pool));
  }
  if(url.pathname==='/api/practice/generate'||url.pathname==='/api/practice/refill'){
   const pool=await practicePool(db,owner,input.poolId);if(!pool)return practiceJson({error:'Pool not found'},404);
   const requestId=input.requestId||practiceId();if(!/^[a-f0-9-]{36}$/.test(requestId))return practiceJson({error:'Invalid request id'},400);
   const result=await practiceGenerateOne(db,owner,pool,requestId,generate);if(result.error)return practiceJson({error:result.error},result.status);
   return practiceJson({...result,...(await practiceState(db,await practicePool(db,owner,pool.id)))});
  }
  if(url.pathname==='/api/practice/answer'){
   if(!Number.isInteger(input.selected)||input.selected<0||input.selected>3)return practiceJson({error:'Invalid option'},400);
   const row=await db.prepare('SELECT i.* FROM practice_items i JOIN practice_pools p ON p.id=i.pool_id WHERE i.id=? AND p.owner_hash=?').bind(input.itemId,owner).first();
   if(!row)return practiceJson({error:'Question not found'},404);
   const payload=JSON.parse(row.payload);
   await db.batch([
    db.prepare('UPDATE practice_items SET selected=?,correct=?,answered_at=? WHERE id=? AND selected IS NULL').bind(input.selected,Number(input.selected===payload.correctIndex),practiceNow(),row.id),
    db.prepare('UPDATE practice_pools SET completed=(SELECT COUNT(*) FROM practice_items WHERE pool_id=? AND selected IS NOT NULL) WHERE id=?').bind(row.pool_id,row.pool_id)
   ]);
   const pool=await practicePool(db,owner,row.pool_id);
   const item=await db.prepare('SELECT * FROM practice_items WHERE id=?').bind(row.id).first();
   return practiceJson({item:practicePublicItem(item),...(await practiceState(db,await practicePool(db,owner,row.pool_id)))});
  }
  return practiceJson({error:'Not found'},404);
 }catch{return practiceJson({error:'PRACTICE_REQUEST_FAILED'},500);}
}
