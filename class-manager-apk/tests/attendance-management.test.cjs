'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../app/src/main/assets/attendance.html'),'utf8');
function between(a,b){let i=html.indexOf(a),j=html.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'missing '+a);return html.slice(i,j);}
const days=between('function isValidDay(s)','let db=');
const ops=between('function applyLocal(op)','function setStatus(');
const history=between('function historyRows(data','function escapeHtml(');
const clean=html.match(/^function cleanCell\(cell\)\{.+$/m)?.[0];assert.ok(clean);
const basis="const statuses={unrecorded:'미입력',present:'출석',absence:'결석',late:'지각',early:'조퇴',missed:'결과'};"+
"const reasons={illness:'질병',recognized:'출석인정',unexcused:'미인정',other:'기타'};"+
"const PERIODS=['조회','1교시','2교시','3교시','4교시','5교시','6교시','종례'];"+
"function normalizePeriods(v){const a=new Set(Array.isArray(v)?v:[]);return PERIODS.filter(x=>a.has(x));}";
const bag=new Map(),sessionStorage={getItem:k=>bag.get(k)||null,setItem:(k,v)=>bag.set(k,String(v)),removeItem:k=>bag.delete(k)};
function prefs(){
 return new Function('sessionStorage',"const DATE_SELECTION_KEY='jb-attendance-selected-date-session-v1';let db={closedDates:{}},autoToday=false,selectedDate='2026-11-03';"+
 days+";return {loadDatePreference,rememberSelectedDate,isValidDay,setAuto:v=>autoToday=v};")(sessionStorage);
}
function state(){
 return new Function(basis+"let db={attendance:{},history:[],layouts:[],closedDates:{}};"+
 "function isValidDay(s){return /^\\d{4}-\\d{2}-\\d{2}$/.test(String(s))}"+
 "function isDateClosed(d,data=db){return !!(data.closedDates&&data.closedDates[d])}"+
 "function addAudit(data,event,date,records){data.history.push({type:event,date,records})}"+
 clean+ops+"return {get:()=>db,set:v=>db=v,applyLocal};")();
}
const stats=new Function(basis+
"function isValidDay(s){return /^\\d{4}-\\d{2}-\\d{2}$/.test(String(s))}"+
"function isDateClosed(d,data){return !!(data.closedDates&&data.closedDates[d])}"+
history+"return {historyRows,sortHistoryRows,planBulkDelete};")();

test('selected past date survives iframe reload and fresh session defaults to today',()=>{
 const p=prefs();assert.equal(p.isValidDay('2026-02-30'),false);
 p.rememberSelectedDate();assert.equal(prefs().loadDatePreference().date,'2026-11-03');
 const q=prefs();q.setAuto(true);q.rememberSelectedDate();assert.equal(prefs().loadDatePreference(),null);
});
test('backdated save only affects selected date and retains periods',()=>{
 const m=state();m.applyLocal({type:'set',date:'2026-11-03',student:4,cell:{status:'absence',reason:'recognized',detailReason:'감염병'}});
 assert.equal(m.get().attendance['2026-11-03']['4'].detailReason,'감염병');
 assert.equal(m.get().attendance['2026-11-03']['4'].periods.length,8);
 assert.equal(m.get().attendance['2026-11-10'],undefined);
});
test('finalized date blocks editing and auto attendance; reopen permits changes',()=>{
 const m=state(),date='2026-11-03';
 m.applyLocal({type:'set',date,student:1,cell:{status:'present'}});
 assert.equal(m.applyLocal({type:'finalize',date}),true);
 assert.equal(m.applyLocal({type:'set',date,student:1,cell:{status:'absence'}}),false);
 assert.equal(m.applyLocal({type:'markRemaining',date,students:[2]}),false);
 assert.equal(m.get().attendance[date]['1'].status,'present');
 assert.equal(m.applyLocal({type:'reopen',date}),true);
 assert.equal(m.applyLocal({type:'set',date,student:1,cell:{status:'absence',reason:'illness'}}),true);
});
test('bulk delete range preserves layouts and protects finalized days unless opted in',()=>{
 const m=state(),layout={count:2,names:['가','나']};
 m.set({attendance:{'2026-10-02':{'1':{status:'present'}},'2026-11-03':{'2':{status:'absence'}},'2026-11-10':{'2':{status:'late'}}},closedDates:{'2026-10-02':{closedAt:'2026-10-02T17:00:00Z'}},history:[],layouts:[layout]});
 const p=stats.planBulkDelete(m.get(),'range','2026-11-10','2026-10-01','2026-11-04',false);
 assert.equal(p.records,1);assert.equal(p.closedExcluded,1);
 assert.deepEqual(p.dates,['2026-11-03']);
 m.applyLocal({type:'bulkDelete',dates:['2026-10-02','2026-11-03'],includeClosed:false});
 assert.ok(m.get().attendance['2026-10-02']);assert.equal(m.get().attendance['2026-11-03'],undefined);
 assert.ok(m.get().attendance['2026-11-10']);assert.equal(m.get().layouts[0],layout);
 m.applyLocal({type:'bulkDelete',dates:['2026-10-02'],includeClosed:true});
 assert.equal(m.get().attendance['2026-10-02'],undefined);
 assert.equal(m.get().closedDates['2026-10-02'],undefined);
});
test('history statistics show only attendance exceptions in numeric/date order',()=>{
 const data={attendance:{'2026-11-10':{'10':{status:'late'},'2':{status:'present'}},'2026-10-03':{'10':{status:'present'},'2':{status:'absence'}}}};
 const original=JSON.stringify(data);
 const rows=stats.historyRows(data,'',()=>({names:[]}));
 assert.deepEqual(stats.sortHistoryRows(rows,'student').map(x=>x.n+':'+x.date),
  ['2:2026-10-03','10:2026-11-10']);
 assert.deepEqual(stats.sortHistoryRows(rows,'date').map(x=>x.date+':'+x.n),
  ['2026-10-03:2','2026-11-10:10']);
 assert.equal(stats.historyRows(data,'2026-10',()=>null).length,1);
 assert.equal(JSON.stringify(data),original,'Filtering statistics must not change raw attendance');
 assert.equal(data.attendance['2026-10-03']['10'].status,'present','Full attendance history must remain stored');
});
test('all-present dates are omitted from the statistics list, without clearing records',()=>{
 const data={attendance:{'2026-11-09':{'1':{status:'present'},'2':{status:'present'}},'2026-11-10':{'1':{status:'absence',reason:'recognized',detailReason:'감염병'},'2':{status:'early',reason:'illness'}}}};
 const rows=stats.historyRows(data,'',()=>({names:['학생1','학생2']}));
 assert.deepEqual(rows.map(r=>r.status),['absence','early']);
 assert.equal(rows[0].reason,'recognized');
 assert.equal(rows[0].detailReason,'감염병');
 assert.equal(stats.historyRows(data,'2026-11',()=>null).length,2);
 assert.equal(data.attendance['2026-11-09']['1'].status,'present');
 assert.equal(Object.keys(data.attendance['2026-11-09']).length,2);
});
test('summary, monthly totals and backup remain independent of the history filtering',()=>{
 const monthly=between('function renderMonthly()', '/* 학생별/날짜별 통계용 특이 출결 행 모델.');
 assert.ok(monthly.includes('for(let n=1;n<=l.count;n++)'),'monthly table keeps the entire class roster');
 assert.ok(monthly.includes('counts.recognized++'),'recognized absences still counted');
 const render=between('function renderStats(l)', 'function renderBoard(l)');
 assert.ok(render.includes("['출석',s.present"),'daily summary still shows present count');
 const backup=between("function backupAll()", "function ");
 assert.ok(backup.includes("db")||backup.includes("attendance"),'raw attendance remains in backup');
});
test('date validation and UI controls, no missing or duplicate IDs',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length);
 for(const id of ['dateInput','dateWorkStatus','finalizeDate','reopenDate','bulkScope','bulkFrom','bulkTo','bulkIncludeClosed','bulkConfirmOverlay','bulkConfirmWord','bulkDelete','recordViewSelect','recordScopeSelect','recordTable'])assert.ok(ids.includes(id),'missing '+id);
 assert.ok(html.includes('editing={date:selectedDate,n,baseRev'));
 assert.ok(html.includes('const {date,n,baseRev:editingBaseRev}=editing'));
});
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())test('embedded JS parses',()=>assert.doesNotThrow(()=>new Function(m[1])));
