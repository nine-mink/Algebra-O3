import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import worker from './worker/index.js';
import {codexReady,generateWithCodex} from './codex-provider.mjs';
import {openLocalDatabase} from './local-db.mjs';
const env={...process.env};
env.DB=openLocalDatabase();
const context={waitUntil(promise){promise.catch(()=>console.error('Background preparation failed'));}};
if(process.env.CODEX_ENABLED!=='false'&&codexReady()){env.CODEX_GENERATE=generateWithCodex;console.log('Codex backup: ready (local ChatGPT login)');}
const port=Number(process.env.PORT||8787);
http.createServer(async(req,res)=>{
 try{
  const chunks=[];let size=0;
  for await(const c of req){size+=c.length;if(size>4096){res.writeHead(413);res.end('Too large');return;}chunks.push(c);}
  const origin='http://'+req.headers.host;
  let address=origin+req.url,requestEnv=env;
  if(new URL(address).pathname==='/api/codex'){
   const expected=Buffer.from('Bearer '+(env.CODEX_GATEWAY_KEY||'')),actual=Buffer.from(req.headers.authorization||'');
   if(!env.CODEX_GATEWAY_KEY||expected.length!==actual.length||!timingSafeEqual(expected,actual)){res.writeHead(401);res.end('Unauthorized');return;}
   address=origin+'/api/generate';requestEnv={CODEX_GENERATE:env.CODEX_GENERATE};
  }
  const request=new Request(address,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});
  const reply=await worker.fetch(request,requestEnv,context);res.writeHead(reply.status,Object.fromEntries(reply.headers));res.end(Buffer.from(await reply.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Internal server error');}
}).listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port));
