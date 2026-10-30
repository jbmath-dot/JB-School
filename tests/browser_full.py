"""Offline inline-browser end-to-end for all seven local workflows (fake sample IDs only)."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
base=Path(__file__).parents[1]
html=(base/'index.html').read_text(encoding='utf-8')
for f in ['styles.css','modules.css']:
 html=html.replace(f'<link rel="stylesheet" href="src/{f}" />', '<style>'+(base/'src'/f).read_text(encoding='utf-8')+'</style>')
for f in ['core.js','modules-core.js','local-tools-core.js','modules-ui.js','app.js']:
 html=html.replace(f'<script src="src/{f}"></script>', '<script>'+(base/'src'/f).read_text(encoding='utf-8')+'</script>')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':900},accept_downloads=True)
 page.set_default_timeout(5000)
 page.on('dialog',lambda dialog:dialog.accept())
 errors=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto('about:blank')
 page.evaluate("""() => {window._mem={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window._mem[k]??null,setItem:(k,v)=>{window._mem[k]=v},removeItem:k=>{delete window._mem[k]}}})}""")
 page.set_content(html,wait_until='load')
 nav=lambda text:page.locator('.sidebar .nav-item',has_text=text).click()
 # meeting edit and export
 nav('회의·협의회')
 edit=page.locator('form[data-module-form="meeting-edit"]')
 edit.locator('[name="title"]').fill('가상 업무협의회 수정')
 edit.locator('[name="date"]').fill('2026-12-01')
 edit.locator('button[type="submit"]').click()
 assert '가상 업무협의회 수정' in page.locator('main').inner_text()
 with page.expect_download() as d:page.locator('[data-module-action="meetings:minutes"]').click()
 assert d.value.suggested_filename.endswith('.txt')
 # training edits
 nav('교직원 연수·참석')
 f=page.locator('form[data-module-form="training-edit"]')
 f.locator('[name="capacity"]').fill('5')
 f.locator('button[type="submit"]').click()
 assert '3 / 5명' in page.locator('main').inner_text()
 # create second grade book, score, change, restore
 nav('수행평가 채점·피드백')
 new=page.locator('form[data-module-form="grading-new"]')
 new.locator('[name="title"]').fill('가상 평가 B')
 new.locator('[name="criteria"]').fill('서술, 4\n설명, 6')
 new.locator('button[type="submit"]').click()
 bulk=page.locator('form[data-module-form="grading-bulk"]')
 bulk.locator('textarea[name="ids"]').fill('AAA-1\nAAA-2\nAAA-1')
 bulk.locator('button[type="submit"]').click()
 assert 'AAA-2' in page.locator('main').inner_text()
 page.locator('[data-module-action="grading:select:AAA-1"]').click()
 g=page.locator('form[data-module-form="grading-score"]')
 g.locator('[name="status"]').select_option('graded')
 g.locator('[name="score-0"]').fill('3.5')
 g.locator('[name="score-1"]').fill('5')
 g.locator('button[type="submit"]').click()
 assert '8.5 / 10점' in page.locator('main').inner_text()
 sw=page.locator('form[data-module-form="grading-switch"]')
 sw.locator('[name="book"]').select_option('default')
 sw.locator('button[type="submit"]').click()
 assert '가상 수학 서술형 평가' in page.locator('main').inner_text()
 # record import, analyze, mark reviewed
 nav('학기말 기록 검토')
 file=page.locator('#records-file')
 file.set_input_files({'name':'records.csv','mimeType':'text/csv','buffer':('id,기록\nA,"가상 문장으로 활동하였으며 협력하였음."\nB,"가상 문장으로 활동하였으며 협력하였음."').encode('utf-8')})
 assert '가상 문장으로' in page.locator('[name="text"]').input_value()
 page.locator('form[data-module-form="records-analyze"] button[type="submit"]').click()
 assert '동일 문장' in page.locator('main').inner_text()
 page.locator('[data-module-action="records:review:A"]').check()
 with page.expect_download() as d:page.locator('[data-module-action="records:csv"]').click()
 assert d.value.suggested_filename.endswith('.csv')
 # doc checklist
 nav('공문·제출서류 점검')
 page.locator('form[data-module-form="documents-check"] button[type="submit"]').click()
 assert '확인 불가' in page.locator('main').inner_text()
 # handover edit, export
 nav('업무 인수인계')
 f=page.locator('form[data-module-form="handover-edit"]')
 f.locator('[name="guide"]').fill('가상 인수인계 매뉴얼 새 버전')
 f.locator('button[type="submit"]').click()
 assert '가상 인수인계 매뉴얼 새 버전' in page.locator('main').inner_text()
 with page.expect_download() as d:page.locator('[data-module-action="handover:txt"]').click()
 assert d.value.suggested_filename.endswith('.txt')
 # save snapshot, modify and restore from integrated backup
 page.locator('.sidebar .nav-item',has_text='데모 데이터 관리').click()
 with page.expect_download() as d:page.locator('[data-action="backup-all"]').click()
 download=d.value
 backup=Path('/mnt/data/JB-School_v0.3_test_backup.json');download.save_as(str(backup))
 b=json.loads(backup.read_text(encoding='utf-8'))
 assert b['format']=='jb-school-local-backup'
 assert b['modules']['trainings'][0]['capacity']==5
 page.locator('[data-action="modules-reset"]').click()
 assert '전체 백업' in page.locator('main').inner_text()
 page.locator('#import-all').set_input_files(str(backup))
 page.locator('.sidebar .nav-item',has_text='교직원 연수·참석').click()
 assert '3 / 5명' in page.locator('main').inner_text()
 assert not errors,errors
 print('PASS extended browser workflows: meeting, training, multiple grading books, record import, document checks, handover, backup, restore')
 page.screenshot(path='/mnt/data/JB-School_v0.3_화면.png',full_page=True)
 browser.close()
