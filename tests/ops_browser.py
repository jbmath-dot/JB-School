from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
 page=ctx.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('dialog',lambda d:d.accept())
 page.set_content('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>')
 page.evaluate('''() => {let data={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v)},removeItem:k=>delete data[k]}});Object.defineProperty(window,'scrollTo',{value:()=>{}})}''')
 for f in ['src/styles.css','src/modules.css','src/extra.css','src/ops.css']:page.add_style_tag(path=str(root/f))
 for f in ['src/core.js','src/modules-core.js','src/local-tools-core.js','src/modules-ui.js','src/extra-core.js','src/extra-ui.js','vendor/jszip.min.js','src/xlsx-reader.js','src/ops-core.js','src/ops-ui.js','src/app.js']:page.add_script_tag(path=str(root/f))
 assert page.locator('nav button[data-nav]').count()==27,page.locator('nav button[data-nav]').count()
 for key in ['budget','ops-documents','progress','cleaning','survey','evidence','booths']:
  page.locator(f'nav button[data-nav="{key}"]').click()
  k='documents' if key=='ops-documents' else key
  assert page.locator(f'form[data-ops-form="{k}:save"]').count()==1,key
  page.locator(f'[data-ops-action="{k}:sample"]').click()
  assert page.locator('.ops-scroll .extra-table tbody tr').count()>=1,key
  with page.expect_download() as d:page.locator(f'[data-ops-action="{k}:csv"]').click()
  assert d.value.suggested_filename.endswith('.csv')
  page.locator(f'[data-ops-action^="{k}:edit:"]').first.click()
  assert page.locator(f'form[data-ops-form="{k}:save"] [name="editId"]').input_value()
  page.locator(f'[data-ops-action="{k}:cancel"]').click()
 page.locator('nav button[data-nav="settings"]').click()
 with page.expect_download() as d:page.locator('[data-action="backup-all"]').click()
 path=Path('/mnt/data/JB-School_v0.5_testbackup.json');d.value.save_as(path)
 bundle=json.loads(path.read_text())
 assert bundle['version']==3 and len(bundle['ops']['modules'])==7
 page.screenshot(path='/mnt/data/JB-School_v0.5_24개_대시보드.png',full_page=True)
 assert not errors,errors
 print('24-app menu, 7 new CRUD/CSV, backup v3 OK')
 b.close()
