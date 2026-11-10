'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const page=fs.readFileSync(path.resolve(__dirname,'../app/src/main/assets/attendance.html'),'utf8');
function between(start,end){
 const a=page.indexOf(start),b=page.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'missing snippet '+start);
 return page.slice(a,b);
}
const usageSource=between('function schoolYearStart(date){','function getLayout(date=');
const usage=new Function(
  "function isValidDay(s){return /^\\d{4}-\\d{2}-\\d{2}$/.test(String(s))};"+
  usageSource+"return {schoolYearStart,fieldTripUsage};"
)();
const basis="const statuses={unrecorded:'미입력',present:'출석',absence:'결석',late:'지각',early:'조퇴',missed:'결과'};"+
  "const reasons={illness:'질병',recognized:'출석인정',unexcused:'미인정',other:'기타'};"+
  "const PERIODS=['조회','1교시','2교시','3교시','4교시','5교시','6교시','종례'];"+
  "function normalizePeriods(v){const set=new Set(Array.isArray(v)?v:[]);return PERIODS.filter(x=>set.has(x));}";
const clean=page.match(/^function cleanCell\(cell\)\{.+$/m)?.[0];assert.ok(clean);
const ops=between('function applyLocal(op){','function setStatus(');
function model(){
 return new Function(basis+
  "let db={attendance:{},layouts:[],history:[],closedDates:{}};"+
  "function isValidDay(s){return /^\\d{4}-\\d{2}-\\d{2}$/.test(String(s))}"+
  "function isDateClosed(d,data=db){return !!data.closedDates?.[d]}"+
  "function addAudit(data,type,date,count){data.history.push({type,date,count})}"+
  clean+ops+"return {get:()=>db,applyLocal};"
 )();
}
const cell=(detailReason='교외체험학습')=>({status:'absence',reason:'recognized',detailReason});
test('count only stored approved-absence external experience days for one student',()=>{
 const data={attendance:{
  '2025-02-25':{'4':cell()},
  '2026-03-01':{'4':cell()},
  '2026-05-12':{'4':cell('생리')},
  '2026-05-13':{'4':{status:'absence',reason:'illness',detailReason:'교외체험학습'}},
  '2026-06-15':{'4':cell(), '5':cell()},
  '2026-09-10':{'4':{status:'present',reason:'recognized',detailReason:'교외체험학습'}},
  '2026-11-11':{'4':cell()}
 }};
 const result=usage.fieldTripUsage(data,4,'2026-11-10');
 assert.equal(result.from,'2026-03-01');
 assert.equal(result.days,2);
 assert.deepEqual(result.dates,['2026-03-01','2026-06-15']);
 assert.equal(usage.fieldTripUsage(data,5,'2026-11-10').days,1);
});
test('academic year runs March to following February',()=>{
 assert.equal(usage.schoolYearStart('2026-11-10'),'2026-03-01');
 assert.equal(usage.schoolYearStart('2027-02-28'),'2026-03-01');
 assert.equal(usage.schoolYearStart('2027-03-01'),'2027-03-01');
 const data={attendance:{'2026-04-02':{'2':cell()},'2027-02-14':{'2':cell()},'2027-03-01':{'2':cell()}}};
 assert.deepEqual(usage.fieldTripUsage(data,2,'2027-02-15').dates,['2026-04-02','2027-02-14']);
 assert.deepEqual(usage.fieldTripUsage(data,2,'2027-03-01').dates,['2027-03-01']);
});
test('clearing one student and one day completely removes saved cell',()=>{
 const m=model();
 for(const [date,n] of [['2026-11-08',4],['2026-11-09',4],['2026-11-08',5]]){
  assert.equal(m.applyLocal({type:'set',date,student:n,cell:cell()}),true);
 }
 assert.equal(usage.fieldTripUsage(m.get(),4,'2026-11-10').days,2);
 assert.equal(m.applyLocal({type:'set',date:'2026-11-08',student:4,cell:{status:'unrecorded'}}),true);
 assert.equal(m.get().attendance['2026-11-08']['4'],undefined);
 assert.equal(m.get().attendance['2026-11-08']['5'].status,'absence');
 assert.equal(m.get().attendance['2026-11-09']['4'].status,'absence');
 assert.equal(usage.fieldTripUsage(m.get(),4,'2026-11-10').days,1);
});
test('when final student entry is cleared, the empty date disappears from records',()=>{
 const m=model();m.applyLocal({type:'set',date:'2026-11-01',student:1,cell:cell()});
 m.applyLocal({type:'set',date:'2026-11-01',student:1,cell:{status:'unrecorded'}});
 assert.equal(m.get().attendance['2026-11-01'],undefined);
});
test('a finalized date remains protected until it is reopened',()=>{
 const m=model();m.applyLocal({type:'set',date:'2026-11-02',student:3,cell:cell()});
 m.applyLocal({type:'finalize',date:'2026-11-02'});
 assert.equal(m.applyLocal({type:'set',date:'2026-11-02',student:3,cell:{status:'unrecorded'}}),false);
 assert.ok(m.get().attendance['2026-11-02']['3']);
 m.applyLocal({type:'reopen',date:'2026-11-02'});
 assert.equal(m.applyLocal({type:'set',date:'2026-11-02',student:3,cell:{status:'unrecorded'}}),true);
 assert.equal(m.get().attendance['2026-11-02'],undefined);
});
test('clear button requires existing entry and confirmation; app preserves other records',()=>{
 for(const token of ['id="fieldTripDays"','id="fieldTripDates"','id="fieldTripPending"','id="clearEdit"',"$('clearEdit').disabled=!cell","window.confirm(date+' · '+n+'번","cell:cleanCell({status:'unrecorded'})", "#clearEdit[hidden]{display:none!important}"])
  assert.ok(page.includes(token),'missing '+token);
});
test('embedded attendance JavaScript remains valid',()=>{
 for(const [,js] of page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
  if(js.trim())assert.doesNotThrow(()=>new Function(js));
 }
});
