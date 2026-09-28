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
