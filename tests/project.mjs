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

function appliedFixture(){
  const nodes=new Map();let focused='',scrolls=0,undos=0;
  const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,focus(){focused=id},scrollIntoView(){scrolls++}});return nodes.get(id)};
  const context=vm.createContext({VERSION:6,clone:value=>JSON.parse(JSON.stringify(value)),document:{querySelectorAll:()=>[]},$:node,
    video:{pause(){}},pushUndo(){undos++},stopAllSweeps(){},setFxMix:value=>{context.fxMix=value??1},clamp:(v,min,max)=>Math.max(min,Math.min(max,v)),
    defaults:{rgb:0},base:{rgb:1},s:{},groupEnabled:{Color:true},rate:{rgb:0},lfo:{rgb:{}},window:{},media:'image',inputMedia:'image',playing:false,missingProjectMedia:false,
    setProjectMediaRequirement(value){context.missingProjectMedia=value;node('projectMediaRecovery').hidden=!value},
    sourceCanvas:{width:64,height:48,toDataURL:()=>baked.source.bakedPng},sourceCtx:{drawImage(){}},placeholder:{style:{}},
    generateSource(){context.generatedWith=context.inputMedia},resize(){},drawOnce(){},loopStart(){},sync(){},mediaStatus(){}});
  for(const name of ['promptEl','seedEl','genMode','genEngine','genMotion','genW','genH','cellSize','genSpeed','fxSeed','master','macroA','macroB','bpm','quality'])context[name]={value:name==='genMotion'?'static':'100',options:['static','math','reference','pixel'].map(value=>({value}))};
  vm.runInContext(source.slice(source.indexOf('  const projectState='),source.indexOf('  function saveProject(')),context);
  vm.runInContext(source.slice(source.indexOf('  function setSelect('),source.indexOf('  function restoreProject(')),context);
  vm.runInContext(source.slice(source.indexOf('  function applyProject('),source.indexOf('  saveBtn.addEventListener')),context);
  return{context,node,focused:()=>focused,scrolls:()=>scrolls,undos:()=>undos,apply(project,image=null){context.project=project;context.image=image;vm.runInContext('applyProject(project,image)',context)},state:()=>vm.runInContext('projectState()',context)};
}

test('external project exposes media recovery, preserves settings and keeps dependency when resaved',()=>{
  const f=appliedFixture();
  f.apply({source:{kind:'external'},generator:{engine:'reference',seed:'saved'},effects:{mix:.35,base:{rgb:22}}});
  assert.equal(f.context.media,'generated');assert.equal(f.context.generatedWith,'none','old imported media must not masquerade as this project source');
  assert.equal(f.node('projectMediaRecovery').hidden,false);assert.equal(f.focused(),'reloadProjectMedia');assert.equal(f.scrolls(),1);
  assert.equal(f.context.base.rgb,22);assert.equal(f.context.fxMix,.35);assert.equal(f.context.seedEl.value,'saved');
  assert.equal(f.state().source.kind,'external');assert.equal(f.state().source.bakedPng,null);
  assert.equal(f.state().effects.mix,.35);assert.equal(f.undos(),1);
  f.context.setProjectMediaRequirement(false);assert.equal(f.state().source.kind,'generated');
});

test('generated, legacy and embedded project restoration clear obsolete media recovery',()=>{
  for(const kind of ['generated','legacy','baked']){
    const f=appliedFixture();f.context.setProjectMediaRequirement(true);
    const image=kind==='baked'?{naturalWidth:32,naturalHeight:24,removeAttribute(){}}:null;
    f.apply(kind==='legacy'?{}:{source:{kind}},image);
    assert.equal(f.node('projectMediaRecovery').hidden,true);assert.equal(f.context.missingProjectMedia,false);
    assert.equal(f.scrolls(),0);assert.equal(f.focused(),'');
    assert.equal(f.state().source.kind,kind==='baked'?'baked':'generated');
  }
});
