importScripts('core.js');
self.onmessage=e=>{try{const result=self.JBSchoolTimetableCore.solveVariants(e.data.input,e.data.options);self.postMessage({ok:true,result});}catch(err){self.postMessage({ok:false,error:String(err?.message||err)});}};
