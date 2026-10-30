/* Local-only helpers. No network, no credentials, no implicit upload. */
(function(root){
'use strict';
const MAX_BACKUP_BYTES = 4 * 1024 * 1024;
const esc = v => {let s=String(v??'');if(/^\s*[=+@\-\t\r]/.test(s))s="'"+s;return /[,"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
function makeCsv(rows){return '\ufeff'+rows.map(row=>row.map(esc).join(',')).join('\r\n');}
function makeBundle(responses,modules){
 root.JBSchoolCore.validateImport(responses);
 root.JBSchoolModulesCore.validateState(modules);
 return {format:'jb-school-local-backup',version:1,exportedAt:new Date().toISOString(),responses,modules};
}
function parseBundle(raw){
 if(typeof raw!=='string'||new TextEncoder().encode(raw).length>MAX_BACKUP_BYTES)throw new Error('백업 용량이 4MB를 초과합니다.');
 let d;try{d=JSON.parse(raw);}catch(_){throw new Error('JSON 파일을 해석할 수 없습니다.');}
 if(!d||d.format!=='jb-school-local-backup'||d.version!==1)throw new Error('JB School 통합 백업 파일이 아닙니다.');
 root.JBSchoolCore.validateImport(d.responses);
 root.JBSchoolModulesCore.validateState(d.modules);
 return d;
}
function describeBundle(bundle){return {campaigns:bundle.responses.campaigns.length,meetings:bundle.modules.meetings.length,trainings:bundle.modules.trainings.length,grading:bundle.modules.grading.entries.length,handover:bundle.modules.handover.length};}
function parseDelimited(raw,delimiter='\t',max=300){
 if(typeof raw!=='string'||raw.length>300000)throw new Error('입력 파일이 너무 큽니다.');
 const result=[];let cur='',row=[],quoted=false;
 for(let i=0;i<raw.length;i++){
  const c=raw[i];
  if(c==='"') {if(quoted&&raw[i+1]==='"'){cur+='"';i++;}else if(cur===''||quoted)quoted=!quoted;else cur+='"';}
  else if(c===delimiter&&!quoted){row.push(cur);cur='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&raw[i+1]==='\n')i++;row.push(cur);if(row.some(v=>v.trim()))result.push(row);row=[];cur='';if(result.length>max)throw new Error(`최대 ${max}행을 처리할 수 있습니다.`);}
  else cur+=c;
 }
 if(quoted)throw new Error('닫히지 않은 따옴표가 있습니다.');
 row.push(cur);if(row.some(v=>v.trim()))result.push(row);
 if(result.length>max)throw new Error(`최대 ${max}행을 처리할 수 있습니다.`);
 return result;
}
function parseIds(raw){const ids=String(raw||'').split(/[\r\n,\t;]+/).map(x=>x.trim()).filter(Boolean);if(ids.length>500)throw new Error('한 번에 500개를 초과할 수 없습니다.');return [...new Set(ids)];}
function printMinutes(meeting){return [meeting.title,`일자: ${meeting.date}`,`장소: ${meeting.place||'미기재'}`,`참석 대상: ${meeting.attendees.join(', ')||'미기재'}`,'','[안건]',...meeting.agenda.map((x,i)=>`${i+1}. ${x}`),'','[회의록 초안]',meeting.minutes||'(기록 없음)','','[결정사항]',...meeting.decisions.map((d,i)=>`${i+1}. ${d.text} | 담당: ${d.owner||'미정'} | 기한: ${d.due||'미정'} | ${d.done?'완료':'미완료'}`),'','※ 공식 결재·서명·참석 확인은 별도로 진행'].join('\n');}
function printHandover(duty){return [duty.title,`업무 시기: ${duty.period||'미정'}`,'','[처리 매뉴얼]',duty.guide||'(기록 없음)','','[인계 목록]',...duty.tasks.map((t,i)=>`${i+1}. [${t.done?'완료':'미완료'}] ${t.label}`),'','※ 비밀번호·API 키·개인정보는 포함하지 마세요.'].join('\n');}
const api={MAX_BACKUP_BYTES,makeCsv,makeBundle,parseBundle,describeBundle,parseDelimited,parseIds,printMinutes,printHandover};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.JBSchoolLocalTools=api;
})(typeof globalThis!=='undefined'?globalThis:this);
