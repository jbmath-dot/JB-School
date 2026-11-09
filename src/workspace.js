/* JB School unified local workspace. No network requests or student-data uploads. */
(function(root){
'use strict';
const STORAGE_KEY='jb-school-workspace-prefs-v1';
const CATALOG=[
{id:'responses',title:'교직원 회신·취합',group:'소통·협의',stage:'진행 중',detail:'로컬 회신 등록·미회신 집계 가능. 교직원 간 공동 회신은 미구현',icon:'✉'},
{id:'meetings',title:'회의·협의회',group:'소통·협의',stage:'완료',detail:'로컬 회의록·결정사항·후속 작업 흐름 구현. 공식 결재는 별도',icon:'▤'},
{id:'training',title:'교직원 연수·참석',group:'소통·협의',stage:'완료',detail:'로컬 정원·대기·참석 관리 구현. 공식 이수 인정은 별도',icon:'▥'},
{id:'grading',title:'수행평가 채점·피드백',group:'수업·평가',stage:'확인 필요',detail:'가상 식별자 채점·루브릭 구현. 성적 규정·보안 확인 필요',icon:'∑'},
{id:'records',title:'학기말 기록 검토',group:'수업·평가',stage:'확인 필요',detail:'문장 중복·바이트 검사 지원. 공식 기재 적합성은 판단하지 않음',icon:'▧'},
{id:'documents',title:'공문·제출서류 점검',group:'학교 행정',stage:'확인 필요',detail:'수동 체크리스트·금액 검산 구현. 첨부문서 자동분석 미구현',icon:'▣'},
{id:'handover',title:'업무 인수인계',group:'학교 행정',stage:'진행 중',detail:'로컬 인계 목록·매뉴얼 구현. 인증·서명 절차 미구현',icon:'⇄'},
{id:'proctor',title:'시험 감독·대체수업 편성',group:'수업·평가',stage:'확인 필요',detail:'가상 감독 자동 배정 구현. 학교별 배정·동시수업 조건 검증 필요',icon:'◷'},
{id:'items',title:'수학 시험지·문항 검토',group:'수업·평가',stage:'진행 중',detail:'정답 분포·문항 합계 점검 구현. 출제 규정 검토 필요',icon:'✓'},
{id:'awards',title:'표창·공적조서 작성',group:'학교 행정',stage:'진행 중',detail:'공적조서 초안·검토 상태 구현. 공식 서식 일치 확인 필요',icon:'★'},
{id:'activities',title:'창체·봉사 기록 대조',group:'학생·학급',stage:'확인 필요',detail:'가상 활동시간 중복 감지. 실제 기재지침 충족 판정 아님',icon:'◈'},
{id:'seating',title:'학생 자리배치·모둠 편성',group:'학생·학급',stage:'완료',detail:'가상 ID 기반 무작위 좌석·모둠 배정 구현',icon:'▦'},
{id:'tutoring',title:'수학 클리닉·튜터링',group:'수업·평가',stage:'완료',detail:'로컬 회차·학습 목표·보충 필요 기록 구현',icon:'∫'},
{id:'calendar',title:'학사일정·마감 달력',group:'학교 행정',stage:'완료',detail:'기한·준비 시작일·마감 경과 집계 구현. 알림 발송은 미구현',icon:'▣'},
{id:'contest',title:'수학대회 운영·심사',group:'수업·평가',stage:'진행 중',detail:'심사점수·평균·공동 순위 산출. 대회별 운영 규정 검토 필요',icon:'◇'},
{id:'fieldtrip',title:'체험학습·현장학습 준비',group:'학생·학급',stage:'진행 중',detail:'안전·교통·안내 준비 체크리스트 구현. 공식 승인 절차 별도',icon:'↗'},
{id:'workload',title:'업무분장 분석·조정',group:'학교 행정',stage:'확인 필요',detail:'가중 업무시간 비교 가능. 실제 인사 판단·난이도 검증 필요',icon:'▥'},
{id:'budget',title:'학교 예산 집행·잔액',group:'예산·행사',stage:'진행 중',detail:'사업별 배정·집행·예정·가용액 계산. K-에듀파인 대조 필요',icon:'₩'},
{id:'ops-documents',title:'학교 문서·엑셀 일괄 처리',group:'학교 행정',stage:'진행 중',detail:'CSV·TSV·XLSX 로컬 취합 및 중복 검사. HWPX/PDF 미지원',icon:'▤'},
{id:'progress',title:'교과별 수업 시수·진도',group:'수업·평가',stage:'완료',detail:'계획·실시·결손 시수와 진도율 계산 구현',icon:'◫'},
{id:'cleaning',title:'학급 청소·당번 편성',group:'학생·학급',stage:'완료',detail:'가상 식별자 기반 당번 순환·중복 검사 구현',icon:'▦'},
{id:'survey',title:'설문 결과·통계 분석',group:'소통·협의',stage:'완료',detail:'응답 수·선택지 통계·비율 집계 구현. 통계적 유의성 검정 아님',icon:'▥'},
{id:'evidence',title:'교육활동 실적·증빙 정리',group:'학교 행정',stage:'진행 중',detail:'실적·증빙 파일명·검토 상태 관리. 실제 증빙 파일 자체는 미보관',icon:'▧'},
{id:'booths',title:'교내 행사 부스·쿠폰 운영',group:'예산·행사',stage:'진행 중',detail:'발행·사용·무효·잔여 쿠폰 정산 로컬 구현',icon:'◇'},
{id:'timetable',title:'전교사·전학급 시간표 자동편성',group:'별도 확장 도구',stage:'확인 필요',detail:'25번째 별도 앱. 복수 편성안·XLSX 출력 구현, 현장 제약 검증 필요',icon:'▦'}
];
const IDSET=new Set(CATALOG.map(x=>x.id));
const GROUPS=['전체',...new Set(CATALOG.map(x=>x.group))];
const STAGES=['전체','완료','진행 중','확인 필요'];
const defaults={version:1,favorites:[]};
function normalizePreferences(value){
  const raw=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const source=Array.isArray(raw.favorites)?raw.favorites:[];
  const favorites=[...new Set(source.filter(x=>typeof x==='string'&&IDSET.has(x)))];
  return {version:1,favorites};
}
function getCatalog(){return CATALOG.map(item=>({...item}));}
function runDemoChecks(){
 const results=[];
 function check(name,fn){try{const ok=fn();results.push({name,passed:ok===true,detail:ok===true?'통과':'검증 조건 불일치'});}catch(err){results.push({name,passed:false,detail:err.message||'오류'});}}
 const Base=root.JBSchoolCore,Modules=root.JBSchoolModulesCore,Extra=root.JBSchoolExtraCore,Ops=root.JBSchoolOpsCore,Local=root.JBSchoolLocalTools;
 check('도구 목록 24개 + 시간표 별도 1개',()=>CATALOG.length===25&&IDSET.size===25);
 check('회신 가상 데이터 검증',()=>{const s=Base.initialState();Base.validateImport(s);return Array.isArray(s.campaigns);});
 check('기본 6개 모듈 가상 데이터 검증',()=>{const s=Modules.initial();Modules.validateState(s);return !!s.grading;});
 check('신규 10개 모듈 가상 데이터 검증',()=>{const s=Extra.initial();Extra.normalize(s);return !!s.modules;});
 check('신규 7개 모듈 가상 데이터 검증',()=>{const s=Ops.initial();Ops.normalize(s);return !!s.modules;});
 check('가상 학생 좌석·모둠 배정',()=>Extra.arrangeSeating('가상-01,가상-02,가상-03,가상-04',2,2,'demo-2026').length===4);
 check('가상 학생 청소당번 순환',()=>Ops.rotateStudents('가상-01,가상-02','교실,복도','2026-11-09',2).length===4);
 check('통합 백업 파일 해석',()=>{const s={format:'jb-school-local-backup',version:3,exportedAt:'2026-11-09T00:00:00.000Z',responses:Base.initialState(),modules:Modules.initial(),extras:Extra.initial(),ops:Ops.initial(),workspace:normalizePreferences({favorites:['seating']})};return Local.parseBundle(JSON.stringify(s)).workspace.favorites[0]==='seating';});
 return results;
}
const API={getCatalog,normalizePreferences,runDemoChecks,storageKey:STORAGE_KEY};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
if(typeof document==='undefined')return;
let prefs;
try{prefs=normalizePreferences(JSON.parse(root.localStorage.getItem(STORAGE_KEY)||'{}'));}catch(_){prefs=normalizePreferences(defaults);}
let filterText='',sidebarText='',groupFilter='전체',stageFilter='전체',favoritesOnly=false,activeShell=null;
function getPreferences(){return normalizePreferences(prefs);}
function applyPreferences(p){prefs=normalizePreferences(p);savePreferences();refresh();}
function savePreferences(){try{root.localStorage.setItem(STORAGE_KEY,JSON.stringify(prefs));}catch(err){console.warn('JB School 즐겨찾기 저장 실패',err);}}
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function action(label,cls,attrs){const btn=node('button',cls,label);btn.type='button';for(const [k,v] of Object.entries(attrs||{}))btn.setAttribute(k,v);return btn;}
function statusBadge(stage){return node('span','jb-stage jb-stage-'+(stage==='완료'?'done':stage==='진행 중'?'progress':'review'),stage);}
function isFavorite(id){return prefs.favorites.includes(id);}
function toggleFavorite(id){if(!IDSET.has(id))return;prefs.favorites=isFavorite(id)?prefs.favorites.filter(x=>x!==id):[...prefs.favorites,id];savePreferences();refresh();}
function favoriteButton(id){
 const v=isFavorite(id);
 const btn=action(v?'★':'☆','jb-star'+(v?' is-active':''),{'data-jb-favorite':id,'aria-label':(v?'즐겨찾기 해제: ':'즐겨찾기에 추가: ')+(CATALOG.find(x=>x.id===id)?.title||id),'aria-pressed':String(v),'title':v?'즐겨찾기 해제':'즐겨찾기 추가'});
 return btn;
}
function makeCard(item){
 const card=node('article','jb-tool');
 const top=node('div','jb-tool-top');
 top.append(node('span','jb-tool-icon',item.icon),favoriteButton(item.id));
 const title=node('h3','',item.title),detail=node('p','',item.detail);
 const bottom=node('div','jb-tool-bottom');bottom.append(statusBadge(item.stage),action('열기','jb-open',{'data-nav':item.id}));
 card.append(top,title,detail,bottom);
 return card;
}
function renderGrid(){
 const grid=document.getElementById('jb-tool-grid'),count=document.getElementById('jb-tool-count');
 if(!grid)return;
 let list=CATALOG.filter(x=>(groupFilter==='전체'||x.group===groupFilter)&&(stageFilter==='전체'||x.stage===stageFilter)&&(!favoritesOnly||isFavorite(x.id))&&(!filterText||[x.title,x.group,x.detail].join(' ').toLocaleLowerCase('ko').includes(filterText.toLocaleLowerCase('ko'))));
 list.sort((a,b)=>Number(isFavorite(b.id))-Number(isFavorite(a.id))||CATALOG.indexOf(a)-CATALOG.indexOf(b));
 grid.replaceChildren(...list.map(makeCard));
 if(!list.length)grid.append(node('div','jb-empty','검색 조건에 맞는 도구가 없습니다. 검색어나 필터를 변경하세요.'));
 if(count)count.textContent=list.length+'개 표시 / 기본 24개 + 별도 시간표 1개';
 const toggle=document.getElementById('jb-only-favorites');if(toggle)toggle.setAttribute('aria-pressed',String(favoritesOnly));
}
function buildHome(page){
 const panel=node('section','jb-hub');panel.setAttribute('aria-label','통합 업무 도구 탐색');
 const hero=node('div','jb-hub-hero'),copy=node('div');
 copy.append(node('div','jb-kicker','JB SCHOOL · LOCAL WORKSPACE'),node('h2','','학교 업무를 하나의 공간에서'),node('p','','24개 기본 도구와 시간표 편성 도구를 검색하고 즐겨찾기로 관리하세요. 모든 작업은 현재 기기 중심입니다.'));
 const numbers=node('div','jb-hero-numbers');
 numbers.append(node('strong','','24'),node('span','','기본 업무 도구'),node('strong','','+1'),node('span','','시간표 확장 도구'));
 hero.append(copy,numbers);
 const panelControls=node('div','jb-hub-controls');
 const search=node('input','jb-search');search.type='search';search.id='jb-workspace-search';search.placeholder='도구 검색 · Ctrl+K';search.setAttribute('aria-label','통합 업무도구 검색');search.autocomplete='off';search.value=filterText;
 const group=node('select','jb-select');group.id='jb-group-filter';group.setAttribute('aria-label','업무 분야 필터');
 GROUPS.forEach(v=>{const o=node('option','',v);o.value=v;o.selected=groupFilter===v;group.append(o);});
 const stage=node('select','jb-select');stage.id='jb-stage-filter';stage.setAttribute('aria-label','개발 상태 필터');
 STAGES.forEach(v=>{const o=node('option','',v==='전체'?'모든 상태':v);o.value=v;o.selected=stageFilter===v;stage.append(o);});
 panelControls.append(search,group,stage,action('☆ 즐겨찾기만','jb-filter-button',{'id':'jb-only-favorites','aria-pressed':String(favoritesOnly)}));
 const heading=node('div','jb-catalog-head');heading.append(node('h3','','업무 도구'),node('span','', ''));
 heading.lastChild.id='jb-tool-count';
 const grid=node('div','jb-tool-grid');grid.id='jb-tool-grid';
 const checks=node('div','jb-checks');
 const checkCopy=node('div');checkCopy.append(node('strong','','가상 데이터 작동 점검'),node('p','','실제 데이터는 수정하지 않고 메모리의 가상 자료로 주요 계산과 백업 해석을 점검합니다.'));
 checks.append(checkCopy,action('점검 실행','jb-test-button',{'id':'jb-run-checks'}));
 const results=node('div','jb-check-results');results.id='jb-check-results';results.setAttribute('role','status');results.setAttribute('aria-live','polite');
 const warning=node('p','jb-hub-notice','상태의 “완료”는 로컬 기본 흐름의 구현만 뜻합니다. 개인정보 보호·학교 규정·실기기 검증까지 완료됐다는 의미는 아닙니다. 실제 학생·교직원 정보는 입력하지 마세요.');
 panel.append(hero,panelControls,heading,grid,checks,results,warning);
 const banner=page.querySelector('.banner');
 if(banner)banner.insertAdjacentElement('afterend',panel);else page.prepend(panel);
 const legacyTitle=[...page.querySelectorAll('.section-head')].find(x=>x.querySelector('h2')?.textContent==='업무 도구');
 if(legacyTitle){let n=legacyTitle;while(n&&!n.classList.contains('footer')){n.classList.add('jb-legacy-hidden');n=n.nextElementSibling;}}
 renderGrid();
}
function buildSidebar(shell){
 const sidebar=shell.querySelector('.sidebar'),nav=sidebar?.querySelector('nav');
 if(!nav)return;
 const search=node('input','jb-side-search');search.type='search';search.id='jb-side-search';search.autocomplete='off';search.placeholder='업무도구 검색  Ctrl+K';search.setAttribute('aria-label','사이드바 업무도구 검색');search.value=sidebarText;
 nav.parentNode.insertBefore(search,nav);
 const favoriteBox=node('div','jb-side-favorites');favoriteBox.id='jb-side-favorites';nav.parentNode.insertBefore(favoriteBox,nav);
 for(const b of [...nav.querySelectorAll('button[data-nav]')]){
  const item=CATALOG.find(x=>x.id===b.dataset.nav);if(!item)continue;
  const wrap=node('div','jb-nav-row');b.parentNode.insertBefore(wrap,b);wrap.append(b,favoriteButton(item.id));wrap.dataset.jbId=item.id;
  const status=node('span','jb-nav-stage',item.stage==='완료'?'완료':item.stage==='진행 중'?'진행':'확인');
  status.setAttribute('title','개발 상태: '+item.stage);b.append(status);
 }
 refreshSidebar();
}
function refreshSidebar(){
 const nav=document.querySelector('.sidebar nav'),box=document.getElementById('jb-side-favorites');if(!nav||!box)return;
 const favs=CATALOG.filter(x=>isFavorite(x.id));
 box.replaceChildren(node('strong','','즐겨찾기'),...(favs.length?favs.map(x=>action('★ '+x.title,'jb-fav-jump',{'data-nav':x.id})): [node('small','','도구의 ☆ 버튼을 눌러 고정하세요.')]));
 const term=sidebarText.toLocaleLowerCase('ko');
 for(const r of nav.querySelectorAll('.jb-nav-row')){
  const entry=CATALOG.find(x=>x.id===r.dataset.jbId);
  r.hidden=Boolean(term)&&!([entry.title,entry.group,entry.detail].join(' ').toLocaleLowerCase('ko').includes(term));
 }
 let last=null,hasVisible=false;
 for(const el of nav.children){
  if(el.classList.contains('nav-group')){if(last)last.hidden=!hasVisible;last=el;hasVisible=false;}
  if(el.classList.contains('jb-nav-row')&&!el.hidden)hasVisible=true;
 }
 if(last)last.hidden=!hasVisible;
}
function buildDetail(shell){
 const nav=sidebarCurrentId(shell);if(!nav||!IDSET.has(nav))return;
 const item=CATALOG.find(x=>x.id===nav),page=shell.querySelector('.page'),header=page?.querySelector('.page-header');if(!header)return;
 const strip=node('div','jb-page-tools');
 const summary=node('div','jb-page-summary');summary.append(statusBadge(item.stage),node('span','',item.detail));
 strip.append(summary,favoriteButton(item.id));
 header.insertAdjacentElement('afterend',strip);
}
function sidebarCurrentId(shell){
 const current=shell.querySelector('.sidebar [data-nav][aria-current="page"]')?.dataset.nav;
 return current||null;
}
function enhance(){
 const shell=document.querySelector('#app > .app-shell');if(!shell||shell===activeShell)return;
 activeShell=shell;
 buildSidebar(shell);
 const page=shell.querySelector('.page');if(!page)return;
 if(sidebarCurrentId(shell)==='home')buildHome(page);else buildDetail(shell);
}
function refresh(){
 refreshSidebar();renderGrid();
 for(const btn of document.querySelectorAll('.jb-star')){
  const id=btn.dataset.jbFavorite;if(!id)continue;const replacement=favoriteButton(id);btn.replaceWith(replacement);
 }
}
function showChecks(){
 const holder=document.getElementById('jb-check-results');if(!holder)return;
 const items=runDemoChecks();
 const passed=items.filter(x=>x.passed).length;
 holder.replaceChildren(node('strong','',passed+'/'+items.length+'개 점검 통과 (가상 데이터)'));
 const list=node('ul','jb-check-list');
 for(const item of items)list.append(node('li',item.passed?'jb-pass':'jb-fail',(item.passed?'✓ ':'! ')+item.name+(item.passed?'':' — '+item.detail)));
 holder.append(list);
}
const app=document.getElementById('app');
if(app){
 app.addEventListener('click',function(e){
  const fav=e.target.closest('[data-jb-favorite]');if(fav){e.preventDefault();e.stopImmediatePropagation();toggleFavorite(fav.dataset.jbFavorite);return;}
  const only=e.target.closest('#jb-only-favorites');if(only){e.preventDefault();e.stopImmediatePropagation();favoritesOnly=!favoritesOnly;renderGrid();return;}
  const check=e.target.closest('#jb-run-checks');if(check){e.preventDefault();e.stopImmediatePropagation();showChecks();}
 },true);
 app.addEventListener('input',function(e){
  if(e.target.id==='jb-workspace-search'){filterText=e.target.value;renderGrid();}
  if(e.target.id==='jb-side-search'){sidebarText=e.target.value;refreshSidebar();}
 },true);
 app.addEventListener('change',function(e){
  if(e.target.id==='jb-group-filter'){groupFilter=e.target.value;renderGrid();}
  if(e.target.id==='jb-stage-filter'){stageFilter=e.target.value;renderGrid();}
 },true);
 document.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
   e.preventDefault();
   const target=document.getElementById('jb-workspace-search')||document.getElementById('jb-side-search');target?.focus();target?.select();
  }
 });
 new MutationObserver(enhance).observe(app,{childList:true});
 enhance();
}
root.JBSchoolWorkspace={...API,getPreferences,applyPreferences};
})(typeof globalThis!=='undefined'?globalThis:this);
