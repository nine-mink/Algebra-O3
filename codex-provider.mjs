import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

export function findCodex(){
 if(process.env.CODEX_BIN)return process.env.CODEX_BIN;
 if(process.platform==='win32'){
  const candidate=path.join(process.env.LOCALAPPDATA||'','hermes/node/node_modules/@openai/codex/node_modules/@openai/codex-win32-x64/vendor/x86_64-pc-windows-msvc/bin/codex.exe');
  if(existsSync(candidate))return candidate;
 }
 return 'codex';
}
export function codexReady(){try{const r=spawnSync(findCodex(),['login','status'],{encoding:'utf8',windowsHide:true,timeout:10000,stdio:['ignore','pipe','pipe']});return r.status===0&&((r.stdout||'')+(r.stderr||'')).includes('Logged in');}catch{return false;}}
let active=false;
export async function generateWithCodex(prompt,{timeoutMs=12000}={}){
 if(active)throw Error('Codex is busy');active=true;
 let directory;
 try{
  directory=await mkdtemp(path.join(tmpdir(),'algebra-codex-'));
  const output=path.join(directory,'answer.json');
  const args=['exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','--sandbox','read-only','-c','features.shell_tool=false','-c','features.apply_patch_freeform=false','--color','never','--output-last-message',output,'-'];
  await new Promise((resolve,reject)=>{
   const child=spawn(findCodex(),args,{cwd:directory,windowsHide:true,stdio:['pipe','ignore','ignore']});
   const timer=setTimeout(()=>{child.kill();reject(Error('Codex timed out'));},Math.max(500,Math.min(12000,timeoutMs)));
   child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('close',code=>{clearTimeout(timer);code===0?resolve():reject(Error('Codex failed'));});
   child.stdin.on('error',()=>{});child.stdin.end('Return only the requested JSON. Do not use tools, access files, or run commands.\n'+prompt);
  });
  return JSON.parse((await readFile(output,'utf8')).replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));
 }finally{active=false;if(directory)await rm(directory,{recursive:true,force:true});}
}
