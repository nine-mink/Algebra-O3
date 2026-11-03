import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import worker,{TYPES,LEVELS} from './worker/index.js';
import {codexReady,generateWithCodex} from './codex-provider.mjs';

const key=process.env.CODEX_GATEWAY_KEY;
if(!key||key.length<32)throw Error('Set a gateway key with at least 32 characters');
if(!codexReady())throw Error('Codex login is not ready');
let busy=false;
const authorized=value=>{const a=Buffer.from(value||''),b=Buffer.from('Bearer '+key);return a.length===b.length&&timingSafeEqual(a,b);};
const server=http.createServer(async(req,res)=>{
 const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 if(!authorized(req.headers.authorization))return reply(401,{error:'Unauthorized'});
 if(req.url!=='/api/codex')return reply(404,{error:'Not found'});
 if(req.method==='GET')return reply(200,{ready:true,busy});
 if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
 if(busy)return reply(429,{error:'CODEX_BUSY'});
 busy=true;
 try{
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096)return reply(413,{error:'Too large'});}
  let input;try{input=JSON.parse(raw);}catch{return reply(400,{error:'Invalid JSON'});}
  if(!input||!TYPES.includes(input.type)||!LEVELS.includes(input.difficulty))return reply(400,{error:'Invalid settings'});
  const amount=input.count??1;if(amount!==1)return reply(400,{error:'Invalid count'});
  const result=await worker.fetch(new Request('http://localhost/api/generate',{method:'POST',body:JSON.stringify(input)}),{CODEX_GENERATE:generateWithCodex,GENERATION_TIMEOUT_MS:Math.max(500,Math.min(12000,Number(input.timeoutMs)||12000))});
  res.writeHead(result.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(await result.text());
 }catch{return reply(502,{error:'CODEX_GENERATION_FAILED'});}finally{busy=false;}
});
server.requestTimeout=160000;
server.listen(8790,'127.0.0.1',()=>console.log('Authenticated Codex gateway on 127.0.0.1:8790'));
