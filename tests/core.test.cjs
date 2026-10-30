const test=require('node:test');const assert=require('node:assert/strict');const c=require('../src/core.js');
test('기본 40명/3명 회신/37명 미회신',()=>{const s=c.stats(c.initialState().campaigns[0]);assert.deepEqual(s,{total:40,done:3,pending:37,rate:8});});
test('중복 응답은 수정으로 취급',()=>{const a=c.initialState().campaigns[0];c.submit(a,a.targets[0],'불참');assert.equal(a.submissions.length,3);assert.equal(a.submissions[0].revision,2);assert.equal(c.stats(a).pending,37);});
test('마감·보관은 응답 제한',()=>{const a=c.initialState().campaigns[0];c.setStatus(a,'closed');assert.throws(()=>c.submit(a,a.targets[3],'참석'));c.setStatus(a,'archived');assert.equal(a.status,'archived');});
test('대상자 중복 제거와 CSV 행 수',()=>{const a=c.initialState().campaigns[0];assert.deepEqual(c.normalizeTargets('가\n가\n나'),['가','나']);const csv=c.csv(a);assert.equal(csv.split('\r\n').length,41);assert.match(csv,/미회신/);});
test('새 요청과 검증',()=>{const d={title:'테스트',due:'2026-11-06',type:'참석 여부',question:{kind:'boolean',label:'참석?',options:[]},targetsRaw:'A\nB'};assert.equal(c.createCampaign(d).targets.length,2);assert.deepEqual(c.validateCampaign({...d,title:''}),['요청 제목을 입력하세요.']);});
test('백업 형식 확인',()=>{assert.equal(c.validateImport(c.initialState()),true);assert.throws(()=>c.validateImport({version:9,campaigns:[]}));});
test('CSV injection is not executed in spreadsheet apps',()=>{const data=c.initialState().campaigns[0];data.targets[0]='=1+1';const escaped=c.csv(data);assert.match(escaped,/'=1\+1/);});
