import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const artifacts=path.join(root,'test-results');await mkdir(artifacts,{recursive:true});
const prefix='/circuitbend/',types={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
async function asset(url){
  const pathname=new URL(url,'http://test').pathname;
  if(!pathname.startsWith(prefix))throw new Error('Outside Pages subpath');
  const name=decodeURIComponent(pathname.slice(prefix.length))||'index.html',filename=path.resolve(root,name);
  if(!filename.startsWith(root+path.sep))throw new Error('Invalid asset path');
  return{body:await readFile(filename),contentType:types[path.extname(name)]||'application/octet-stream'};
}
const server=createServer(async(req,res)=>{try{const a=await asset(req.url);res.writeHead(200,{'Content-Type':a.contentType});res.end(a.body);}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`,url=origin+prefix;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
const page=await browser.newPage({viewport:{width:1440,height:900}});
page.setDefaultTimeout(6000);
const results=[],errors=[],external=[],missing=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
await page.route('**/*',async route=>{
  const requested=route.request().url();
  if(requested.startsWith(origin))return process.env.CIRCUITBEND_EMBEDDED_TEST?route.fulfill(await asset(requested)):route.continue();
  if(/^https?:/.test(requested)){external.push(requested);return route.abort();}
  return route.continue();
});
async function test(name,fn){try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:e.message});console.error('FAIL '+name+': '+e.stack);}finally{await page.evaluate(()=>{const d=document.getElementById('quickGuide');if(d?.open)d.close();});}}
const task=name=>page.evaluate(name=>circuitbendWorkspace.setTask(name),name);
const state=()=>page.evaluate(()=>({base:JSON.stringify(base),media,source:JSON.stringify(circuitbendSandbox.mediaDescriptor()),pixels:canvas.toDataURL(),time:timelineTime,mix:circuitbendSandbox.mix,playing}));
try{
  if(process.env.CIRCUITBEND_EMBEDDED_TEST)await page.setContent((await readFile(path.join(root,'index.html'),'utf8')).replace('<head>',`<head><base href="${url}">`));
  else await page.goto(url);
  await page.waitForFunction(()=>window.circuitbendWorkbench&&window.circuitbendViewer&&ready);
  await page.evaluate(()=>circuitbendSamples.select('neon'));
  await test('workbench preserves control identity and loads under the Pages subpath',async()=>{
    assert.equal(await page.locator('#helpBtn').count(),1);
    assert.equal(await page.locator('#controls').count(),1);
    assert.equal(await page.locator('[data-recipe]').count(),6);
    assert.equal(await page.locator('.recipeGrid small').count(),6);
    const duplicate=await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);});
    assert.deepEqual(duplicate,[]);
  });
  await test('context heading follows navigation, restored workspace, and All tools',async()=>{
    for(const [name,label]of [['create','Source'],['math','Math'],['style','Pixel / ASCII'],['fx','Effects'],['export','Export']]){
      await task(name);assert.equal(await page.locator('.inspectorHeading strong').textContent(),label);
    }
    await page.evaluate(()=>circuitbendWorkspace.setFocus(false));assert.equal(await page.locator('.inspectorHeading strong').textContent(),'All tools');
    await page.evaluate(()=>circuitbendWorkspace.importState({task:'style',focus:true}));assert.equal(await page.locator('.inspectorHeading strong').textContent(),'Pixel / ASCII');
    await task('create');
  });
  await test('contextual guide opens with the relevant topic and returns focus',async()=>{
    await task('fx');await page.locator('#helpBtn').click();
    assert.equal(await page.locator('[data-guide-topic="effects"]').evaluate(n=>n.open),true);
    assert.equal(await page.locator('#guideClose').evaluate(n=>n===document.activeElement),true);
    await page.keyboard.press('Escape');assert.equal(await page.locator('#quickGuide').evaluate(n=>n.open),false);
    assert.equal(await page.locator('#helpBtn').evaluate(n=>n===document.activeElement),true);
  });
  await test('guide contains keyboard focus and never runs the app shortcuts',async()=>{
    const before=await state();await page.locator('#helpBtn').click();
    await page.keyboard.press('r');await page.keyboard.press('g');await page.keyboard.press('Control+Enter');await page.keyboard.press('Control+z');
    for(let i=0;i<15;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>!!document.activeElement.closest('#quickGuide')),true);}
    for(let i=0;i<4;i++){await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>!!document.activeElement.closest('#quickGuide')),true);}
    assert.deepEqual(await state(),before);await page.keyboard.press('Escape');
  });
  await test('question-mark shortcut respects fields, and guide jumps navigate only',async()=>{
    await task('create');await page.locator('#prompt').fill('rings');await page.locator('#prompt').press('?');
    assert.equal(await page.locator('#quickGuide').evaluate(n=>n.open),false);
    await page.locator('#helpBtn').focus();await page.keyboard.press('?');assert.equal(await page.locator('#quickGuide').evaluate(n=>n.open),true);
    const before=await state();await page.locator('[data-guide-topic="save"] summary').click();await page.locator('[data-guide-topic="save"] [data-guide-task]').click();
    assert.equal(await page.locator('#quickGuide').evaluate(n=>n.open),false);assert.equal(await page.evaluate(()=>circuitbendWorkspace.exportState().task),'export');
    assert.deepEqual(await state(),before);
  });
  await test('imported-source guidance updates without touching image or generator state',async()=>{
    await task('create');assert.equal(await page.locator('#sourceContext').isVisible(),true);
    await page.evaluate(()=>circuitbendLab.applyRecipe('plasma-tide'));
    assert.equal(await page.locator('#sourceContext').isVisible(),false);
    await page.evaluate(()=>circuitbendSamples.select('neon'));assert.equal(await page.locator('#sourceContext').isVisible(),true);
  });
  await test('math explanations and flashing warnings are available',async()=>{
    await task('math');assert.equal(await page.locator('#mathDescription').isVisible(),true);
    assert.ok((await page.locator('[data-preset="acid"]').getAttribute('aria-label')).includes('flash'));
    assert.ok((await page.locator('#chaosBtn').getAttribute('title')).includes('flash'));
  });
  await test('key text and active-state color pairs meet 4.5:1 contrast',async()=>{
    const pairs=[['#eeefe5','#171c1a'],['#aeb6a9','#171c1a'],['#d9f477','#171c1a'],['#20261f','#d9f477'],['#20261f','#eeece2'],['#596151','#eeece2'],['#596151','#e7e5d9'],['#f8f7f0','#39502a'],['#f8f7f0','#3549a2'],['#f8f7f0','#7a3b64'],['#f8f7f0','#87502a'],['#f8f7f0','#315f54']];
    const lum=hex=>{const v=hex.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];};
    for(const[a,b]of pairs){const [x,y]=[lum(a),lum(b)].sort((a,b)=>b-a);assert.ok((x+.05)/(y+.05)>=4.5,`${a} / ${b}`);}
    await task('create');assert.ok(await page.locator('#genEngine').evaluate(n=>parseFloat(getComputedStyle(n).fontSize)>=12));
    assert.ok(await page.locator('#snapBtn').evaluate(n=>parseFloat(getComputedStyle(n).fontSize)>=12));
  });
  await test('all tasks fit the page at 320, 390, 768 and 1440 widths',async()=>{
    for(const width of [320,390,768,1440]){
      await page.setViewportSize({width,height:900});
      for(const name of ['create','math','style','fx','export']){
        await task(name);await page.waitForTimeout(40);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width} / ${name}`);
        const escaped=await page.locator('.panel').evaluate(panel=>{
          const p=panel.getBoundingClientRect();
          return [...panel.querySelectorAll('button,input,select,textarea')].filter(n=>n.getClientRects().length&&!n.closest('[hidden]')).filter(n=>{const r=n.getBoundingClientRect();return r.right>p.right+2;}).map(n=>n.id||n.textContent);
        });assert.deepEqual(escaped,[],`${width} / ${name}`);
      }
    }
  });
  await test('full preview and quick looks fit inside the desktop panel',async()=>{
    await page.setViewportSize({width:1440,height:900});await task('create');
    const dims=await page.evaluate(()=>{
      const b=s=>document.querySelector(s).getBoundingClientRect(),stage=b('.stage'),p=b('.preview'),c=b('#canvas'),looks=b('.quickLooks');
      return {canvas:c.bottom<=p.bottom+1&&c.right<=p.right+1,looks:looks.bottom<=stage.bottom-4&&looks.bottom<=innerHeight,stageOverflow:document.querySelector('.stage').scrollHeight>document.querySelector('.stage').clientHeight+1};
    });assert.deepEqual(dims,{canvas:true,looks:true,stageOverflow:false});
  });
  await test('wrapping toolbar never overlaps the preview image',async()=>{
    for(const width of [320,390,768,1440]){
      await page.setViewportSize({width,height:900});await page.waitForTimeout(100);
      const ok=await page.evaluate(()=>{const t=document.querySelector('#viewerTools').getBoundingClientRect(),c=document.querySelector('#canvas').getBoundingClientRect();return c.top>=t.bottom+1;});assert.equal(ok,true,`${width}`);
    }
  });
  await test('guide remains usable on a small viewport and under reduced motion',async()=>{
    await page.setViewportSize({width:320,height:568});await page.emulateMedia({reducedMotion:'reduce'});
    await page.locator('#helpBtn').click();assert.ok(await page.locator('#quickGuide').evaluate(n=>{const b=n.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.height<=innerHeight&&n.scrollWidth<=n.clientWidth;}));
    assert.equal(await page.locator('#guideClose').isVisible(),true);await page.keyboard.press('Escape');await page.emulateMedia({reducedMotion:'no-preference'});
  });
  await test('mobile recipes and blend controls stay readable as complete groups',async()=>{
    await page.setViewportSize({width:390,height:844});await task('create');
    await page.locator('#experimentLab').evaluate(n=>n.open=true);
    assert.ok(await page.locator('[data-recipe]').first().evaluate(n=>n.getBoundingClientRect().width>=250));
    assert.ok(await page.locator('.blendControls').evaluate(n=>{const a=n.querySelector('label').getBoundingClientRect(),b=n.querySelector('output').getBoundingClientRect();return Math.abs(a.top-b.top)<6;}));
  });
  await test('no uncaught errors, remote assets, or missing local assets',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(missing,[]);});
  // Clean presentation captures, not post-test states or mockups.
  await page.setViewportSize({width:1440,height:900});await task('create');
  await page.evaluate(()=>{circuitbendSandbox.history.clear();$('sandboxNotice').hidden=true;promptEl.value='';});
  await page.screenshot({path:path.join(artifacts,'workbench-source.png'),fullPage:true});
  await page.evaluate(async()=>{await circuitbendLab.applyRecipe('orbital-ink');circuitbendWorkspace.setTask('create');$('experimentLab').open=true;$('sandboxNotice').hidden=true;});
  await page.screenshot({path:path.join(artifacts,'workbench-recipes.png'),fullPage:true});
  await task('math');await page.screenshot({path:path.join(artifacts,'workbench-math.png'),fullPage:true});
  await task('fx');await page.screenshot({path:path.join(artifacts,'workbench-effects.png'),fullPage:true});
  await task('export');await page.screenshot({path:path.join(artifacts,'workbench-export.png'),fullPage:true});
  await task('create');await page.locator('#helpBtn').click();await page.screenshot({path:path.join(artifacts,'workbench-guide.png'),fullPage:true});await page.keyboard.press('Escape');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(artifacts,'workbench-mobile.png'),fullPage:true});
}finally{
  await writeFile(path.join(artifacts,'design-report.json'),JSON.stringify({results,errors,external,missing},null,2));
  console.log('DESIGN_RESULT '+JSON.stringify({passed:results.filter(r=>r.passed).length,total:results.length,errors,external,missing}));
  await browser.close();await new Promise(resolve=>server.close(resolve));
}
if(results.some(r=>!r.passed))process.exitCode=1;
