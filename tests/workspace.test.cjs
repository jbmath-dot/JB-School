const test=require('node:test');
const assert=require('node:assert/strict');
const W=require('../src/workspace.js');
test('24 original tools and optional timetable are present without ID duplication',()=>{
 const all=W.getCatalog();
 assert.equal(all.length,25);
 assert.equal(new Set(all.map(x=>x.id)).size,25);
 assert.equal(all.filter(x=>x.id!=='timetable').length,24);
});
test('every tool has a valid, interpretable development state',()=>{
 for(const x of W.getCatalog()){
  assert.ok(['완료','진행 중','확인 필요'].includes(x.stage));
  assert.ok(x.title.length>1 && x.detail.length>8);
 }
});
test('favorite settings remove invalid IDs and de-duplicate entries',()=>{
 assert.deepEqual(W.normalizePreferences({favorites:['seating','seating','bad','budget']}),{version:1,favorites:['seating','budget']});
 assert.deepEqual(W.normalizePreferences(null),{version:1,favorites:[]});
});
