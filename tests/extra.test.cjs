const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/extra-core.js'),Local=require('../src/local-tools-core.js'),Old=require('../src/core.js'),Modules=require('../src/modules-core.js');
const valid={
 proctor:{date:'2026-11-16',period:'2',room:'가상-1',teacher:'T1',kind:'감독'},
 items:{number:'1',topic:'도형',kind:'5지선다',answer:'3',points:'5',difficulty:'중'},
 awards:{nominee:'가상A',award:'표창',period:'2024-2026',contribution:'예시 공적',status:'초안'},
 activities:{student:'S1',date:'2026-11-16',start:'09:00',end:'10:00',category:'창체',note:'예시'},
 seating:{student:'S1',group:'1',seat:'1',memo:''},
 tutoring:{student:'S1',date:'2026-11-16',topic:'도형',goal:'기본',status:'계획',note:''},
 calendar:{title:'예시 일정',date:'2026-11-16',lead:'7',owner:'가상',status:'예정'},
 contest:{event:'대회',student:'S1',judge:'J1',logic:'30',creativity:'30',delivery:'20'},
 fieldtrip:{title:'안전점검',category:'안전',date:'2026-11-16',owner:'가상',status:'미완료',note:''},
 workload:{teacher:'T1',task:'상담',category:'행정',hours:'10',weight:'2'}
};
test('10개 앱 각각 추가-수정-삭제 및 저장 형식 검증',()=>{const s=C.initial();assert.equal(C.keys.length,10);for(const k of C.keys){const r=C.add(s,k,valid[k]);assert.equal(s.modules[k].length,1);const updated=C.add(s,k,valid[k],r.id);assert.equal(updated.id,r.id);assert(C.exportCsv(s,k).includes(C.defs[k].heads[0]));C.remove(s,k,r.id);assert.equal(s.modules[k].length,0);}assert(C.normalize(s));});
test('비정상 날짜, 필수값, 범위 차단',()=>{assert.throws(()=>C.validate('proctor',{...valid.proctor,date:'2026-02-30'}),/날짜/);assert.throws(()=>C.validate('items',{...valid.items,answer:'6'}),/1~5/);assert.throws(()=>C.validate('activities',{...valid.activities,end:'09:00'}),/늦어야/);assert.throws(()=>C.validate('calendar',{...valid.calendar,lead:'400'}),/365/);assert.throws(()=>C.validate('contest',{...valid.contest,logic:'41'}),/최대/);assert.throws(()=>C.validate('workload',{...valid.workload,weight:'6'}),/가중치/);});
test('감독 동일 교시 중복 차단 및 공정 배정',()=>{const slot=[{date:'2026-11-16',period:'1',room:'A',kind:'감독'},{date:'2026-11-16',period:'1',room:'B',kind:'감독'},{date:'2026-11-16',period:'1',room:'C',kind:'감독'},{date:'2026-11-16',period:'2',room:'A',kind:'감독'}];const r=C.proctorAssign('T1\nT2','T1|2026-11-16|1',slot);assert.equal(r[0].teacher,'T2');assert.equal(r[1].teacher,'');assert.equal(r[2].teacher,'');assert.equal(r[3].teacher,'T1');const s=C.initial();C.add(s,'proctor',r[0]);assert.throws(()=>C.add(s,'proctor',{...r[0],room:'다른 반'}),/중복/);});
test('문항 배점·정답 분포와 중복 번호',()=>{const s=C.initial();C.add(s,'items',valid.items);assert.equal(C.checkItems(s.modules.items,5).sum,5);assert.equal(C.checkItems(s.modules.items,10).warnings.length,1);assert.throws(()=>C.add(s,'items',valid.items),/중복/);});
test('창체·봉사 시간 중복만 탐지',()=>{const a=valid.activities,b={...a,category:'봉사',start:'09:30',end:'10:30'};const s=C.initial();C.add(s,'activities',a);C.add(s,'activities',b);assert.equal(C.overlaps(s.modules.activities).length,1);assert.equal(C.overlaps([s.modules.activities[0],{...s.modules.activities[1],start:'10:00'}]).length,0);});
test('좌석 셔플 결정성 및 중복 학생 차단',()=>{const a=C.arrangeSeating('S1\nS2\nS3\nS4',2,2,'seed');const b=C.arrangeSeating('S1\nS2\nS3\nS4',2,2,'seed');assert.deepEqual(a.map(x=>x.student),b.map(x=>x.student));assert.equal(a.length,4);assert.equal(new Set(a.map(x=>x.group)).size,2);assert.throws(()=>C.arrangeSeating('S1\nS1',2,2,'seed'),/중복/);});
test('학사일정 준비일 계산 및 완료 제외',()=>{assert.equal(C.isoShift('2026-03-01',-1),'2026-02-28');const s=C.initial();C.add(s,'calendar',valid.calendar);assert.equal(C.summary('calendar',s.modules.calendar,{},'2026-11-12').stats[2][1],1);});
test('수학대회 다중 심사·공동 순위·중복 차단',()=>{const s=C.initial();C.add(s,'contest',valid.contest);C.add(s,'contest',{...valid.contest,judge:'J2'});C.add(s,'contest',{...valid.contest,student:'S2',judge:'J1'});const rank=C.contestRank(s.modules.contest);assert.equal(rank[0].rank,1);assert.equal(rank[1].rank,1);assert.equal(rank[0].avg,80);assert.throws(()=>C.add(s,'contest',valid.contest),/중복/);});
test('업무분장 가중 시간 비교',()=>{const s=C.initial();C.add(s,'workload',valid.workload);C.add(s,'workload',{...valid.workload,teacher:'T2',hours:'5'});const r=C.summary('workload',s.modules.workload);assert.equal(r.stats[2][1],10);});
test('수식 삽입 보호 CSV 및 공적조서 출력',()=>{const s=C.initial();C.add(s,'awards',{...valid.awards,contribution:'=HYPERLINK("x")'});assert(C.exportCsv(s,'awards').includes("'=HYPERLINK"));assert.match(C.awardDraft(s.modules.awards[0]),/공적 기간/);});
test('기존 v1 백업과 v2 통합 백업 모두 호환',()=>{const responses=Old.initialState(),modules=Modules.initial(),extras=C.initial();const v1=Local.makeBundle(responses,modules);assert.equal(Local.parseBundle(JSON.stringify(v1)).version,1);C.add(extras,'calendar',valid.calendar);const v2=Local.makeBundle(responses,modules,extras);const read=Local.parseBundle(JSON.stringify(v2));assert.equal(read.version,2);assert.equal(Local.describeBundle(read).extras,1);assert.deepEqual(read.extras.modules.calendar[0].date,'2026-11-16');});
test('추가 모듈 백업 오염 차단',()=>{const s=C.initial();s.modules.calendar=[{id:'x',title:'x'}];assert.throws(()=>C.normalize(s),/올바르지/);});
