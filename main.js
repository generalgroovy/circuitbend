const $ = id => document.getElementById(id);
const video = $('video'), img = $('image'), canvas = $('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
const file = $('file'), drop = $('drop'), readout = $('readout'), controls = $('controls'), placeholder = $('placeholder');
const master = $('master'), macroA = $('macroA'), macroB = $('macroB'), bpm = $('bpm');

const defaults = {
  scale:.72, fps:45, bright:0, contrast:0, sat:0, hue:0, invert:false, gray:false,
  rgb:0, angle:0, poster:0, bits:8, noise:0, pixel:1, sort:0, blocks:0, blockSize:40, blockDrift:80,
  scan:0, wobble:0, wobbleFreq:8, wave:2, edge:0, half:0, ascii:0, solar:0, melt:0, shred:0,
  kaleido:0, tiles:0, vignette:0, mirror:false, strobe:0, strobeRate:8,
  glow:0, emboss:0, duotone:0, bands:0, bandSpeed:2, tunnel:0, prism:0, ghost:0, echo:0,
  ripples:0, rippleFreq:8, scratch:0, posterBurn:0, blockInvert:0, lineOffset:0, chromaNoise:0
};
const ranges = {
  scale:[.12,1,.01], fps:[1,60,1], bright:[-120,120,1], contrast:[-120,140,1], sat:[-100,360,1], hue:[-180,180,1],
  rgb:[0,120,1], angle:[0,360,1], poster:[0,16,1], bits:[1,8,1], noise:[0,180,1], pixel:[1,80,1], sort:[0,100,1],
  blocks:[0,140,1], blockSize:[4,260,1], blockDrift:[0,360,1], scan:[0,100,1], wobble:[0,120,1], wobbleFreq:[1,70,.1], wave:[-40,40,.1],
  edge:[0,100,1], half:[0,40,1], ascii:[0,32,1], solar:[0,255,1], melt:[0,100,1], shred:[0,100,1], kaleido:[0,12,1], tiles:[0,12,1],
  vignette:[0,100,1], strobe:[0,100,1], strobeRate:[1,60,.1], glow:[0,100,1], emboss:[0,100,1], duotone:[0,100,1], bands:[0,100,1],
  bandSpeed:[-20,20,.1], tunnel:[0,100,1], prism:[0,100,1], ghost:[0,100,1], echo:[0,98,1], ripples:[0,120,1], rippleFreq:[1,60,.1],
  scratch:[0,100,1], posterBurn:[0,100,1], blockInvert:[0,100,1], lineOffset:[0,120,1], chromaNoise:[0,100,1]
};
const groups = [
  ['Render', ['scale','fps']],
  ['Color', ['bright','contrast','sat','hue','invert','gray','solar','duotone','posterBurn']],
  ['Channel / glitch', ['rgb','angle','chromaNoise','poster','bits','noise','pixel','sort','blocks','blockSize','blockDrift','blockInvert']],
  ['Geometry', ['wobble','wobbleFreq','wave','ripples','rippleFreq','lineOffset','mirror','kaleido','tiles','melt','shred']],
  ['Print / neon', ['edge','glow','emboss','half','ascii','scan','scratch','bands','bandSpeed','vignette','strobe','strobeRate']],
  ['Optical recursion', ['tunnel','prism','ghost','echo']]
];
const presets = {
  clean:{}, xerox:{gray:true,contrast:80,poster:2,noise:20,scratch:25}, neon:{edge:90,glow:60,sat:180,rgb:18,scan:20},
  acid:{sat:260,hue:80,poster:6,kaleido:5,strobe:15,bands:50,prism:30}, cctv:{gray:true,contrast:34,bright:-12,noise:38,scan:65,vignette:55,scratch:35},
  mosh:{poster:7,bits:5,rgb:18,blocks:22,sort:12,melt:20,echo:65,ghost:35}, ascii:{ascii:13,contrast:40,edge:20},
  thermal:{poster:8,sat:300,hue:-90,solar:120,noise:15,duotone:60}, poster:{poster:5,half:14,contrast:25,sat:60,posterBurn:45},
  fracture:{shred:55,blocks:45,blockDrift:180,rgb:24,tiles:4,blockInvert:50}, ritual:{kaleido:8,hue:120,edge:55,glow:45,vignette:42,tunnel:32},
  dirty:{contrast:18,sat:-18,rgb:9,noise:24,scan:55,wobble:7,vignette:38,scratch:45,lineOffset:30}
};

let s = { ...defaults }, base = { ...defaults }, rate = {}, lfo = {}, sweep = {};
let media = 'none', ready = false, playing = false, last = 0, lastDraw = 0, frame = 0, started = false;
let tmp = document.createElement('canvas'), tctx = tmp.getContext('2d', { willReadFrequently: true });
let fx = document.createElement('canvas'), fctx = fx.getContext('2d', { willReadFrequently: true });
let echo = document.createElement('canvas'), ectx = echo.getContext('2d', { willReadFrequently: true });

function label(k){ return k.replace(/([A-Z])/g,' $1').replace(/^./, c => c.toUpperCase()); }
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function byte(v){ return clamp(v,0,255); }
function paramStep(k){ return ranges[k] ? ranges[k][2] : 1; }

function initState(){
  s = { ...defaults }; base = { ...defaults };
  for (const k in ranges) {
    rate[k] = 0;
    lfo[k] = { mode:'off', amt:0, hz:1 };
    if (!sweep[k]) sweep[k] = { timer:null, dir:0 };
  }
}
function build(){
  controls.innerHTML = '';
  for (const [name, keys] of groups) {
    const g = document.createElement('section');
    g.className = 'group';
    g.innerHTML = '<h2>' + name + '</h2>';
    keys.forEach(k => g.appendChild(control(k)));
    controls.appendChild(g);
  }
  sync(true);
}
function control(k){
  if (typeof defaults[k] === 'boolean') {
    const l = document.createElement('label');
    l.className = 'check';
    l.innerHTML = `<input type="checkbox" data-bool="${k}"> ${label(k)}`;
    return l;
  }
  const [min,max,step] = ranges[k];
  const d = document.createElement('div');
  d.className = 'ctrl';
  d.innerHTML = `<label>${label(k)}</label><span class="val" id="v-${k}">0</span>
    <input type="range" min="${min}" max="${max}" step="${step}" data-k="${k}">
    <div class="mini"><input title="change per second" type="number" step=".01" value="0" data-rate="${k}"><select title="LFO" data-mode="${k}"><option>off</option><option>sine</option><option>tri</option><option>square</option><option>noise</option><option>beat</option></select><input title="LFO amount" type="number" step=".01" value="0" data-amt="${k}"></div>
    <div class="sweep"><button type="button" data-sweep="${k}" data-dir="1">L→R</button><button type="button" data-sweep="${k}" data-dir="-1">R→L</button><input title="jump size" type="number" step="${step}" value="${step}" data-jump="${k}"><input title="change interval in ms" type="number" min="16" step="10" value="120" data-ms="${k}"></div>`;
  return d;
}
controls.addEventListener('input', e => {
  const k = e.target.dataset.k, b = e.target.dataset.bool;
  if (k) setParam(k, +e.target.value, true);
  if (b) { base[b] = s[b] = e.target.checked; }
  if (e.target.dataset.rate) rate[e.target.dataset.rate] = +e.target.value || 0;
  if (e.target.dataset.mode) lfo[e.target.dataset.mode].mode = e.target.value;
  if (e.target.dataset.amt) lfo[e.target.dataset.amt].amt = +e.target.value || 0;
  sync(false); renderStaticIfNeeded();
});
controls.addEventListener('click', e => {
  const k = e.target.dataset.sweep;
  if (!k) return;
  const dir = +e.target.dataset.dir;
  toggleSweep(k, dir);
});
function setParam(k, value, setBase=false){
  if (ranges[k]) value = clamp(value, ranges[k][0], ranges[k][1]);
  s[k] = value;
  if (setBase) base[k] = value;
}
function toggleSweep(k, dir){
  if (sweep[k]?.timer && sweep[k].dir === dir) { stopSweep(k); sync(false); return; }
  stopSweep(k);
  const [min,max] = ranges[k];
  setParam(k, dir > 0 ? min : max, true);
  const msInput = document.querySelector(`[data-ms="${k}"]`);
  const jumpInput = document.querySelector(`[data-jump="${k}"]`);
  const tick = () => {
    const ms = Math.max(16, +(msInput?.value || 120));
    const jump = Math.max(paramStep(k), Math.abs(+(jumpInput?.value || paramStep(k))));
    let next = base[k] + dir * jump;
    if (next > max) next = min;
    if (next < min) next = max;
    setParam(k, next, true);
    sync(false);
    renderStaticIfNeeded();
    clearInterval(sweep[k].timer);
    sweep[k].timer = setInterval(tick, ms);
  };
  sweep[k] = { timer:setInterval(tick, Math.max(16, +(msInput?.value || 120))), dir };
  sync(false); renderStaticIfNeeded();
}
function stopSweep(k){ if (sweep[k]?.timer) clearInterval(sweep[k].timer); sweep[k] = { timer:null, dir:0 }; }
function stopAllSweeps(){ for (const k in sweep) stopSweep(k); }
function sync(input){
  document.querySelectorAll('[data-k]').forEach(el => {
    const k = el.dataset.k;
    if (input || document.activeElement !== el) el.value = s[k];
    const v = $('v-' + k);
    if (v) v.textContent = (+s[k]).toFixed((el.step || '1').includes('.') ? 1 : 0);
  });
  document.querySelectorAll('[data-bool]').forEach(el => { if (input) el.checked = !!s[el.dataset.bool]; });
  document.querySelectorAll('[data-sweep]').forEach(btn => {
    const k = btn.dataset.sweep, dir = +btn.dataset.dir;
    btn.classList.toggle('active', !!sweep[k]?.timer && sweep[k].dir === dir);
  });
  readout.textContent = `${media} ${ready?'ready':'empty'} ${canvas.width}x${canvas.height} ${media==='image'?'PNG still output':'video frame output'}`;
}

function load(f){
  const url = URL.createObjectURL(f);
  ready = false; placeholder.style.display = 'none'; video.pause(); video.removeAttribute('src'); img.removeAttribute('src');
  frame = 0;
  if (f.type.startsWith('image/')) {
    media = 'image'; playing = false;
    img.onload = () => { ready = true; resize(); drawOnce(); loopStart(); };
    img.src = url;
  } else if (f.type.startsWith('video/')) {
    media = 'video'; playing = true;
    video.src = url;
    video.onloadedmetadata = () => { ready = true; resize(); video.play(); loopStart(); };
  }
  sync(false);
}
file.onchange = e => e.target.files[0] && load(e.target.files[0]);
['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('drag'); e.dataTransfer.files[0] && load(e.dataTransfer.files[0]); });
function size(){ return media === 'video' ? [video.videoWidth, video.videoHeight] : media === 'image' ? [img.naturalWidth, img.naturalHeight] : [0,0]; }
function src(){ return media === 'video' ? video : img; }
function resize(){
  let [w,h] = size(); if (!w) return;
  w = Math.max(16, Math.floor(w * s.scale)); h = Math.max(16, Math.floor(h * s.scale));
  if (canvas.width !== w || canvas.height !== h) for (const c of [canvas,tmp,fx,echo]) { c.width = w; c.height = h; }
}
function loopStart(){ if (!started) { started = true; last = performance.now(); requestAnimationFrame(loop); } }
function renderStaticIfNeeded(){ if (media === 'image' && !playing && ready) drawOnce(); }
function loop(t){
  requestAnimationFrame(loop);
  if (!ready) return;
  const dt = Math.min(.1, (t - last) / 1000 || 0); last = t;
  if (playing) mods(t/1000, dt);
  if (media === 'image' && !playing) return;
  if (media === 'video' && video.paused && !playing) return;
  if (t - lastDraw < 1000 / s.fps) return;
  lastDraw = t; draw(t);
}
function drawOnce(){ mods(performance.now()/1000, 0); draw(performance.now()); }
function mods(time, dt){
  const masterSpeed = +(master?.value || 1), a = +(macroA?.value || 0), b = +(macroB?.value || 0), beat = +(bpm?.value || 120) / 60;
  for (const k in ranges) {
    const [min,max] = ranges[k];
    base[k] = clamp(base[k] + (rate[k] || 0) * dt * masterSpeed, min, max);
    const m = lfo[k] || { mode:'off', amt:0, hz:1 };
    let x = 0, p = time * (m.mode === 'beat' ? beat : m.hz || 1) * masterSpeed;
    if (m.mode === 'sine') x = Math.sin(p * Math.PI * 2);
    else if (m.mode === 'tri') x = 2 * Math.abs(2 * (p - Math.floor(p + .5))) - 1;
    else if (m.mode === 'square' || m.mode === 'beat') x = Math.sin(p * Math.PI * 2) > 0 ? 1 : -1;
    else if (m.mode === 'noise') x = Math.random() * 2 - 1;
    s[k] = clamp(base[k] + x * m.amt + (a - b) * m.amt * .2, min, max);
  }
}
function draw(t){
  resize(); frame++;
  const w = canvas.width, h = canvas.height;
  tctx.clearRect(0,0,w,h); tctx.save(); tctx.translate(w/2,h/2); if (s.mirror) tctx.scale(-1,1); tctx.drawImage(src(),-w/2,-h/2,w,h); tctx.restore();
  ctx.clearRect(0,0,w,h);
  if (s.echo) { ctx.globalAlpha = s.echo / 100; ctx.drawImage(echo,0,0); ctx.globalAlpha = 1; }
  if (s.kaleido > 1) kaleido(w,h); else if (s.tiles > 1) tiles(w,h); else wobble(w,h,t);
  if (s.ripples) ripple(w,h,t);
  if (s.rgb || s.chromaNoise) rgb(t);
  pixels(w,h,t);
  if (s.glow) glow(w,h);
  if (s.edge) edge(w,h);
  if (s.emboss) emboss(w,h);
  if (s.half) half(w,h);
  if (s.ascii) ascii(w,h);
  if (s.pixel > 1) pixel(w,h);
  if (s.sort) sortPix(w,h);
  if (s.blocks) blocks(w,h);
  if (s.blockInvert) invertBlocks(w,h);
  if (s.melt) melt(w,h);
  if (s.shred) shred(w,h);
  if (s.lineOffset) lineOffset(w,h,t);
  if (s.tunnel) tunnel(w,h);
  if (s.prism) prism(w,h,t);
  if (s.ghost) ghost(w,h,t);
  if (s.scan) scan(w,h,t);
  if (s.scratch) scratches(w,h);
  if (s.bands) bands(w,h,t);
  if (s.strobe && Math.sin(t/1000*s.strobeRate*Math.PI*2) > 0) flash(w,h);
  if (s.vignette) vignette(w,h);
  ectx.drawImage(canvas,0,0);
  sync(false);
}
function wobble(w,h,t){ if (!s.wobble) { ctx.drawImage(tmp,0,0); return; } for (let y=0;y<h;y+=2){ const dx=Math.sin(y/h*s.wobbleFreq*Math.PI*2+t/1000*s.wave)*s.wobble; ctx.drawImage(tmp,0,y,w,2,dx,y,w,2); } }
function ripple(w,h,t){ fctx.clearRect(0,0,w,h); fctx.drawImage(canvas,0,0); for (let y=0;y<h;y+=2){ const dx=Math.sin((y+t*.03)/h*s.rippleFreq*Math.PI*2)*s.ripples*.45; ctx.drawImage(fx,0,y,w,2,dx,y,w,2); } }
function kaleido(w,h){ const n=Math.max(1,Math.floor(s.kaleido)); ctx.save(); ctx.translate(w/2,h/2); for(let i=0;i<n;i++){ ctx.save(); ctx.rotate(i*Math.PI*2/n); if(i%2)ctx.scale(-1,1); ctx.drawImage(tmp,-w/2,-h/2,w,h); ctx.restore(); } ctx.restore(); }
function tiles(w,h){ const n=Math.max(2,Math.floor(s.tiles)); for(let y=0;y<n;y++)for(let x=0;x<n;x++){ ctx.save(); ctx.translate(x*w/n,y*h/n); if((x+y)%2)ctx.scale(-1,1); ctx.drawImage(tmp,0,0,w,h,((x+y)%2?-w/n:0),0,w/n,h/n); ctx.restore(); } }
function rgb(t){ const amp=s.rgb + s.chromaNoise * Math.random()*.5, a=s.angle*Math.PI/180, dx=Math.cos(a)*amp, dy=Math.sin(a)*amp; ctx.globalCompositeOperation='screen'; ctx.globalAlpha=.55; ctx.filter='sepia(1) saturate(8) hue-rotate(-45deg)'; ctx.drawImage(canvas,dx,dy); ctx.filter='sepia(1) saturate(8) hue-rotate(75deg)'; ctx.drawImage(canvas,-dx*.7,-dy*.7); ctx.filter='none'; ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over'; }
function pixels(w,h,t){
  const imgd=ctx.getImageData(0,0,w,h),d=imgd.data,c=(259*(s.contrast+255))/(255*(259-s.contrast)),lev=s.poster||Math.pow(2,Math.round(s.bits));
  for(let i=0;i<d.length;i+=4){ let r=c*(d[i]-128)+128+s.bright,g=c*(d[i+1]-128)+128+s.bright,b=c*(d[i+2]-128)+128+s.bright,[hh,ss,ll]=rgbToHsl(r,g,b); hh=(hh+s.hue/360+1)%1; ss=clamp(ss*(1+s.sat/100),0,1); [r,g,b]=hslToRgb(hh,ss,ll); if(s.gray){let y=.299*r+.587*g+.114*b;r=g=b=y} if(s.invert){r=255-r;g=255-g;b=255-b} if(s.solar&&((r+g+b)/3)>s.solar){r=255-r;g=255-g;b=255-b} if(s.duotone){const y=(r+g+b)/3/255,amt=s.duotone/100;r=r*(1-amt)+(40+220*y)*amt;g=g*(1-amt)+(20+80*y)*amt;b=b*(1-amt)+(120+120*(1-y))*amt} if(s.posterBurn){const y=(r+g+b)/3;if(y<80*s.posterBurn/100){r*=1.4;g*=.35;b*=.18}} if(lev<256){r=Math.round(r/255*(lev-1))/(lev-1)*255;g=Math.round(g/255*(lev-1))/(lev-1)*255;b=Math.round(b/255*(lev-1))/(lev-1)*255} if(s.noise){let n=(Math.random()*2-1)*s.noise;r+=n;g+=n;b+=n} d[i]=byte(r);d[i+1]=byte(g);d[i+2]=byte(b); }
  ctx.putImageData(imgd,0,0);
}
function edge(w,h){ const im=ctx.getImageData(0,0,w,h),d=im.data,o=ctx.createImageData(w,h),od=o.data; for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){let i=(y*w+x)*4,a=(d[i]+d[i+1]+d[i+2])/3,b=(d[i+4]+d[i+5]+d[i+6])/3,c=(d[i+w*4]+d[i+w*4+1]+d[i+w*4+2])/3,e=Math.min(255,Math.abs(a-b)+Math.abs(a-c))*s.edge/40;od[i]=e;od[i+1]=e*.4+80;od[i+2]=255;od[i+3]=e} ctx.globalCompositeOperation='screen';ctx.putImageData(o,0,0);ctx.globalCompositeOperation='source-over'; }
function glow(w,h){ ctx.save(); ctx.globalCompositeOperation='screen'; ctx.globalAlpha=s.glow/120; ctx.filter=`blur(${Math.max(1,s.glow/10)}px) saturate(1.8)`; ctx.drawImage(canvas,0,0); ctx.filter='none'; ctx.restore(); }
function emboss(w,h){ fctx.clearRect(0,0,w,h); fctx.drawImage(canvas,0,0); ctx.save(); ctx.globalAlpha=s.emboss/100; ctx.globalCompositeOperation='overlay'; ctx.filter='grayscale(1) contrast(2)'; ctx.drawImage(fx,-2,-2); ctx.globalCompositeOperation='difference'; ctx.drawImage(fx,2,2); ctx.filter='none'; ctx.restore(); }
function half(w,h){ const st=Math.max(3,Math.floor(s.half)); ctx.save();ctx.globalCompositeOperation='multiply'; for(let y=0;y<h;y+=st)for(let x=0;x<w;x+=st){let p=ctx.getImageData(x,y,1,1).data,br=(p[0]+p[1]+p[2])/765;ctx.beginPath();ctx.fillStyle='#000';ctx.arc(x,y,(1-br)*st*.55,0,Math.PI*2);ctx.fill()} ctx.restore(); }
function ascii(w,h){ const st=Math.max(4,Math.floor(s.ascii)),im=ctx.getImageData(0,0,w,h),d=im.data,ch=' .:-=+*#%@'; ctx.fillStyle='#05050a';ctx.fillRect(0,0,w,h);ctx.font=st+'px monospace';ctx.fillStyle='#dffcff'; for(let y=0;y<h;y+=st)for(let x=0;x<w;x+=st){let i=(y*w+x)*4,br=(d[i]+d[i+1]+d[i+2])/765;ctx.fillText(ch[Math.floor(br*(ch.length-1))],x,y+st)} }
function pixel(w,h){ const p=Math.max(1,s.pixel); tctx.imageSmoothingEnabled=false;tctx.drawImage(canvas,0,0,w/p,h/p);ctx.imageSmoothingEnabled=false;ctx.drawImage(tmp,0,0,w/p,h/p,0,0,w,h);ctx.imageSmoothingEnabled=true; }
function sortPix(w,h){ const im=ctx.getImageData(0,0,w,h),d=im.data,rows=Math.floor(h*s.sort/100); for(let n=0;n<rows;n++){let y=Math.floor(Math.random()*h),row=[];for(let x=0;x<w;x++){let i=(y*w+x)*4,br=(d[i]+d[i+1]+d[i+2])/3;if(br>110)row.push([br,d[i],d[i+1],d[i+2],x])}row.sort((a,b)=>a[0]-b[0]);row.forEach((p,j)=>{let i=(y*w+p[4])*4;d[i]=row[j][1];d[i+1]=row[j][2];d[i+2]=row[j][3]})} ctx.putImageData(im,0,0); }
function blocks(w,h){ for(let i=0;i<s.blocks;i++){let bw=4+Math.random()*s.blockSize,bh=4+Math.random()*s.blockSize,x=Math.random()*w,y=Math.random()*h;ctx.drawImage(canvas,x,y,bw,bh,x+(Math.random()*2-1)*s.blockDrift,y,bw,bh)} }
function invertBlocks(w,h){ for(let i=0;i<s.blockInvert/2;i++){let bw=10+Math.random()*90,bh=10+Math.random()*90,x=Math.random()*(w-bw),y=Math.random()*(h-bh);fx.width=bw;fx.height=bh;fctx.filter='invert(1) hue-rotate(90deg)';fctx.drawImage(canvas,x,y,bw,bh,0,0,bw,bh);fctx.filter='none';ctx.drawImage(fx,x,y)} fx.width=w;fx.height=h; }
function melt(w,h){ for(let x=0;x<w;x+=4)if(Math.random()<s.melt/100)ctx.drawImage(canvas,x,0,3,h,x,Math.random()*20,3,h); }
function shred(w,h){ for(let y=0;y<h;y+=8)if(Math.random()<s.shred/100)ctx.drawImage(canvas,0,y,w,6,(Math.random()*2-1)*80,y,w,6); }
function lineOffset(w,h,t){ for(let y=0;y<h;y+=5)if(Math.random()<.25)ctx.drawImage(canvas,0,y,w,3,Math.sin(y*.07+t*.002)*s.lineOffset,y,w,3); }
function tunnel(w,h){ ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=s.tunnel/180;for(let i=1;i<8;i++){let sc=1-i*.045*s.tunnel/100;ctx.drawImage(canvas,w*(1-sc)/2,h*(1-sc)/2,w*sc,h*sc)}ctx.restore(); }
function prism(w,h,t){ ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=s.prism/160;for(let i=0;i<3;i++){ctx.save();ctx.translate(w/2,h/2);ctx.rotate((i-1)*s.prism*.002*Math.sin(t*.001));ctx.drawImage(canvas,-w/2+(i-1)*s.prism*.25,-h/2,w,h);ctx.restore()}ctx.restore(); }
function ghost(w,h,t){ ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=s.ghost/140;ctx.drawImage(canvas,Math.sin(t*.002)*s.ghost*.7,Math.cos(t*.0015)*s.ghost*.35);ctx.restore(); }
function scan(w,h,t){ ctx.save();ctx.globalAlpha=s.scan/100;ctx.fillStyle='#000';for(let y=(t/80)%4;y<h;y+=4)ctx.fillRect(0,y,w,1);ctx.restore(); }
function scratches(w,h){ ctx.save();ctx.globalAlpha=s.scratch/140;ctx.strokeStyle='#fff';for(let i=0;i<s.scratch/2;i++){let x=Math.random()*w;ctx.beginPath();ctx.moveTo(x,Math.random()*h);ctx.lineTo(x+Math.random()*30-15,Math.random()*h);ctx.stroke()}ctx.restore(); }
function bands(w,h,t){ ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=s.bands/100;for(let y=0;y<h;y+=18){ctx.fillStyle=`hsl(${(y+t*.02*s.bandSpeed)%360},100%,55%)`;ctx.fillRect(0,y,w,8)}ctx.restore(); }
function flash(w,h){ ctx.save();ctx.globalAlpha=s.strobe/100;ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.restore(); }
function vignette(w,h){ const g=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.1,w/2,h/2,Math.max(w,h)*.7);g.addColorStop(0,'#0000');g.addColorStop(1,`rgba(0,0,0,${s.vignette/100})`);ctx.fillStyle=g;ctx.fillRect(0,0,w,h); }
function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;let max=Math.max(r,g,b),min=Math.min(r,g,b),h,s,l=(max+min)/2;if(max===min)h=s=0;else{let d=max-min;s=l>.5?d/(2-max-min):d/(max+min);h=max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4;h/=6}return[h,s,l]}
function hslToRgb(h,s,l){let r,g,b;if(s===0)r=g=b=l;else{let f=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p},q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;r=f(p,q,h+1/3);g=f(p,q,h);b=f(p,q,h-1/3)}return[r*255,g*255,b*255]}

