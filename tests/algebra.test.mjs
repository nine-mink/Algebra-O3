import test from 'node:test';
import assert from 'node:assert/strict';
import {algebraParse,verifyAlgebraQuestion} from '../worker/algebra.js';
const question=(expression,answers,index=0)=>({question:{en:'Simplify $'+expression+'$.'},options:answers.map(latex=>({latex})),correctIndex:index});
test('algebra verification covers products, division, powers and mixed expressions',()=>{
 for(const [expr,answer] of [['3x^2\\times4x^3','12x^5'],['\\frac{18x^7}{3x^2}','6x^5'],['(3x^2y^3)^4','81x^8y^{12}'],['\\frac{(2x^2y)^3}{4xy^2}','2x^5y'],['\\frac{6x^4y^3}{3x^2y}\\times\\frac{5xy^2}{10y^4}','x^3']])assert.equal(verifyAlgebraQuestion(question(expr,[answer,'7z','8z','9z'])),true);
});
test('rejects wrong answers, equivalent distractors and empty exponents',()=>{
 assert.throws(()=>verifyAlgebraQuestion(question('2x\\times3x',['5x','6x^2','7x','8x'])));
 assert.throws(()=>verifyAlgebraQuestion(question('2x\\times3x',['6x^2','3x^2\\times2','7x','8x'])));
 assert.throws(()=>verifyAlgebraQuestion(question('x^3',['\\frac{x^3}{y^{}}','7x','8x','9x'])));
});
test('supports exact fractions, negative coefficients and common LaTeX delimiters',()=>{
 const v=algebraParse('\\frac{-3}{2}x^2\\div(-3x)');assert.equal(v.n,1n);assert.equal(v.d,2n);assert.deepEqual(v.vars,{x:1});
 const q=question('4x^3\\times7x^2',['28x^5','7x','8x','9x']);q.question.en='Simplify \\(4x^3\\times7x^2\\).';assert.equal(verifyAlgebraQuestion(q),true);
});
