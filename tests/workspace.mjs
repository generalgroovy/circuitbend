import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../streamlined.js',import.meta.url),'utf8');
const extract=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end));

test('quick select sends one change while range proxies retain input plus change',()=>{
  const context=vm.createContext({syncing:false,fire(node,type){node.events.push(type);},updateSummary(){}});
  vm.runInContext(extract('  function wireProxy(','  function buildQuickControls('),context);
  for(const [tag,type,event,expected] of [['SELECT','select-one','change',['change']],['INPUT','range','input',['input','change']]]){
    const proxy={value:'new',addEventListener(k,f){this[k]=f;}},source={tagName:tag,type,events:[],addEventListener(){}};
    context.proxy=proxy;context.source=source;
    vm.runInContext(`wireProxy(proxy,source,'${event}')`,context);
    proxy[event]();
    assert.equal(source.value,'new');
    assert.deepEqual(source.events,expected);
  }
});

test('closing More restores focus to its visible summary',()=>{
  let focused=0;
  const menu={open:true,querySelector:()=>({focus(){focused++;}})};
  const context=vm.createContext({byId:()=>menu});
  vm.runInContext(extract('  function closeMoreMenu(','  function moveSecondaryActions('),context);
  vm.runInContext('closeMoreMenu()',context);
  assert.equal(menu.open,false);assert.equal(focused,1);
  vm.runInContext('closeMoreMenu()',context);assert.equal(focused,1);
});

test('Escape is consumed only when it closes More',()=>{
  let handler,prevented=0;
  const menu={open:true,querySelector:()=>({focus(){}})};
  const context=vm.createContext({byId:()=>menu,document:{addEventListener(_,fn){handler=fn;}}});
  vm.runInContext(extract('  function closeMoreMenu(','  function moveSecondaryActions('),context);
  vm.runInContext(extract('  function bindKeyboard(','  function bind('),context);
  vm.runInContext('bindKeyboard()',context);
  const event={key:'Escape',target:{tagName:'SUMMARY'},preventDefault(){prevented++;}};
  handler(event);
  assert.equal(menu.open,false);assert.equal(prevented,1);
  handler(event);
  assert.equal(prevented,1);
});

test('Space activates focused controls normally and still toggles background playback',()=>{
  const main=readFileSync(new URL('../main.js',import.meta.url),'utf8');
  const line=main.split('\n').find(line=>line.startsWith("window.addEventListener('keydown'"));
  let handler,plays=0;
  const document={activeElement:{tagName:'BUTTON'}};
  vm.runInNewContext(line,{document,window:{addEventListener(_,fn){handler=fn;}},$:()=>({click(){plays++;}})});
  handler({code:'Space',key:' ',preventDefault(){throw Error('Button activation intercepted');}});
  assert.equal(plays,0);
  document.activeElement={tagName:'BODY'};
  handler({code:'KeyS',key:'s',ctrlKey:true,preventDefault(){throw Error('Browser shortcut intercepted');}});
  assert.equal(plays,0);
  handler({code:'Space',key:' ',preventDefault(){}});
  assert.equal(plays,1);
});

test('original comparison bypasses effects without changing stored settings or render scale',()=>{
  const main=readFileSync(new URL('../main.js',import.meta.url),'utf8');
  const context=vm.createContext({previewOriginal:true,defaults:{scale:0.72,rgb:0,noise:0},keyGroup:{scale:'Render',rgb:'Channel / glitch',noise:'Channel / glitch'},groupEnabled:{Render:true,'Channel / glitch':true},live:{scale:.5,rgb:30,noise:50}});
  vm.runInContext(main.slice(main.indexOf('function effectiveState('),main.indexOf('let mediaObjectUrl')),context);
  assert.equal(vm.runInContext('effectiveState(live).rgb',context),0);
  assert.equal(vm.runInContext('effectiveState(live).scale',context),.5);
  assert.equal(context.live.rgb,30);
  context.previewOriginal=false;
  assert.equal(vm.runInContext('effectiveState(live).rgb',context),30);
  context.groupEnabled['Channel / glitch']=false;
  assert.equal(vm.runInContext('effectiveState(live).rgb',context),0);
});


test('FX mix gesture has one undo, preserves precise endpoints, and old snapshots default to full mix',()=>{
  const main=readFileSync(new URL('../main.js',import.meta.url),'utf8');
  const mix={value:'100',events:{},addEventListener(type,fn){this.events[type]=fn}};
  const context=vm.createContext({mix,fxMix:1,undoStack:[],snapshot(){return {fxMix:context.fxMix}},clamp:(v,min,max)=>Math.max(min,Math.min(max,v)),window:{},renderStaticIfNeeded(){}});
  vm.runInContext(main.slice(main.indexOf('function setFxMix('),main.indexOf('function initState(')),context);
  vm.runInContext(extract('    let mixStart=', '    mixLabel.append('),context);
  mix.events.pointerdown();mix.value='20';mix.events.input();mix.value='35';mix.events.input();mix.events.change();mix.events.blur();
  assert.equal(context.fxMix,.35);assert.equal(context.undoStack.length,1);assert.equal(context.undoStack[0].fxMix,1);
  mix.events.keydown({key:'Home'});mix.value='0';mix.events.input();mix.events.change();assert.equal(context.fxMix,0);assert.equal(context.undoStack.length,2);
  vm.runInContext('setFxMix(undefined)',context);assert.equal(context.fxMix,1);
  vm.runInContext('setFxMix(NaN)',context);assert.equal(context.fxMix,1);
});


test('named presets retain FX mix and applying one creates a single undo',()=>{
  const advanced=readFileSync(new URL('../advanced.js',import.meta.url),'utf8');
  let saved={},undos=0,generated;
  const context=vm.createContext({fxMix:.35,base:{rgb:30},s:{},defaults:{rgb:0},groupEnabled:{},controlsAdv:{userPresetName:{value:'Soft look'},userPresetSelect:{value:''}},readUserPresets:()=>saved,writeUserPresets:x=>{saved=x},exportAdvancedState:()=>({}),importAdvancedState(){},sync(){},syncNumeric(){},renderActiveEffects(){},pushUndo(){undos++},startGenerated:undo=>{generated=undo},setFxMix:v=>{context.fxMix=v??1}});
  for(const name of ['promptEl','seedEl','genMode','genEngine','genMotion','genW','genH','cellSize','genSpeed'])context[name]={value:'10'};
  vm.runInContext(advanced.slice(advanced.indexOf('  function saveUserPreset('),advanced.indexOf('  function deleteUserPreset(')),context);
  vm.runInContext('saveUserPreset();fxMix=1;applyUserPreset()',context);
  assert.equal(context.fxMix,.35);assert.equal(saved['Soft look'].fxMix,.35);assert.equal(undos,1);assert.equal(generated,false);
});