document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{ initState(); Object.assign(base,presets[b.dataset.preset]); Object.assign(s,base); sync(true); renderStaticIfNeeded(); });
$('playBtn').onclick=()=>{ if(media==='video'){ if(video.paused){video.play();playing=true}else{video.pause();playing=false} } else { playing=!playing; } loopStart(); sync(false); renderStaticIfNeeded(); };
$('stillBtn').onclick=()=>{ playing=false; if(media==='video')video.pause(); renderStaticIfNeeded(); };
$('fullBtn').onclick=()=>document.fullscreenElement?document.exitFullscreen():$('app').requestFullscreen();
const viewFull = $('viewFullBtn'); if (viewFull) viewFull.onclick=()=>document.fullscreenElement?document.exitFullscreen():canvas.requestFullscreen();
$('resetBtn').onclick=()=>{ stopAllSweeps(); initState(); sync(true); renderStaticIfNeeded(); };
$('randomBtn').onclick=()=>rand(.35); $('chaosBtn').onclick=()=>rand(1);
$('snapBtn').onclick=()=>{ if(media==='image')drawOnce(); const a=document.createElement('a'); a.download=media==='image'?'circuitbend-picture.png':'circuitbend-video-frame.png'; a.href=canvas.toDataURL('image/png'); a.click(); };
function rand(p){ for(const k in ranges){ const [min,max]=ranges[k]; setParam(k, +(min+Math.random()*(max-min)*p).toFixed(2), true); } for(const k in defaults) if(typeof defaults[k]==='boolean') base[k]=s[k]=Math.random()<.18*p; sync(true); renderStaticIfNeeded(); }

initState(); build();