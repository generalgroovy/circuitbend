import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../main.js',import.meta.url),'utf8');
function fixture(){
  const created=[],revoked=[],nodes=[],timers=new Map(),status={dataset:{}},cancel={};let timer=0;
  function element(tag){return{tagName:tag.toUpperCase(),naturalWidth:800,naturalHeight:600,videoWidth:1280,videoHeight:720,paused:false,pause(){this.paused=true},removeAttribute(){this.src=''},play(){this.paused=false;return Promise.resolve()},load(){},replaceWith(next){this.replaced=next}}}
  const oldVideo=element('video'),oldImage=element('img');
  const context=vm.createContext({URL:{createObjectURL(file){const url=`blob:${created.length}`;created.push(file);return url},revokeObjectURL(url){revoked.push(url)}},document:{createElement(tag){const node=element(tag);nodes.push(node);return node}},$:id=>id==='mediaStatus'?status:cancel,setTimeout(fn){timers.set(++timer,fn);return timer},clearTimeout(id){timers.delete(id)},window:{addEventListener(){}},placeholder:{style:{}},video:oldVideo,img:oldImage,media:'generated',inputMedia:'none',ready:true,playing:true,frame:12,sync(){},resize(){},drawOnce(){},loopStart(){}});
  vm.runInContext(source.slice(source.indexOf('let mediaObjectUrl='),source.indexOf('file.onchange=')),context);
  return{context,created,revoked,nodes,status,cancel,timers,oldVideo,oldImage,load(type='image/png',size=20){context.selected={type,size,name:'sample'};vm.runInContext('load(selected)',context)},state(){return vm.runInContext('({media,inputMedia,ready,playing,mediaObjectUrl,pending:!!pendingMedia})',context)}};
}
test('active image survives a pending replacement and a decode failure',()=>{
  const f=fixture();f.load();assert.equal(f.state().media,'generated');f.nodes[0].onload();assert.equal(f.state().media,'image');
  f.load('video/mp4');assert.equal(f.state().media,'image');assert.equal(f.state().ready,true);assert.deepEqual(f.revoked,[]);
  f.nodes[1].onerror();assert.equal(f.state().media,'image');assert.equal(f.state().mediaObjectUrl,'blob:0');assert.deepEqual(f.revoked,['blob:1']);assert.match(f.status.textContent,/current source is unchanged/);
});
test('only the latest decode commits; stale callbacks and cancel cannot replace media',()=>{
  const f=fixture();f.load();const stale=f.nodes[0].onload;f.load('video/mp4');stale();assert.equal(f.state().media,'generated');
  const cancelled=f.nodes[1].onloadeddata;f.cancel.onclick();cancelled();assert.equal(f.state().media,'generated');assert.deepEqual(f.revoked,['blob:0','blob:1']);assert.equal(f.timers.size,0);
});
test('successful image/video replacement releases exactly the previous source',()=>{
  const f=fixture();f.load();f.nodes[0].onload();f.load('video/mp4');f.nodes[1].onloadeddata();
  assert.equal(f.state().media,'video');assert.equal(f.state().playing,true);assert.equal(f.context.video,f.nodes[1]);assert.deepEqual(f.revoked,['blob:0']);assert.equal(f.nodes[0].src,'');assert.equal(f.timers.size,0);
});
test('unsupported, oversized, empty-dimension and timed-out imports preserve playback',()=>{
  const f=fixture();f.load('application/pdf');assert.equal(f.created.length,0);f.load('image/png',65*1024*1024);assert.equal(f.created.length,0);
  f.load();f.nodes[0].naturalWidth=0;f.nodes[0].onload();f.load();f.nodes[1].naturalWidth=9000;f.nodes[1].naturalHeight=9000;f.nodes[1].onload();f.load();[...f.timers.values()][0]();
  assert.equal(f.state().media,'generated');assert.equal(f.state().playing,true);assert.equal(f.state().ready,true);assert.deepEqual(f.revoked,['blob:0','blob:1','blob:2']);assert.equal(f.timers.size,0);
});
test('a rejected autoplay leaves loaded video usable and gives an action',async()=>{
  const f=fixture();f.load('video/mp4');f.nodes[0].play=()=>Promise.reject(new Error('blocked'));f.nodes[0].onloadeddata();await Promise.resolve();
  assert.equal(f.state().media,'video');assert.equal(f.state().ready,true);assert.equal(f.state().playing,false);assert.match(f.status.textContent,/Press Play/);
});
