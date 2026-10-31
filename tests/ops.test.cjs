const test=require('node:test');
const assert=require('node:assert/strict');
const Ops=require('../src/ops-core.js');
const Local=require('../src/local-tools-core.js');
const Extra=require('../src/extra-core.js');
const Modules=require('../src/modules-core.js');
const Core=require('../src/core.js');
test('new seven modules validate CRUD CSV report',()=>{
 const s=Ops.initial(); assert.equal(Ops.keys.length,7);
 const rows={
 budget:{project:'가상사업',date:'2026-11-01',kind:'배정',amount:'1000',memo:''},
 documents:{source:'mock.csv',row:'2',values:'["가상", "3"]'},
 progress:{gradeClass:'가상1-1',subject:'수학',semester:'1학기',unit:'도형',planned:'10',delivered:'6',lost:'1',note:''},
 cleaning:{date:'2026-11-01',student:'가상01',zone:'교실 앞',memo:''},
 survey:{survey:'가상설문',question:'선호?',option:'예',count:'8'},
 evidence:{date:'2026-11-01',activity:'가상대회',category:'행사',result:'가상결과',filename:'',status:'미확인'},
 booths:{event:'가상축제',booth:'부스A',date:'2026-11-01',kind:'발행',quantity:'10',unitPrice:'1000',memo:''}
 };
 for(const k of Ops.keys){const a=Ops.add(s,k,rows[k]);assert.equal(s.modules[k].length,1);assert.match(Ops.exportCsv(s,k),new RegExp(Ops.definitions[k].heads[0]));assert.ok(Ops.report(s,k).length>10);Ops.add(s,k,rows[k],a.id);Ops.remove(s,k,a.id);assert.equal(s.modules[k].length,0);}
 assert.ok(Ops.normalize(s));
});
test('budget aggregation and event coupon warnings',()=>{
 const s=Ops.initial();Ops.add(s,'budget',{project:'가상',date:'2026-11-01',kind:'배정',amount:'100000'});Ops.add(s,'budget',{project:'가상',date:'2026-11-01',kind:'집행',amount:'60000'});Ops.add(s,'budget',{project:'가상',date:'2026-11-01',kind:'지출예정',amount:'20000'});
 assert.equal(Ops.finance(s.modules.budget)[0].available,20000);
 Ops.add(s,'booths',{event:'축제',booth:'부스1',date:'2026-11-01',kind:'발행',quantity:'10',unitPrice:'1000'});
 Ops.add(s,'booths',{event:'축제',booth:'부스1',date:'2026-11-01',kind:'사용',quantity:'12',unitPrice:'1000'});
 assert.equal(Ops.booths(s.modules.booths)[0].remaining,-2);
});
test('v3 backup and v1/v2 backward compatibility',()=>{
 const old=Core.initialState(),modules=Modules.initial(),extra=Extra.initial(),ops=Ops.initial();
 const a=Local.makeBundle(old,modules); const b=Local.makeBundle(old,modules,extra);const c=Local.makeBundle(old,modules,extra,ops);
 assert.equal(a.version,1);assert.equal(b.version,2);assert.equal(c.version,3);
 assert.equal(Local.parseBundle(JSON.stringify(a)).version,1);assert.equal(Local.parseBundle(JSON.stringify(b)).version,2);assert.equal(Local.parseBundle(JSON.stringify(c)).version,3);
 c.ops.modules.budget.push({id:'x'});
 assert.throws(()=>Local.parseBundle(JSON.stringify(c)));
});
