const t=require('node:test'),a=require('node:assert/strict'),N=require('../timetable/neis.js');
t('detect weekdays and periods',()=>{const c=[...['월요일','화요일','수요일','목요일','금요일'].map((value,i)=>({row:3,col:i+1,value})),...Array.from({length:7},(_,i)=>({row:i+4,col:0,value:(i+1)+'교시'}))];a.equal(N.detectGrid(c).periodRows[7],10)});
t('reject invalid grids',()=>a.equal(N.detectGrid([{row:1,col:0,value:'월'}]),null));
t('reject mismatched weekly hours',()=>a.throws(()=>N.makeClassRows({lessons:[{classId:'1-1',count:3}]},{assigned:[{classId:'1-1',day:'월',period:1,block:1,subject:'수학'}],issues:[]},'1-1'),/시수/));
