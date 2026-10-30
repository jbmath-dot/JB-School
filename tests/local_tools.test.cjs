const test=require('node:test');
const assert=require('node:assert/strict');
globalThis.JBSchoolCore=require('../src/core.js');
globalThis.JBSchoolModulesCore=require('../src/modules-core.js');
const B=require('../src/local-tools-core.js');
const M=globalThis.JBSchoolModulesCore;
const R=globalThis.JBSchoolCore;
test('7개 앱 백업: 내보내기 · 검증 · 복원 가능 형식',()=>{
 const b=B.makeBundle(R.initialState(),M.initial());
 const parsed=B.parseBundle(JSON.stringify(b));
 assert.deepEqual(B.describeBundle(parsed),{campaigns:1,meetings:1,trainings:1,grading:3,handover:1});
 assert.equal(parsed.format,'jb-school-local-backup');
});
test('백업 거절: 지원하지 않는 스키마 · 손상 JSON · 과대 데이터',()=>{
 assert.throws(()=>B.parseBundle('{notjson'));
 assert.throws(()=>B.parseBundle('{}'),/JB School/);
 assert.throws(()=>B.parseBundle('x'.repeat(4*1024*1024+1)),/4MB/);
});
test('회의 수정/삭제: 안건, 장소, 참석자, 결정 사항',()=>{
 const s=M.initial(),m=s.meetings[0];M.updateMeeting(m,{title:'수정 회의',date:'2026-11-29',agenda:'안건 A\n안건 B',attendees:'교사 X',place:'가상 회의실'});
 assert.equal(m.agenda.length,2);assert.equal(m.attendees[0],'교사 X');
 const old=m.decisions.length;M.removeDecision(m,m.decisions[0].id);assert.equal(m.decisions.length,old-1);
 assert.match(B.printMinutes(m),/수정 회의/);
});
test('연수 수정: 증원 시 대기자 자동 승급, 무리한 감원 차단',()=>{
 const s=M.initial(),t=M.addTraining(s,{title:'연수',date:'2026-11-10',capacity:1});
 M.enroll(t,'T-1');M.enroll(t,'T-2');assert.equal(t.waiting.length,1);
 M.updateTraining(t,{title:'연수 재설정',date:'2026-11-11',capacity:2});
 assert.equal(t.registered.length,2);assert.equal(t.waiting.length,0);
 assert.throws(()=>M.updateTraining(t,{title:'감원',date:'2026-11-11',capacity:1}),/신청자 수/);
});
test('채점부 여러 개 생성/전환: 기존 채점 정보 보존',()=>{
 const s=M.initial();const old=s.grading.entries[0].scores.join(',');
 const id=M.createGradeBook(s,'2학기 논술형 평가','내용, 6\n과정, 4');
 assert.equal(s.grading.entries.length,0);M.addGradeId(s,'G-001');
 M.setGrade(s,'G-001','graded',['5','4'],'피드백');
 M.switchGradeBook(s,'default');assert.equal(s.grading.entries[0].scores.join(','),old);
 M.switchGradeBook(s,id);assert.equal(M.gradeTotal(s.grading.entries[0]),9);
 assert.equal(M.listGradeBooks(s).length,2);
 assert.equal(M.validateState(s),true);
});
test('인수인계 수정 및 단계 삭제',()=>{
 const s=M.initial(),d=s.handover[0];
 M.updateDuty(d,{title:'교무 업무',period:'11월',guide:'절차 업데이트'});
 assert.equal(d.title,'교무 업무');const id=d.tasks[0].id;M.removeDutyTask(d,id);
 assert.equal(d.tasks.find(x=>x.id===id),undefined);assert.match(B.printHandover(d),/절차 업데이트/);
});
test('익명 ID 중복 제거, CSV 이스케이프와 여러 줄 파싱',()=>{
 assert.deepEqual(B.parseIds('A,B\nC;B'),['A','B','C']);
 assert.equal(B.parseDelimited('id,text\r\nA,"hello, world"',' ,'.trim())[1][1],'hello, world');
 assert.match(B.makeCsv([['=1+1']]),/^\ufeff'=/);
});
test('서류 점검 리포트는 확인 불가를 통과로 처리하지 않음',()=>{
 const m={quantity:'2',price:'1000',total:'3000'},r=M.checkDocuments('purchase',['yes','no'],m);
 assert.match(M.documentReportCsv('purchase',r,m),/확인 불가/);
 assert.match(r.amountMessage,/일치하지 않음/);
});
