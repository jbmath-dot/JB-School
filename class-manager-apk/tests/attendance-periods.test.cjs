'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const html=fs.readFileSync(path.resolve(__dirname,'../app/src/main/assets/attendance.html'),'utf8');
const start=html.indexOf("const PERIODS=");
const end=html.indexOf("const LOCAL_KEY=",start);
assert.ok(start>0&&end>start,'period-selection logic exists in shipped HTML');
const logic=html.slice(start,end);
const clean=html.match(/^function cleanCell\(cell\)\{.+$/m)?.[0];
assert.ok(clean,'backward-compatible data sanitizer exists');
const getModel=Function("const statuses={unrecorded:'미입력',present:'출석',absence:'결석',late:'지각',early:'조퇴',missed:'결과'};\n"+
"const reasons={illness:'질병',recognized:'출석인정',unexcused:'미인정',other:'기타'};\n"+
"const $=()=>({value:''});\n"+logic+"\n"+clean+"\nreturn {PERIODS,automaticPeriods,normalizePeriods,cleanCell,DETAIL_CHOICES};");
const {PERIODS,automaticPeriods,normalizePeriods,cleanCell,DETAIL_CHOICES}=getModel();

test('all eight sessions are present and in NEIS-style order',()=>{
 assert.deepEqual(PERIODS,['조회','1교시','2교시','3교시','4교시','5교시','6교시','종례']);
});
test('absence covers the entire school day in one click',()=>{
 assert.deepEqual(automaticPeriods('absence','2교시'),PERIODS);
 assert.deepEqual(cleanCell({status:'absence',reason:'recognized',detailReason:'교외체험학습'}).periods,PERIODS);
});
test('late selecting last missed period fills all preceding sessions inclusively',()=>{
 for(let i=0;i<PERIODS.length;i++){
   assert.deepEqual(automaticPeriods('late',PERIODS[i]),PERIODS.slice(0,i+1));
 }
 assert.deepEqual(automaticPeriods('late','2교시'),['조회','1교시','2교시']);
});
test('early dismissal selecting first missed period fills remainder through homeroom',()=>{
 for(let i=0;i<PERIODS.length;i++){
   assert.deepEqual(automaticPeriods('early',PERIODS[i]),PERIODS.slice(i));
 }
});
test('missed lesson lets the user select arbitrary individual sessions',()=>{
 assert.deepEqual(automaticPeriods('missed','4교시'),['4교시']);
 assert.deepEqual(normalizePeriods(['3교시','조회','3교시','INVALID','1교시']),['조회','1교시','3교시']);
});
test('reason shortcuts contain all requested choices',()=>{
 assert.deepEqual(DETAIL_CHOICES.recognized,['감염병','생리','교외체험학습']);
 assert.deepEqual(DETAIL_CHOICES.illness,['감기','복통','두통','병원진료']);
});
test('saves reasons and normalized selections without changing original field names',()=>{
 const cell=cleanCell({status:'early',reason:'illness',periods:['종례','4교시','5교시'],detailReason:'복통',memo:'진료 예정',time:'13:20'});
 assert.equal(cell.status,'early');
 assert.equal(cell.reason,'illness');
 assert.deepEqual(cell.periods,['4교시','5교시','종례']);
 assert.equal(cell.detailReason,'복통');
 assert.equal(cell.memo,'진료 예정');
 assert.equal(cell.time,'13:20');
});
test('present or unrecorded has no missed periods or sensitive reason details',()=>{
 for(const status of ['present','unrecorded']){
   const c=cleanCell({status,reason:'illness',periods:['조회'],detailReason:'병원진료',time:'13:20',memo:'감기'});
   assert.deepEqual(c.periods,[]);
   assert.equal(c.detailReason,'');
   assert.equal(c.memo,'');
   assert.equal(c.time,'');
 }
});
test('unrecognized reason details cannot attach to unrelated status',()=>{
 const c=cleanCell({status:'late',reason:'unexcused',periods:['조회'],detailReason:'생리'});
 assert.equal(c.detailReason,'');
});
test('the shipped UI includes buttons, editor, daily export, and history support',()=>{
 for(const id of ['periodChips','periodHint','periodSummary','detailReasonChips','customReasonInput','editOverlay','dateInput','csvBtn','attendanceFile'])
   assert.ok(html.includes('id="'+id+'"'),'missing UI element '+id);
 assert.ok(html.includes('...PERIODS.map(p=>selected.includes(p)'), 'period marks exported in CSV');
 assert.ok(html.includes('periods,detailReason'), 'period selection included in stored JSON');
});
for(const scripts of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
 if(!scripts[1].trim())continue;
 test('all embedded JavaScript parses',()=>assert.doesNotThrow(()=>new Function(scripts[1])));
}
