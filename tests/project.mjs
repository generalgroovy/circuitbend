import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../project.js',import.meta.url),'utf8');
function fixture(){
  const images=[],applied=[],errors=[],timers=new Map();let timer=0;
  const context=vm.createContext({VERSION:6,sourceRevision:0,pendingRestoreCleanup:null,Image:class{constructor(){images.push(this);this.naturalWidth=64;this.naturalHeight=48}removeAttribute(){this.src=''}},setTimeout(fn){timers.set(++timer,fn);return timer},clearTimeout(id){timers.delete(id)},applyProject:(...x)=>applied.push(x),mediaStatus:(...x)=>errors.push(x),beginSourceChange(){context.sourceRevision++;context.pendingRestoreCleanup?.();context.pendingRestoreCleanup=null;return context.sourceRevision}});
  vm.runInContext(source.slice(source.indexOf('  function restoreProject('),source.indexOf('  function applyProject(')),context);
  return{context,images,applied,errors,timers,restore(p){context.project=p;vm.runInContext('restoreProject(project)',context)},read(file){context.event={target:{files:[file],value:'selected'}};return vm.runInContext('loadProjectFile(event)',context)}};
}
const baked={format:'circuitbend-project',version:6,effects:{mix:.3},source:{kind:'baked',bakedPng:'data:image/png;base64,example'}};
test('baked project commits settings only after successful decode; failure keeps current state',()=>{
  const f=fixture();f.restore(baked);assert.equal(f.applied.length,0);f.images[0].onerror();assert.equal(f.applied.length,0);assert.match(f.errors[0][0],/settings are unchanged/);
  f.restore(baked);f.images[1].onload();assert.equal(f.applied.length,1);assert.equal(f.applied[0][0].effects.mix,.3);assert.equal(f.timers.size,0);
});
test('a later source choice cancels staged baked decode including already-queued callbacks',()=>{
  const f=fixture();f.restore(baked);const stale=f.images[0].onload;f.context.beginSourceChange();stale();assert.equal(f.applied.length,0);assert.equal(f.images[0].src,'');assert.equal(f.timers.size,0);
});
test('stale project file reads cannot override a newer file/source or emit stale errors',async()=>{
  const f=fixture();let finish,reject;const slow=f.read({text:()=>new Promise(resolve=>finish=resolve)});await f.read({text:async()=>JSON.stringify({format:'circuitbend-project',generator:{seed:'new'}})});finish(JSON.stringify(baked));await slow;assert.equal(f.applied.length,1);assert.equal(f.applied[0][0].generator.seed,'new');assert.equal(f.images.length,0);
  const failing=f.read({text:()=>new Promise((_,r)=>reject=r)});f.context.beginSourceChange();reject(Error('stale'));await failing;assert.equal(f.errors.length,0);
});
test('invalid or oversized baked project is rejected before any settings apply',()=>{
  const f=fixture();assert.throws(()=>f.restore({...baked,version:99}),/newer/);assert.throws(()=>f.restore({...baked,source:{kind:'baked',bakedPng:'https://example.com/picture.png'}}),/embedded PNG/);f.restore(baked);f.images[0].naturalWidth=20000;f.images[0].onload();assert.equal(f.applied.length,0);
});
