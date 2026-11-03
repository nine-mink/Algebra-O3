function algebraGcd(a,b){a=a<0n?-a:a;while(b){const next=a%b;a=b;b=next;}return a||1n;}
function algebraValue(n=1n,d=1n,vars={}){if(d===0n)throw Error('Zero denominator');if(d<0n){n=-n;d=-d;}const g=algebraGcd(n,d);return{n:n/g,d:d/g,vars:n===0n?{}:Object.fromEntries(Object.entries(vars).filter(([,p])=>p!==0))};}
function algebraMultiply(a,b,divide=false){const vars={...a.vars};for(const [name,power] of Object.entries(b.vars))vars[name]=(vars[name]||0)+(divide?-power:power);return algebraValue(a.n*(divide?b.d:b.n),a.d*(divide?b.n:b.d),vars);}
function algebraPower(value,power){if(!Number.isInteger(power)||Math.abs(power)>2500)throw Error('Invalid exponent');const p=BigInt(Math.abs(power));return algebraValue((power<0?value.d:value.n)**p,(power<0?value.n:value.d)**p,Object.fromEntries(Object.entries(value.vars).map(([name,n])=>[name,n*power])));}
export function algebraParse(latex){
 const source=latex.replace(/\\(?:left|right)/g,'').replace(/\\(?:dfrac|tfrac|frac)/g,'@').replace(/\\(?:times|cdot)/g,'*').replace(/\\div/g,'/').replace(/\\[,!;: ]/g,'').replace(/\s/g,'');
 const tokens=source.match(/\d+(?:\.\d+)?|[a-zA-Z@{}()[\]*/^+\-]/g)||[];
 if(tokens.join('')!==source||!tokens.length)throw Error('Unsupported algebra notation');
 let at=0;
 function atom(){const token=tokens[at++];let value;
  if(token==='+'||token==='-'){value=atom();return token==='-'?algebraMultiply(algebraValue(-1n),value):value;}
  if(token==='@'){const numerator=atom(),denominator=atom();value=algebraMultiply(numerator,denominator,true);}
  else if(['(','{','['].includes(token)){value=product();const close={'(':')','{':'}','[':']'}[token];if(tokens[at++]!==close)throw Error('Unclosed algebra group');}
  else if(/^\d/.test(token||'')){const parts=token.split('.');value=algebraValue(BigInt(parts.join('')),10n**BigInt(parts[1]?.length||0));}
  else if(/^[a-zA-Z]$/.test(token||''))value=algebraValue(1n,1n,{[token]:1});
  else throw Error('Invalid algebra factor');
  if(tokens[at]==='^'){at++;let sign=1;if(tokens[at]==='+')at++;else if(tokens[at]==='-'){at++;sign=-1;}const exponent=atom();if(Object.keys(exponent.vars).length||exponent.d!==1n)throw Error('Invalid algebra exponent');value=algebraPower(value,sign*Number(exponent.n));}
  return value;
 }
 function product(){let result=atom();while(at<tokens.length&&![')',']','}'].includes(tokens[at])){const operator=tokens[at];if(operator==='*'||operator==='/'){at++;result=algebraMultiply(result,atom(),operator==='/');}else if(/^(?:@|\d|[a-zA-Z({\[])$/.test(operator)||/^\d/.test(operator))result=algebraMultiply(result,atom());else throw Error('Unsupported algebra operation');}return result;}
 const value=product();if(at!==tokens.length)throw Error('Unexpected algebra tokens');return value;
}
function algebraEqual(a,b){return a.n===b.n&&a.d===b.d&&JSON.stringify(Object.entries(a.vars).sort())===JSON.stringify(Object.entries(b.vars).sort());}
export function verifyAlgebraQuestion(question){
 const text=typeof question.question==='string'?question.question:question.question.en;
 const expressions=Array.from(text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g)).map(match=>match.slice(1).find(Boolean));
 const expression=expressions.find(value=>!/[=,]|\\(?:ne|neq|in)\b/.test(value));
 if(!expression)return false;
 const expected=algebraParse(expression);
 const options=question.options.map(option=>algebraParse(option.latex));
 const matches=options.map((value,i)=>algebraEqual(value,expected)?i:-1).filter(i=>i>=0);
 if(matches.length!==1||matches[0]!==question.correctIndex)throw Error('Algebra answer verification failed');
 for(let i=0;i<options.length;i++)for(let j=i+1;j<options.length;j++)if(algebraEqual(options[i],options[j]))throw Error('Equivalent algebra options');
 return true;
}
