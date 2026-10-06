import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const server=spawn('python3',['-m','http.server','8910','--bind','127.0.0.1'],{stdio:'ignore'});
const root='http://127.0.0.1:8910';
let browser;
const results=[];
try{
  for(let i=0;i<80;i++){try{if((await fetch(root)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
  await mkdir('docs/evidence/browser',{recursive:true});
  browser=await chromium.launch({headless:true});
  for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
    const context=await browser.newContext({viewport,acceptDownloads:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(root);await page.locator('#fxMix').waitFor();
    await page.locator('#file').setInputFiles('tests/fixtures/gradient.png');await page.waitForFunction(()=>document.getElementById('readout').textContent.startsWith('image ready'));
    await page.locator('#quickLook').selectOption('poster');
    const pixels=()=>page.locator('#canvas').evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data));
    const processed=await pixels();
    await page.locator('#fxMix').press('Home');assert.equal(await page.locator('#fxMixValue').textContent(),'0%');
    const zero=await pixels();await page.locator('#compareOriginal').click();assert.deepEqual(await pixels(),zero,'zero mix must exactly preserve original transparency');await page.locator('#compareOriginal').click();
    await page.locator('#undoBtn').click();assert.equal(await page.locator('#fxMixValue').textContent(),'100%');assert.deepEqual(await pixels(),processed);
    await page.locator('#file').setInputFiles('tests/fixtures/broken.png');await page.waitForFunction(()=>document.getElementById('mediaStatus').textContent.includes('could not be opened'));assert.deepEqual(await pixels(),processed,'bad import must preserve visible pixels');
    const [png]=await Promise.all([page.waitForEvent('download'),page.locator('#snapBtn').click()]);
    const pngBytes=await readFile(await png.path());assert.equal(pngBytes.readUInt32BE(16),34);assert.equal(pngBytes.readUInt32BE(20),25);
    const exported=await page.evaluate(async b64=>{const image=new Image();image.src='data:image/png;base64,'+b64;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;c.getContext('2d').drawImage(image,0,0);return Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data)},pngBytes.toString('base64'));
    assert.deepEqual(exported,processed,'PNG must export the visible pixels without rerendering');
    await page.locator('#moreMenu > summary').click();const [full]=await Promise.all([page.waitForEvent('download'),page.locator('#exportFullBtn').click()]);
    const fullBytes=await readFile(await full.path());assert.equal(fullBytes.readUInt32BE(16),64);assert.equal(fullBytes.readUInt32BE(20),48);assert.match(full.suggestedFilename(),/64x48/);assert.deepEqual(await pixels(),processed,'full resolution export must restore exact live buffers');
    await page.locator('#fxMix').press('Home');await page.locator('#fxMix').press('ArrowRight');
    await page.locator('#moreMenu > summary').click();const [project]=await Promise.all([page.waitForEvent('download'),page.locator('#projectSaveBtn').click()]);const projectBytes=await readFile(await project.path());assert.equal(JSON.parse(projectBytes).effects.mix,.01);
    await page.locator('#fxMix').press('End');await page.locator('#projectFile').setInputFiles({name:'roundtrip.json',mimeType:'application/json',buffer:projectBytes});await page.waitForFunction(()=>document.getElementById('fxMixValue').textContent==='1%');
    // Version 6 files without the optional mix retain the original full-look behavior.
    const legacy=JSON.parse(projectBytes);delete legacy.effects.mix;await page.locator('#projectFile').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});await page.waitForFunction(()=>document.getElementById('fxMixValue').textContent==='100%');
    await page.locator('#playBtn').click();
    const bounds=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert.ok(bounds.scroll<=bounds.client,'horizontal overflow');
    if(viewport.width<820){const heights=await page.locator('.top .actions button,.top .filebtn').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().height).map(n=>n.getBoundingClientRect().height));assert.ok(heights.every(h=>h>=44))}
    assert.deepEqual(errors,[]);await page.screenshot({path:`docs/evidence/browser/${viewport.width}-workflow.png`,fullPage:false});results.push({viewport,png:[34,25],fullPng:[64,48],exactPreviewPreserved:true,legacyProjectRestored:true,errors});await context.close();
  }
  await writeFile('docs/evidence/browser/report.json',JSON.stringify({status:'passed',results},null,2)+'\n');console.log(JSON.stringify(results,null,2));
}finally{await browser?.close();server.kill()}
