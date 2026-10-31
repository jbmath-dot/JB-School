"""Verify app shell cache and offline navigation on localhost."""
from pathlib import Path
from threading import Thread
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright
base=Path(__file__).parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(base),**kwargs)
 def log_message(self,*_):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Quiet)
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/'
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  context=browser.new_context()
  page=context.new_page()
  page.goto(url,wait_until='load',timeout=7000)
  page.evaluate("() => navigator.serviceWorker.ready.then(()=>true)")
  page.wait_for_timeout(300)
  assert page.locator('h1').inner_text()=='학교 업무를 한눈에'
  context.set_offline(True)
  page.reload(wait_until='load',timeout=7000)
  assert page.locator('h1').inner_text()=='학교 업무를 한눈에'
  page.locator('.sidebar .nav-item',has_text='학기말 기록 검토').click()
  assert '기록 초안 입력' in page.locator('main').inner_text()
  print('PASS PWA cached app shell and offline reload')
  browser.close()
finally:server.shutdown()
