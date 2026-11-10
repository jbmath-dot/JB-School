'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.resolve(__dirname, '../app/src/main/assets/attendance.html'), 'utf8');
const style = page.match(/<style>([\s\S]*?)<\/style>/)?.[1];
assert.ok(style, 'Attendance app must include the statistics stylesheet');

function ruleFor(className) {
  const start = style.indexOf('.' + className + '{');
  assert.notEqual(start, -1, 'CSS rule not found: ' + className);
  const end = style.indexOf('}', start);
  return style.slice(start, end + 1);
}

test('history list is scrollable within the phone viewport', () => {
  const rule = ruleFor('record-view');
  assert.match(rule, /display\s*:\s*flex/);
  assert.match(rule, /flex-direction\s*:\s*column/);
  assert.match(rule, /max-height\s*:/);
  assert.match(rule, /overflow-y\s*:\s*auto/);
});

test('each history group keeps its intrinsic height rather than collapsing', () => {
  const rule = ruleFor('record-group');
  assert.match(rule, /flex\s*:\s*0\s+0\s+auto/, 'Without flex: 0 0 auto, many groups shrink into blank thin strips on mobile');
  assert.match(rule, /min-width\s*:\s*0/);
});

test('student stats contain readable group, date, status, details and action', () => {
  assert.match(page, /section\.className='record-group'/);
  assert.match(page, /header\.textContent=\(mode==='student'/);
  assert.match(page, /item\.className='record-row'/);
  assert.match(page, /item\.append\(p,status,detail\)/);
  assert.match(page, /container\.append\(section\)/);
});

test('record rows remain legible and retain touch targets', () => {
  const rule = ruleFor('record-row');
  assert.match(rule, /min-height\s*:\s*47px/);
  assert.match(rule, /grid-template-columns\s*:/);
  assert.match(rule, /color\s*:\s*var\(--ui-text/);
});
