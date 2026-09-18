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
  if(!pathname.startsWith(prefix))throw new Error('Request is outside the Pages subpath');
  const name=decodeURIComponent(pathname.slice(prefix.length))||'index.html',filename=path.resolve(root,name);
  if(!filename.startsWith(root+path.sep))throw new Error('Invalid asset path');
  return {body:await readFile(filename),contentType:types[path.extname(name)]||'application/octet-stream'};
}
const server=createServer(async(req,res)=>{try{const a=await asset(req.url);res.writeHead(200,{'Content-Type':a.contentType});res.end(a.body);}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`,url=origin+prefix;
const embedded=!!process.env.CIRCUITBEND_EMBEDDED_TEST;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--autoplay-policy=no-user-gesture-required']});
const results=[];
async function boot(page){
  page.setDefaultTimeout(5000);
  await page.route('**/*',async route=>{
    const request=route.request().url();
    if(request.startsWith(origin)){if(embedded)return route.fulfill(await asset(request));return route.continue();}
    if(/^https?:/.test(request))return route.abort();return route.continue();
  });
  if(embedded)await page.setContent((await readFile(path.join(root,'index.html'),'utf8')).replace('<head>',`<head><base href="${url}">`));
  else await page.goto(url);
  await page.waitForFunction(()=>window.circuitbendLab&&window.circuitbendSamples&&ready);
  await page.evaluate(()=>circuitbendSamples.select('neon'));
}
async function test(name,run,options={}){
  if(process.env.CIRCUITBEND_TEST_FILTER&&!name.includes(process.env.CIRCUITBEND_TEST_FILTER))return;
  const started=Date.now();
  if(options.realOrigin&&embedded){results.push({name,skipped:true,reason:'Requires a real browser origin; CI runs this assertion.'});console.log(`SKIP ${name}`);return;}
  const page=await browser.newPage(options.reducedMotion?{reducedMotion:'reduce'}:{viewport:{width:1440,height:900},acceptDownloads:true});
  const deadline=setTimeout(()=>page.close().catch(()=>{}),15000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{await boot(page);await run(page);assert.deepEqual(errors,[]);results.push({name,passed:true,ms:Date.now()-started});console.log(`PASS ${name} (${Date.now()-started}ms)`);}
  catch(error){results.push({name,passed:false,error:error.message,errors});console.error(`FAIL ${name}: ${error.stack}`);}
  finally{clearTimeout(deadline);await page.close();}
}
const choose=(page,id)=>page.evaluate(id=>circuitbendSamples.select(id),id);
try{
  await test('paused procedural redraws preserve clock and source pixels',async page=>{
    await page.evaluate(()=>{genEngine.value='plasma';genMotion.value='drift';startGenerated();});await page.waitForTimeout(120);
    await page.evaluate(()=>circuitbendSandbox.setPlaying(false));
    const before=await page.evaluate(()=>({time:timelineTime,source:sourceCanvas.toDataURL()}));
    await page.waitForTimeout(140);const after=await page.evaluate(()=>{drawOnce();return{time:timelineTime,source:sourceCanvas.toDataURL()};});
    assert.deepEqual(after,before);
  });
  await test('zero generator speed stays zero at every render time',async page=>{
    assert.equal(await page.evaluate(()=>{genEngine.value='plasma';genMotion.value='drift';genSpeed.value='0';generateSource(0);const a=sourceCanvas.toDataURL();generateSource(100);return generatorConfig().speed===0&&a===sourceCanvas.toDataURL();}),true);
  });
  await test('procedural frames perform no browser storage writes',async page=>{
    assert.equal(await page.evaluate(()=>{
      const property=Object.getOwnPropertyDescriptor(window,'localStorage');let writes=0;
      Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:()=>null,setItem:()=>writes++}});
      try{genEngine.value='plasma';for(let i=0;i<6;i++)generateSource(i);return writes;}
      finally{if(property)Object.defineProperty(window,'localStorage',property);else delete window.localStorage;}
    }),0);
  });
  await test('exact numeric edits support Undo, Redo and divergent history',async page=>{
    await page.locator('[data-task="fx"]').click();await page.locator('[data-param-number="rgb"]').fill('31');
    assert.equal(await page.evaluate(()=>base.rgb),31);await page.locator('#undoBtn').click();assert.equal(await page.evaluate(()=>base.rgb),0);
    await page.locator('#redoBtn').click();assert.equal(await page.evaluate(()=>base.rgb),31);
    await page.locator('#undoBtn').click();await page.locator('[data-param-number="hue"]').fill('24');await page.locator('#effectSearch').focus();
    assert.equal(await page.locator('#redoBtn').isDisabled(),true);
  });
  await test('Undo restores modulation and does not rewrite the source seed',async page=>{
    const okay=await page.evaluate(()=>{base.rgb=s.rgb=12;lfo.rgb={mode:'sine',amt:9,hz:1};pushUndo();lfo.rgb.amt=35;base.rgb=30;seedEl.value='new-source';circuitbendSandbox.history.undo();return lfo.rgb.amt===9&&base.rgb===12&&seedEl.value==='new-source';});assert.equal(okay,true);
  });
  await test('Space on a native Play button toggles only once',async page=>{
    await page.locator('#playBtn').press('Space');assert.equal(await page.evaluate(()=>playing),true);
    await page.locator('#playBtn').press('Space');assert.equal(await page.evaluate(()=>playing),false);
  });
  await test('all six sample projects restore their actual image or video',async page=>{
    for(const id of ['neon','color','pixel','detail','orbit','ribbons']){
      await choose(page,id);const project=await page.evaluate(()=>circuitbendProject.capture());assert.equal(project.source.reference.sampleId,id);
      await choose(page,id==='neon'?'color':'neon');await page.evaluate(p=>circuitbendProject.restore(p),project);
      assert.deepEqual(await page.evaluate(()=>({id:circuitbendSandbox.mediaDescriptor().sampleId,kind:media,playing})),{id,kind:['orbit','ribbons'].includes(id)?'video':'image',playing:false});
    }
  });
  await test('reference generators restore without the Math engine hijacking them',async page=>{
    const saved=await page.evaluate(()=>{genEngine.value='reference';genW.value=384;genH.value=256;genMotion.value='static';startGenerated();return circuitbendProject.capture();});
    await page.evaluate(()=>circuitbendLab.applyRecipe('orbital-ink'));await page.evaluate(p=>circuitbendProject.restore(p),saved);
    assert.deepEqual(await page.evaluate(()=>({media,engine:genEngine.value,input:inputMedia,w:sourceCanvas.width,h:sourceCanvas.height})),{media:'generated',engine:'reference',input:'image',w:384,h:256});
  });
  await test('generator dimensions above 1024 are not silently clamped',async page=>{
    assert.deepEqual(await page.evaluate(()=>{genEngine.value='gradient';genW.value=1536;genH.value=320;genMotion.value='static';startGenerated();return[sourceCanvas.width,sourceCanvas.height];}),[1536,320]);
  });
  await test('baked PNG sources round-trip in project JSON',async page=>{
    const saved=await page.evaluate(()=>{bakeOutput();return circuitbendProject.capture();});await choose(page,'detail');await page.evaluate(p=>circuitbendProject.restore(p),saved);
    assert.equal(await page.evaluate(()=>sourceCanvas.toDataURL()),saved.source.bakedPng);assert.equal(await page.evaluate(()=>media),'baked');
  });
  await test('missing external files reject restoration before changing settings',async page=>{
    assert.equal(await page.evaluate(async()=>{
      const original=JSON.stringify(base),engine=genEngine.value,p=circuitbendProject.capture();p.source.reference={name:'missing.png',type:'image/png',size:123};p.effects.base.rgb=77;
      try{await circuitbendProject.restore(p);return false;}catch(error){return error.message.includes('Reopen missing.png')&&JSON.stringify(base)===original&&genEngine.value===engine;}
    }),true);
  });
  await test('external files can be reattached with matching metadata',async page=>{
    assert.equal(await page.evaluate(async()=>{
      const sample=circuitbendSamples.createFile('neon'),file=new File([sample],'my-source.svg',{type:'image/svg+xml',lastModified:1234});
      await load(file);base.rgb=s.rgb=14;const p=circuitbendProject.capture();await circuitbendSamples.select('color');
      await load(file);await circuitbendProject.restore(p);return media==='image'&&base.rgb===14&&!circuitbendSandbox.mediaDescriptor().sampleId;
    }),true);
  });
  await test('untrusted project parameters are whitelisted, finite and bounded',async page=>{
    const normalized=await page.evaluate(()=>circuitbendProject.normalize({format:'circuitbend-project',version:7,generator:{width:1e12,speed:0},effects:{base:{rgb:1e9,hue:'oops',bits:null,gray:'false',polluted:true,wobble:Infinity},rate:{rgb:1e15}},transport:{mix:0},advanced:{overlay:{opacity:0}},webview:{art:{glyphChars:'x'.repeat(10000)}}}));
    assert.equal(normalized.generator.width,4096);assert.equal(normalized.generator.speed,0);assert.equal(normalized.effects.base.rgb,120);assert.equal(normalized.effects.base.hue,0);assert.equal(normalized.effects.base.bits,8);assert.equal(normalized.effects.base.gray,false);assert.equal(normalized.effects.base.wobble,0);assert.equal(normalized.effects.base.polluted,undefined);assert.equal(normalized.transport.mix,0);assert.equal(normalized.advanced.overlay.opacity,0);assert.equal(normalized.webview.art.glyphChars.length,256);
  });
  await test('future schemas and invalid baked images leave the scene untouched',async page=>{
    assert.equal(await page.evaluate(async()=>{
      const before=JSON.stringify(base),p=circuitbendProject.capture();let failures=0;
      try{await circuitbendProject.restore({...p,version:99});}catch{failures++;}
      try{await circuitbendProject.restore({...p,source:{kind:'baked',bakedPng:'data:image/png;base64,YmFk'},effects:{base:{rgb:75}}});}catch{failures++;}
      return failures===2&&JSON.stringify(base)===before&&media==='image';
    }),true);
  });
  await test('FX blend changes output without destroying effect parameters',async page=>{
    const result=await page.evaluate(()=>{applyPreset('dirty');const before=JSON.stringify(base);circuitbendSandbox.setMix(1);const wet=canvas.toDataURL();circuitbendSandbox.setMix(0);const dry=canvas.toDataURL();circuitbendSandbox.setMix(.5);return {same:before===JSON.stringify(base),different:wet!==dry,mix:circuitbendProject.capture().transport.mix};});assert.deepEqual(result,{same:true,different:true,mix:.5});
  });
  await test('pixelation preserves the dry frame used by FX blend',async page=>{
    const result=await page.evaluate(()=>{
      initState(true);setParam('pixel',9,true);setParam('bright',25,true);
      const image=()=>Array.from(ctx.getImageData(0,0,canvas.width,canvas.height).data);
      circuitbendSandbox.setMix(0);const dry=image();circuitbendSandbox.setMix(1);const wet=image();
      circuitbendSandbox.setMix(.5);const blend=image();let error=0,difference=0;
      for(let i=0;i<blend.length;i++){error=Math.max(error,Math.abs(blend[i]-(dry[i]+wet[i])/2));difference+=Math.abs(wet[i]-dry[i]);}
      return {error,difference};
    });
    assert.ok(result.difference>1000);assert.ok(result.error<=1.5,JSON.stringify(result));
  });
  await test('pixel sorting actually rearranges bright pixels',async page=>{
    assert.deepEqual(await page.evaluate(()=>{
      canvas.width=4;canvas.height=1;const data=ctx.createImageData(4,1);
      [230,140,190,50].forEach((v,i)=>data.data.set([v,v,v,255],i*4));ctx.putImageData(data,0,0);
      s={...defaults,sort:100};fxRandom=()=>0;sortPix(4,1);
      const out=ctx.getImageData(0,0,4,1).data;return [out[0],out[4],out[8],out[12]];
    }),[140,190,230,50]);
  });
  await test('full-resolution export recovers from encoder exceptions',async page=>{
    assert.equal(await page.evaluate(async()=>{
      const before={w:canvas.width,h:canvas.height,scale:base.scale,q:quality.value,pixels:canvas.toDataURL()},encode=canvas.toBlob;
      canvas.toBlob=()=>{throw new Error('Injected encoder failure');};let exported;
      try{exported=await circuitbendSandbox.exportFullResolution();}finally{canvas.toBlob=encode;}
      return exported===false&&!circuitbendSandbox.busy&&canvas.width===before.w&&canvas.height===before.h&&base.scale===before.scale&&quality.value===before.q&&canvas.toDataURL()===before.pixels;
    }),true);
  });
  await test('full-res exports lock conflicting source and recording operations',async page=>{
    assert.equal(await page.evaluate(async()=>{
      const encode=canvas.toBlob;canvas.toBlob=function(callback,...args){return encode.call(this,value=>setTimeout(()=>callback(value),50),...args);};
      try{const exportJob=circuitbendSandbox.exportFullResolution();const rejected=await load(circuitbendSamples.createFile('color'));toggleRecording();const locked=!circuitbendSandbox.activeStream;await exportJob;return rejected===false&&locked&&!circuitbendSandbox.busy;}
      finally{canvas.toBlob=encode;}
    }),true);
  });
  await test('recording locks source/project changes and preserves capture dimensions',async page=>{
    await choose(page,'orbit');await page.evaluate(()=>toggleRecording());
    assert.equal(await page.evaluate(async()=>{
      const[w,h]=[canvas.width,canvas.height],original=media,p=circuitbendProject.capture();let rejected=false;
      try{await circuitbendProject.restore(p);}catch{rejected=true;}
      startGenerated();await circuitbendSandbox.exportFullResolution();const loaded=await load(circuitbendSamples.createFile('neon'));s.scale=.2;resize();
      return rejected&&!loaded&&media===original&&canvas.width===w&&canvas.height===h;
    }),true);
    await page.evaluate(()=>toggleRecording());await page.waitForFunction(()=>circuitbendSandbox.recordingPhase==='idle');
  });
  await test('recorder start failures unlock controls and release capture tracks',async page=>{
    assert.equal(await page.evaluate(()=>{
      const Real=window.MediaRecorder,capture=canvas.captureStream;let tracks=[];
      canvas.captureStream=function(...args){const stream=capture.apply(this,args);tracks=stream.getTracks();return stream;};
      window.MediaRecorder=class extends Real{start(){throw new Error('Injected recorder start failure');}};
      try{toggleRecording();return !circuitbendSandbox.busy&&!$('generateBtn').disabled&&tracks.every(track=>track.readyState==='ended');}
      finally{window.MediaRecorder=Real;canvas.captureStream=capture;}
    }),true);
  });
  await test('repeated stop clicks cannot start overlapping recorder sessions',async page=>{
    let downloads=0;page.on('download',()=>downloads++);await choose(page,'orbit');
    await page.evaluate(()=>{toggleRecording();window.testTracks=circuitbendSandbox.activeStream.getTracks();});await page.waitForTimeout(120);
    await page.evaluate(()=>{toggleRecording();toggleRecording();});await page.waitForFunction(()=>circuitbendSandbox.recordingPhase==='idle');await page.waitForTimeout(100);
    assert.equal(downloads,1);assert.equal(await page.evaluate(()=>window.testTracks.every(track=>track.readyState==='ended')),true);
  });
  await test('a generated source cancels a pending media decode',async page=>{
    assert.equal(await page.evaluate(async()=>{const job=load(circuitbendSamples.createFile('color'));genEngine.value='plasma';genMotion.value='static';startGenerated();const loaded=await job;return !loaded&&media==='generated'&&!circuitbendSandbox.pending;}),true);
  });
  await test('video-reference generators pause and resume their actual video',async page=>{
    await choose(page,'orbit');await page.evaluate(()=>{genEngine.value='reference';genMotion.value='drift';startGenerated();});
    await page.evaluate(()=>circuitbendSandbox.setPlaying(false));assert.equal(await page.evaluate(()=>video.paused),true);
    await page.evaluate(()=>circuitbendSandbox.setPlaying(true));assert.equal(await page.evaluate(()=>video.paused),false);
  });
  await test('Restart, stepping and scrubbing redraw paused sources',async page=>{
    await choose(page,'orbit');await page.evaluate(()=>circuitbendSandbox.seek(1));
    assert.ok(Math.abs(await page.evaluate(()=>video.currentTime)-1)<.05);assert.equal(await page.evaluate(()=>playing),false);
    await page.locator('#restartBtn').click();await page.waitForFunction(()=>video.currentTime<.01);
    await page.locator('#stepBtn').click();await page.waitForFunction(()=>timelineTime>30);assert.equal(await page.evaluate(()=>playing),false);
  });
  await test('saved scene slots restore samples and effects',async page=>{
    assert.equal(await page.evaluate(async()=>{applyPreset('dirty');const id=circuitbendLab.saveSlot('Test scene'),baseState=JSON.stringify(base);await circuitbendLab.applyRecipe('plasma-tide');await circuitbendLab.restoreSlot(id);return media==='image'&&circuitbendSandbox.mediaDescriptor().sampleId==='neon'&&JSON.stringify(base)===baseState;}),true);
  });
  await test('scene slots are bounded and user names are rendered as text',async page=>{
    assert.equal(await page.evaluate(()=>{for(let i=0;i<6;i++)circuitbendLab.saveSlot('<img src=x onerror=alert(1)>');const extra=circuitbendLab.saveSlot('Seventh');const first=circuitbendLab.slots[0];circuitbendLab.deleteSlot(first.id);return extra===false&&circuitbendLab.slots.length===5&&document.querySelectorAll('#experimentSlots img[src=x]').length===0;}),true);
  });
  await test('browser scene slots survive a real page reload',async page=>{
    await page.evaluate(()=>{circuitbendLab.saveSlot('Persistent scene');circuitbendWorkspace.setFocus(false);});await page.reload();await page.waitForFunction(()=>window.circuitbendLab&&circuitbendLab.slots.length===1);assert.equal(await page.evaluate(()=>circuitbendLab.slots[0].name),'Persistent scene');assert.equal(await page.evaluate(()=>document.body.dataset.task),'all');
  },{realOrigin:true});
  await test('six recipes produce distinct finite non-strobing scenes',async page=>{
    const result=await page.evaluate(async()=>{const pictures=new Set();for(const recipe of circuitbendLab.recipes){if(!(await circuitbendLab.applyRecipe(recipe.id)))return false;if(!ready||base.strobe!==0||circuitbendSandbox.renderErrors)return false;pictures.add(canvas.toDataURL());}return pictures.size===6;});assert.equal(result,true);
    await page.evaluate(()=>{circuitbendWorkspace.setTask('create');$('experimentLab').open=true;$('sandboxNotice').hidden=true;});await page.screenshot({path:path.join(artifacts,'experiments-desktop.png'),fullPage:true});
  });
  await test('reduced motion also prevents generated-source autoplay',async page=>{
    assert.equal(await page.evaluate(()=>{genEngine.value='plasma';genMotion.value='drift';startGenerated();return !playing;}),true);
  },{reducedMotion:true});
  await test('paused seeded noise stays stable across repeated redraws',async page=>{
    assert.equal(await page.evaluate(()=>{applyPreset('dirty');drawOnce();const before=canvas.toDataURL();drawOnce();return before===canvas.toDataURL();}),true);
  });
  await test('high-resolution generator work is bounded without shrinking its source',async page=>{
    const config=await page.evaluate(()=>{genW.value=4096;genH.value=4096;cellSize.value=2;return generatorConfig();});
    assert.equal(config.w,4096);assert.equal(config.h,4096);assert.equal(config.requestedCell,2);assert.ok(Math.ceil(config.w/config.cell)*Math.ceil(config.h/config.cell)<=180000);
  });
  await test('a delayed baked-project restore cannot replace a newer selected source',async page=>{
    assert.equal(await page.evaluate(async()=>{
      bakeOutput();const p=circuitbendProject.capture(),decode=HTMLImageElement.prototype.decode;
      HTMLImageElement.prototype.decode=async function(){await new Promise(resolve=>setTimeout(resolve,60));return decode.call(this);};
      try{const oldRestore=circuitbendProject.restore(p);await circuitbendSamples.select('pixel');const restored=await oldRestore;return restored===false&&media==='image'&&circuitbendSandbox.mediaDescriptor().sampleId==='pixel';}
      finally{HTMLImageElement.prototype.decode=decode;}
    }),true);
  });
  await test('full-resolution export overrides animated scale and restores it afterward',async page=>{
    assert.equal(await page.evaluate(async()=>{
      lfo.scale={mode:'sine',amt:.1,hz:1};timelineTime=400;drawOnce();const before=s.scale,encode=canvas.toBlob;let dimensions;
      canvas.toBlob=function(callback,...args){dimensions=[canvas.width,canvas.height];return encode.call(this,callback,...args);};
      try{await circuitbendSandbox.exportFullResolution();return dimensions[0]===640&&dimensions[1]===400&&s.scale===before;}
      finally{canvas.toBlob=encode;}
    }),true);
  });
  await test('project restoration exits Compare and restores the saved blend',async page=>{
    assert.equal(await page.evaluate(async()=>{circuitbendSandbox.setMix(.35);const p=circuitbendProject.capture();circuitbendSandbox.setComparing(true);await circuitbendProject.restore(p);return !circuitbendSandbox.comparing&&circuitbendSandbox.mix===.35;}),true);
  });
  await test('running sweep timers survive a PNG export',async page=>{
    assert.equal(await page.evaluate(async()=>{toggleSweep('hue',1);const timer=sweep.hue.timer;await circuitbendSandbox.exportFullResolution();const same=sweep.hue.timer===timer&&sweep.hue.dir===1;stopAllSweeps();return same;}),true);
  });
  await test('render failures restore the live state and stop animation',async page=>{
    assert.equal(await page.evaluate(()=>{const generate=generateSource,live=s;media='generated';playing=true;generateSource=()=>{throw new Error('Injected renderer failure');};try{drawOnce();return s===live&&!playing&&circuitbendSandbox.renderErrors===1;}finally{generateSource=generate;}}),true);
  });
}finally{
  const report={filter:process.env.CIRCUITBEND_TEST_FILTER||null,mode:embedded?'embedded-document harness':'real HTTP Pages subpath',passed:results.filter(r=>r.passed).length,skipped:results.filter(r=>r.skipped).length,total:results.length,results};
  await writeFile(path.join(artifacts,'lifecycle-report.json'),JSON.stringify(report,null,2));console.log(`LIFECYCLE_RESULT ${JSON.stringify({passed:report.passed,skipped:report.skipped,total:report.total})}`);
  await browser.close();await new Promise(resolve=>server.close(resolve));
}
if(results.some(r=>r.passed===false))process.exitCode=1;
