from pathlib import Path
from playwright.sync_api import sync_playwright
from zipfile import ZipFile
from xml.etree import ElementTree as ET
import json
base=Path(__file__).resolve().parents[1]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  context=browser.new_context(viewport={'width':1450,'height':920},accept_downloads=True)
  page=context.new_page();errs=[]
  page.on('pageerror',lambda x:errs.append(str(x)))
  page.on('dialog',lambda d:d.accept())
  page.set_content('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>')
  for css in ['src/styles.css','timetable/style.css']:page.add_style_tag(path=str(base/css))
  for src in ['vendor/jszip.min.js','timetable/core.js','timetable/io.js']:page.add_script_tag(path=str(base/src))
  page.evaluate("""() => {window.Worker=class { constructor(){this.onmessage=null;this.onerror=null;} postMessage(data){setTimeout(()=>this.onmessage({data:{ok:true,result:window.JBSchoolTimetableCore.solveVariants(data.input,data.options)}}),5);} terminate(){} };} """)
  page.add_script_tag(path=str(base/'timetable/app.js'))
  assert '시간표 자동편성' in page.locator('h1').inner_text()
  assert page.locator('#solve').is_enabled()
  page.locator('#solve').click()
  page.wait_for_function('document.querySelectorAll("[data-solution]").length >= 3',timeout=15000)
  assert page.locator('[data-solution]').count()>=3
  page.locator('[data-solution="1"]').click()
  page.locator('[data-tab="teacher"]').click()
  page.locator('#person').select_option('T-M')
  assert page.locator('.tt-schedule table').count()==1
  with page.expect_download() as d:page.locator('#xlsx-export').click()
  xlsx=Path('/mnt/data/JB-School_시간표_생성_검증.xlsx');d.value.save_as(xlsx)
  with ZipFile(xlsx) as zipfile:
   assert zipfile.testzip() is None
   wb=ET.fromstring(zipfile.read('xl/workbook.xml'))
   sheets=wb.findall('.//{*}sheet'); assert len(sheets)>=10,len(sheets)
  with page.expect_download() as d:page.locator('#json-export').click()
  project=Path('/mnt/data/JB-School_시간표_프로젝트_예제.json');d.value.save_as(project)
  parsed=json.loads(project.read_text());assert len(parsed['solutions'])>=3
  page.locator('#request-form [name="teacher"]').select_option('T-M')
  page.locator('#request-form [name="type"]').select_option('수업불가')
  page.locator('#request-form [name="day"]').select_option('화')
  page.locator('#request-form [name="period"]').fill('5')
  page.locator('#request-form button').click()
  assert page.locator('[data-solution]').count()==0
  page.locator('#json-import').set_input_files(str(project))
  page.wait_for_function('document.querySelectorAll("[data-solution]").length>=3',timeout=8000)
  page.screenshot(path='/mnt/data/JB-School_시간표_자동편성_미리보기.png',full_page=True)
  # Test original official template multi-sheet import
  page.locator('#school-file').set_input_files(str(base/'templates/시간표_교사요청_및_기초배정_표준양식.xlsx'))
  page.wait_for_timeout(500)
  assert not errs,errs
  assert page.locator('input#school-file').count()==1
  print('browser: interactive multi-solution, teacher schedules, XLSX, JSON, template upload passed')
  browser.close()
finally:pass
