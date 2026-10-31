#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright
from urllib.parse import urljoin
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
import threading, json
root=Path(__file__).resolve().parent.parent
srv=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(root)))
threading.Thread(target=srv.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{srv.server_port}/'
results=[]; errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=browser.new_context(accept_downloads=True,viewport={'width':1366,'height':800});page=ctx.new_page()
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.on('dialog',lambda d:d.accept())
 page.set_content('<!doctype html><html lang="ko"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''() => {const data={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v)},removeItem:k=>delete data[k]}});Object.defineProperty(window,'scrollTo',{value:()=>{}})}''')
 for fname in ['src/styles.css','src/modules.css','src/extra.css']:page.add_style_tag(path=str(root/fname))
 for fname in ['src/core.js','src/modules-core.js','src/extra-core.js','src/local-tools-core.js','src/modules-ui.js','src/extra-ui.js','src/app.js']:page.add_script_tag(path=str(root/fname))
 page.wait_for_timeout(400)
 assert page.locator('nav button[data-nav]').count()==19, '17 tool + home + settings'
 page.screenshot(path='/mnt/data/JB-School_v0.4_17개_대시보드.png',full_page=True)
 ids=['proctor','items','awards','activities','seating','tutoring','calendar','contest','fieldtrip','workload']
 data={
 'proctor':{'date':'2026-11-16','period':'1','room':'가상 2-1','teacher':'T1','kind':'감독'},
 'items':{'number':'1','topic':'정수','kind':'5지선다','answer':'3','points':'5','difficulty':'중'},
 'awards':{'nominee':'가상 A','award':'교육장 표창','contribution':'수학 교육에 기여함.','status':'초안'},
 'activities':{'student':'가상 S','date':'2026-11-16','start':'09:00','end':'10:00','category':'창체','note':'활동'},
 'seating':{'student':'S1','group':'1','seat':'1'},
 'tutoring':{'student':'가상 S','date':'2026-11-16','topic':'기하','goal':'개념','status':'계획'},
 'calendar':{'title':'업무 마감','date':'2026-11-16','lead':'4','status':'예정'},
 'contest':{'event':'대회','student':'S1','judge':'J1','logic':'30','creativity':'35','delivery':'16'},
 'fieldtrip':{'title':'안전 점검','category':'안전','date':'2026-11-16','status':'미완료'},
 'workload':{'teacher':'T1','task':'가상 업무','category':'행정','hours':'4','weight':'2'}
 }
 for k in ids:
  page.locator(f'nav [data-nav="{k}"]').click()
  assert page.locator(f'form[data-extra-form="{k}:save"]').count()==1,k
  for field,val in data[k].items():
   page.locator(f'form[data-extra-form="{k}:save"] [name="{field}"]').fill(val) if page.locator(f'form[data-extra-form="{k}:save"] [name="{field}"]').evaluate('(el)=>el.tagName')!='SELECT' else page.locator(f'form[data-extra-form="{k}:save"] [name="{field}"]').select_option(val)
  page.locator(f'form[data-extra-form="{k}:save"] button[type=submit]').click()
  assert page.locator('.extra-result > section').first.locator('.extra-table tbody tr').count()==1, k
  with page.expect_download() as info:page.locator(f'[data-extra-action="{k}:export"]').click()
  dl=info.value
  assert dl.suggested_filename.endswith('.csv'),k
  page.locator(f'.extra-result > section').first.locator(f'.extra-table [data-extra-action^="{k}:edit"]').first.click()
  assert page.locator(f'form[data-extra-form="{k}:save"] input[name=editId]').input_value()!='',k
  page.locator(f'[data-extra-action="{k}:cancel"]').click()
  results.append(k+' CRUD CSV OK')
 page.locator('nav [data-nav="awards"]').click()
 with page.expect_download() as info:page.locator('[data-extra-action^="awards:draft:"]').first.click()
 assert info.value.suggested_filename.endswith('.txt')
 page.locator('nav [data-nav="seating"]').click()
 page.locator('form[data-extra-form="seating:auto"] button[type=submit]').click()
 assert page.locator('.extra-seat').count()==6
 page.locator('nav [data-nav="proctor"]').click()
 page.locator('form[data-extra-form="proctor:auto"] button[type=submit]').click()
 assert page.locator('.extra-result > section').first.locator('.extra-table tbody tr').count()==3
 page.locator('nav [data-nav="settings"]').click()
 with page.expect_download() as info:page.locator('[data-action="backup-all"]').click()
 dl=info.value; path=Path('/mnt/data/JB-School_v0.4_통합백업_가상.json');dl.save_as(path)
 backup=json.loads(path.read_text());assert backup['version']==2 and len(backup['extras']['modules'])==10
 page.locator('nav [data-nav="items"]').click()
 page.locator('[data-extra-action="items:clear"]').click()
 assert page.locator('.extra-result > section').first.locator('.extra-table tbody tr').count()==0
 page.locator('nav [data-nav="settings"]').click()
 page.locator('#import-all').set_input_files(str(path))
 page.wait_for_timeout(400)
 page.locator('nav [data-nav="items"]').click()
 assert page.locator('.extra-result > section').first.locator('.extra-table tbody tr').count()==1,'backup restoration failed'
 page.screenshot(path='/mnt/data/JB-School_v0.4_문항검토.png',full_page=True)
 results.append('17-app backup and restore OK')
 # Non-javascript offline scenario requires HTTP sw and cache
 results.append('browser DOM interaction OK; offline navigation not verified in restricted runtime')
 browser.close()
print(json.dumps({'checked':len(results),'results':results,'errors':errors},ensure_ascii=False,indent=2))
assert not errors,errors
srv.shutdown()
