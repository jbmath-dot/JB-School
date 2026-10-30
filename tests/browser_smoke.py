"""Run Chromium with scripts/CSS inlined (sandbox blocks direct file:// access)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
base=Path(__file__).parents[1]
html=(base/'index.html').read_text()
html=html.replace('<link rel="stylesheet" href="src/styles.css" />','<style>'+ (base/'src/styles.css').read_text()+'</style>')
html=html.replace('<link rel="stylesheet" href="src/modules.css" />','<style>'+ (base/'src/modules.css').read_text()+'</style>')
for s in ['core.js','modules-core.js','local-tools-core.js','modules-ui.js','app.js']:
 html=html.replace(f'<script src="src/{s}"></script>', '<script>'+ (base/'src'/s).read_text()+'</script>')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1366,'height':900},accept_downloads=True)
 page.set_default_timeout(3000)
 page.add_init_script('''Object.defineProperty(window, 'localStorage', { configurable:true, value:(()=>{let s={};return {getItem:k=>s[k]||null,setItem:(k,v)=>{s[k]=v},removeItem:k=>delete s[k]};})() });''')
 errors=[]
 page.on('pageerror',lambda err: errors.append(str(err)))
 page.goto('about:blank')
 page.evaluate('''() => {Object.defineProperty(window, 'localStorage', { configurable:true, value:(()=>{let s={};return {getItem:k=>s[k]||null,setItem:(k,v)=>{s[k]=v},removeItem:k=>delete s[k]};})() });}''')
 page.set_content(html,wait_until='load')
 assert page.locator('h1').inner_text()=='학교 업무를 한눈에'
 cases={
  '회의·협의회':'회의 상세',
  '교직원 연수·참석':'신청·참석 관리',
  '수행평가 채점·피드백':'익명 채점 대상',
  '학기말 기록 검토':'기록 초안 입력',
  '공문·제출서류 점검':'점검 항목 입력',
  '업무 인수인계':'업무 매뉴얼 목록',
 }
 for nav,expected in cases.items():
  page.locator('.sidebar .nav-item',has_text=nav).click()
  assert expected in page.locator('main').inner_text(), (nav, page.locator('main').inner_text()[:500])
  print('PASS navigation', nav)
 # meeting creation and decision toggle
 page.locator('.sidebar .nav-item',has_text='회의·협의회').click()
 form=page.locator('form[data-module-form="meeting-create"]')
 form.locator('[name="title"]').fill('새 가상 회의')
 form.locator('[name="date"]').fill('2026-11-20')
 form.locator('[name="agenda"]').fill('가상 안건1\n가상 안건2')
 form.locator('button[type="submit"]').click()
 assert '새 가상 회의' in page.locator('main').inner_text(), (page.locator('.toast').all_inner_texts(),errors)
 form=page.locator('form[data-module-form="meeting-decision"]')
 form.locator('[name="text"]').fill('가상 업무 배정')
 form.locator('button[type="submit"]').click()
 assert '가상 업무 배정' in page.locator('main').inner_text()
 print('PASS meeting create+decision')
 # training
 page.locator('.sidebar .nav-item',has_text='교직원 연수·참석').click()
 print('STEP training view'); tform=page.locator('form[data-module-form="training-create"]')
 tform.locator('[name="title"]').fill('새 가상 연수')
 tform.locator('[name="date"]').fill('2026-11-20')
 tform.locator('[name="capacity"]').fill('1')
 tform.locator('button[type="submit"]').click(); print('STEP training saved', page.locator('.toast').all_inner_texts())
 eform=page.locator('form[data-module-form="training-enroll"]')
 eform.locator('[name="name"]').fill('가상 교직원 1')
 eform.locator('button[type="submit"]').click(); print('STEP registered',page.locator('.toast').all_inner_texts())
 eform=page.locator('form[data-module-form="training-enroll"]')
 eform.locator('[name="name"]').fill('가상 교직원 2')
 eform.locator('button[type="submit"]').click(); print('STEP registered',page.locator('.toast').all_inner_texts())
 assert '대기 1명' in page.locator('main').inner_text()
 print('PASS training enrollment+waitlist')
 # grading
 page.locator('.sidebar .nav-item',has_text='수행평가 채점·피드백').click()
 page.locator('[data-module-action="grading:select:STU-002"]').click()
 gform=page.locator('form[data-module-form="grading-score"]')
 gform.locator('[name="status"]').select_option('graded')
 for i,n in enumerate([3,4,5]): gform.locator(f'[name="score-{i}"]').fill(str(n))
 gform.locator('button[type="submit"]').click()
 assert '12 / 15점' in page.locator('main').inner_text()
 print('PASS grading score')
 # record analysis
 page.locator('.sidebar .nav-item',has_text='학기말 기록 검토').click()
 rform=page.locator('form[data-module-form="records-analyze"]')
 rform.locator('[name="text"]').fill('A\t가나다라 많은 활동을 수행하였으며 협력하였음.\nB\t가나다라 많은 활동을 수행하였으며 협력하였음.')
 rform.locator('button[type="submit"]').click()
 assert '동일 문장' in page.locator('main').inner_text()
 print('PASS records duplicate detection')
 # documents
 page.locator('.sidebar .nav-item',has_text='공문·제출서류 점검').click()
 dform=page.locator('form[data-module-form="documents-check"]')
 dform.locator('[name="quantity"]').fill('3')
 dform.locator('[name="price"]').fill('1000')
 dform.locator('[name="total"]').fill('3000')
 dform.locator('button[type="submit"]').click()
 assert '금액' in page.locator('main').inner_text()
 print('PASS document checklist')
 # handover
 page.locator('.sidebar .nav-item',has_text='업무 인수인계').click()
 hform=page.locator('form[data-module-form="handover-create"]')
 hform.locator('[name="title"]').fill('가상 학기초 업무')
 hform.locator('[name="tasks"]').fill('첫 단계\n두번째 단계')
 hform.locator('button[type="submit"]').click()
 assert '가상 학기초 업무' in page.locator('main').inner_text()
 print('PASS handover create')
 assert not errors, errors
 page.screenshot(path='/mnt/data/JB-School_v0.2_preview.png',full_page=True)
 print('PASS browser: no JS exceptions')
 browser.close()
