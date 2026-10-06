import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../advanced.js',import.meta.url),'utf8');
function fixture({throws=false}={}){
  let callback,draws=0;const downloads=[],errors=[],revoked=[];
  const buffer=()=>({width:100,height:80,getContext:()=>({drawImage(){}})});
  const canvas=buffer();canvas.toBlob=fn=>{if(throws)throw Error('encode');callback=fn};
  const context=vm.createContext({ready:true,size:()=>[800,600],mediaStatus:(...x)=>errors.push(x),controlsAdv:{renderBudget:{value:'2'},exportFullBtn:{disabled:false}},s:{scale:.4,rgb:12},quality:{value:'.75'},frame:20,canvas,tmp:buffer(),fx:buffer(),echo:buffer(),document:{createElement:buffer},performance:{now:()=>500},draw(){draws++;context.canvas.width=800;context.canvas.height=600;context.frame++},sync(){},URL:{createObjectURL:()=> 'blob:out',revokeObjectURL:x=>revoked.push(x)},download:(...x)=>downloads.push(x),setTimeout:fn=>fn(),console:{warn(){}}});
  vm.runInContext(source.slice(source.indexOf('  let exporting='),source.indexOf('  controlsAdv.exportFullBtn?.addEventListener')),context);
  return{context,downloads,errors,revoked,run:()=>vm.runInContext('exportFullResolution()',context),finish:blob=>callback(blob),draws:()=>draws};
}
test('full export restores live buffers/settings before encoding resolves; later edits survive',async()=>{
  const f=fixture();const promise=f.run();assert.equal(f.context.s.scale,.4);assert.equal(f.context.quality.value,'.75');assert.equal(f.context.frame,20);assert.equal(f.context.canvas.width,100);
  f.context.s.scale=.65;f.context.quality.value='.5';await f.run();assert.equal(f.draws(),1);
  f.finish({});await promise;assert.equal(f.context.s.scale,.65);assert.equal(f.context.quality.value,'.5');assert.deepEqual(f.downloads,[['circuitbend-800x600.png','blob:out']]);assert.equal(f.context.controlsAdv.exportFullBtn.disabled,false);assert.deepEqual(f.revoked,['blob:out']);
});
test('null encoding and synchronous encode failure recover and permit another export',async()=>{
  for(const throws of [false,true]){const f=fixture({throws});const promise=f.run();if(!throws)f.finish(null);await promise;assert.equal(f.context.s.scale,.4);assert.equal(f.context.canvas.width,100);assert.equal(f.context.controlsAdv.exportFullBtn.disabled,false);assert.equal(f.downloads.length,0);assert.match(f.errors[0][0],/Export failed/)}
});
