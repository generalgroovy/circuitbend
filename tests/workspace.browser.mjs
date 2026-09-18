import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, stat, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(root, 'test-results');
await mkdir(artifacts, {recursive: true});
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webm':'video/webm'};
const server = createServer(async (request, response) => {
  const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const target = path.resolve(root, '.' + (relative === '/' ? '/index.html' : relative));
  if (!target.startsWith(root + path.sep)) {response.writeHead(403).end(); return;}
  try {response.writeHead(200, {'Content-Type':types[path.extname(target)] || 'application/octet-stream'}); response.end(await readFile(target));}
  catch {response.writeHead(404).end();}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless:true, args:['--autoplay-policy=no-user-gesture-required']});
const page = await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
const errors = [], external = [], results = [];
page.on('pageerror', error => errors.push(error.message));
await page.route('**/*', route => {
  const url = route.request().url();
  if (/^https?:/.test(url) && !url.startsWith(origin)) {external.push(url); return route.abort();}
  return route.continue();
});
const test = async (name, run) => {
  try {await run(); results.push({name,passed:true}); console.log(`PASS ${name}`);}
  catch (error) {results.push({name,passed:false,error:error.message}); console.error(`FAIL ${name}: ${error.stack}`);}
};
const choose = id => page.evaluate(id => window.circuitbendSamples.select(id), id);
try {
  await page.goto(origin);
  await page.waitForFunction(() => window.circuitbendSamples && window.circuitbendViewer && ready, {timeout:30000});
  await test('six offline samples; default image is not animated', async () => {
    assert.equal(await page.locator('[data-sample]').count(), 6);
    await choose('neon');
    const result = await page.evaluate(() => ({media,playing,ready,pixels:ctx.getImageData(0,0,canvas.width,canvas.height).data.some(value=>value>0)}));
    assert.deepEqual(result, {media:'image',playing:false,ready:true,pixels:true});
  });
  await test('every image and real video sample decodes through the import pipeline', async () => {
    for (const id of ['neon','color','pixel','detail','orbit','ribbons']) {
      assert.equal(await choose(id), true, id);
      assert.equal(await page.evaluate(() => ready && canvas.width > 0 && canvas.toDataURL('image/png').length > 100), true);
    }
    const time = await page.evaluate(() => video.currentTime); await page.waitForTimeout(450);
    assert.notEqual(await page.evaluate(() => video.currentTime), time);
  });
  await test('invalid MIME and corrupt image preserve the loaded source', async () => {
    assert.deepEqual(await page.evaluate(async () => {
      const before = {media,ready,url:video.currentSrc};
      const text = await load(new File(['text'], 'test.txt', {type:'text/plain'}));
      const broken = await load(new File(['broken'], 'bad.png', {type:'image/png'}));
      return {text,broken,unchanged:JSON.stringify(before)===JSON.stringify({media,ready,url:video.currentSrc})};
    }), {text:false,broken:false,unchanged:true});
  });
  await test('rapid source selection resolves to the latest successful request', async () => {
    await page.evaluate(() => Promise.all(['orbit','color','detail'].map(id=>window.circuitbendSamples.select(id))));
    assert.equal(await page.evaluate(()=>media==='image' && ready && document.querySelector('[data-sample="detail"]').getAttribute('aria-pressed')==='true'),true);
  });
  await test('Compare bypasses effects without overwriting their values', async () => {
    await page.locator('[data-look="dirty"]').click();
    const before = await page.evaluate(()=>JSON.stringify(base));
    await page.locator('#compareBtn').click();
    assert.equal(await page.evaluate(()=>effectiveState(s).noise),0);
    assert.equal(await page.evaluate(()=>JSON.stringify(base)),before);
    await page.locator('#compareBtn').click();
    assert.equal(await page.evaluate(()=>JSON.stringify(base)),before);
  });
  await test('safe Remix preserves resolution and frame rate, avoids strobe, and supports Undo', async () => {
    const before = await page.evaluate(()=>JSON.stringify(base));
    await page.locator('#randomBtn').click();
    const after = await page.evaluate(()=>({...base})), initial = JSON.parse(before);
    assert.equal(after.scale,initial.scale); assert.equal(after.fps,initial.fps); assert.equal(after.strobe,0);
    await page.locator('#undoBtn').click(); assert.equal(await page.evaluate(()=>JSON.stringify(base)),before);
  });
  await test('source changes preserve effect settings', async () => {
    const before = await page.evaluate(()=>JSON.stringify(base)); await choose('color');
    assert.equal(await page.evaluate(()=>JSON.stringify(base)),before);
  });
  await test('all tools remain available; exact values, search and expert automation work', async () => {
    await page.locator('[data-task="fx"]').click();
    await page.locator('[data-param-number="rgb"]').fill('31');
    assert.equal(await page.evaluate(()=>base.rgb),31);
    await page.locator('#effectSearch').fill('wobble');
    assert.ok(await page.locator('.ctrl:not(.hiddenBySearch)').count()>=1);
    await page.locator('#effectSearch').fill('');
    await page.locator('#configMode').selectOption('expert');
    assert.equal(await page.locator('.mini').first().isVisible(),true);
    await page.locator('#configMode').selectOption('simple');
    assert.equal(await page.locator('.mini').first().isVisible(),false);
    await page.locator('#focusToggle').click();
    assert.equal(await page.locator('.generator').isVisible(),true);
    assert.equal(await page.locator('.controls').isVisible(),true);
    for (const task of ['create','math','style','export']) {
      await page.locator(`[data-task="${task}"]`).click(); assert.equal(await page.locator('.panel').isVisible(),true);
    }
    await page.locator('[data-task="style"]').click(); await page.locator('#styleImported').click();
    assert.equal(await page.evaluate(()=>genEngine.value),'reference');
    await page.locator('[data-task="create"]').click(); await choose('neon');
  });
  await test('clean color pass skips pixel reads; active adjustments still execute', async () => {
    assert.deepEqual(await page.evaluate(()=>{
      const old = s, get = ctx.getImageData.bind(ctx); let reads = 0;
      ctx.getImageData = (...args)=>{reads++;return get(...args);};
      try {s={...defaults}; pixels(4,4); const clean=reads; s.bright=5; pixels(4,4); return {clean,adjusted:reads};}
      finally {s=old;ctx.getImageData=get;}
    }), {clean:0,adjusted:1});
  });
  await test('budgeted resize preserves feedback surfaces when dimensions do not change', async () => {
    assert.equal(await page.evaluate(()=>{
      const old={media,scale:s.scale,quality:quality.value,budget:$('renderBudget').value};
      media='baked'; sourceCanvas.width=2000;sourceCanvas.height=1200;s.scale=1;quality.value='1';$('renderBudget').value='.5';
      // Select values are normalized by the DOM, so use its canonical option value.
      $('renderBudget').value='0.5';
      resize(); ectx.fillStyle='#ff0000';ectx.fillRect(0,0,1,1);resize();
      const okay=canvas.width*canvas.height<=500000&&ectx.getImageData(0,0,1,1).data[0]===255;
      media=old.media;s.scale=old.scale;quality.value=old.quality;$('renderBudget').value=old.budget;resize();return okay;
    }),true);
    await choose('neon');
  });
  await test('PNG export and full-resolution export produce nonempty images', async () => {
    const saved = page.waitForEvent('download'); await page.locator('#snapBtn').click();
    assert.ok((await stat(await (await saved).path())).size>100);
    await page.locator('[data-task="export"]').click();
    const full = page.waitForEvent('download'); await page.locator('#exportFullBtn').click();
    const bytes=await readFile(await (await full).path());assert.equal(bytes.readUInt32BE(16),640);assert.equal(bytes.readUInt32BE(20),400);
  });
  await test('recording generates a clip and stops all capture tracks', async () => {
    await choose('orbit'); await page.locator('#recordBtn').click();
    await page.evaluate(()=>window.__tracks=window.circuitbendSandbox.activeStream.getTracks());
    await page.waitForTimeout(800);
    const saved=page.waitForEvent('download');await page.locator('#recordBtn').click();
    assert.ok((await stat(await (await saved).path())).size>100);
    assert.equal(await page.evaluate(()=>window.__tracks.every(track=>track.readyState==='ended')),true);
  });
  await test('floating, scaling and pop-out viewers remain functional', async () => {
    await choose('neon'); await page.locator('#viewerFloat').click();
    assert.equal(await page.locator('.preview').evaluate(node=>node.classList.contains('viewerFloating')),true);
    await page.locator('#viewerFloat').click();
    await page.locator('#viewerZoom').evaluate(node=>{node.value='150';node.dispatchEvent(new Event('input',{bubbles:true}));});
    assert.equal(await page.locator('.preview').evaluate(node=>node.classList.contains('viewerScaled')),true);
    await page.locator('#viewerFit').click();
    const popupEvent=page.waitForEvent('popup');await page.locator('#viewerPopout').click();const popup=await popupEvent;
    await popup.waitForSelector('canvas');await popup.close();
  });
  await test('responsive layout has no page-level horizontal overflow at five widths', async () => {
    await page.locator('[data-task="create"]').click(); await page.locator('#resetBtn').click(); await choose('neon');
    for (const width of [320,390,768,1280,1440]) {
      await page.setViewportSize({width,height:900}); await page.waitForTimeout(100);
      const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth}));
      assert.ok(dimensions.scroll<=dimensions.inner+1,`${width}px: ${JSON.stringify(dimensions)}`);
    }
    await page.screenshot({path:path.join(artifacts,'desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(artifacts,'mobile.png'),fullPage:true});
    await page.setViewportSize({width:1440,height:900});
    await page.locator('[data-task="fx"]').click();await page.screenshot({path:path.join(artifacts,'effects.png'),fullPage:true});
    // Small visual diagnostic in the log as well as full-resolution artifacts.
    const capture=(await page.screenshot({type:'jpeg',quality:55})).toString('base64');
    const thumbnail=await page.evaluate(async encoded=>{
      const image=new Image();image.src='data:image/jpeg;base64,'+encoded;await image.decode();
      const surface=document.createElement('canvas');surface.width=720;surface.height=450;
      surface.getContext('2d').drawImage(image,0,0,720,450);return surface.toDataURL('image/jpeg',.4).split(',')[1];
    },capture);
    console.log('WORKSPACE_PREVIEW_JPEG '+thumbnail);
  });
  await test('reduced-motion preference keeps selected video paused', async () => {
    const reduced=await browser.newPage({reducedMotion:'reduce'});
    await reduced.goto(origin);await reduced.waitForFunction(()=>window.circuitbendSamples);
    await reduced.evaluate(()=>window.circuitbendSamples.select('orbit'));
    assert.equal(await reduced.evaluate(()=>playing===false&&video.paused),true);await reduced.close();
  });
  await test('no uncaught browser errors or external media requests', async () => {assert.deepEqual(errors,[]);assert.deepEqual(external,[]);});
} finally {
  await writeFile(path.join(artifacts,'workspace-report.json'),JSON.stringify({results,errors,external},null,2));
  console.log(`WORKSPACE_RESULT ${JSON.stringify({passed:results.filter(r=>r.passed).length,total:results.length,errors,external})}`);
  await browser.close();await new Promise(resolve=>server.close(resolve));
}
if (results.some(result=>!result.passed)) process.exitCode=1;
