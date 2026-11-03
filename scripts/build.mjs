import {mkdirSync,copyFileSync,readFileSync,writeFileSync} from 'node:fs';
mkdirSync('dist/server',{recursive:true});mkdirSync('dist/.openai',{recursive:true});
writeFileSync('dist/server/index.js',readFileSync('worker/algebra.js','utf8')+'\n'+readFileSync('worker/client.js','utf8')+'\n'+readFileSync('worker/practice.js','utf8')+'\n'+readFileSync('worker/index.js','utf8').replace(/^import \{(?:handlePractice|CLIENT_SCRIPT|verifyAlgebraQuestion)\} from '\.\/(?:practice|client|algebra)\.js';\r?\n/gm,''));copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built dist/server/index.js');
