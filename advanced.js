(() => {
  const byId=id=>document.getElementById(id);
  const originalGenerateSource=generateSource;
  const originalPaletteFor=paletteFor;
  const originalResize=resize;
  const sampleCanvas=document.createElement('canvas');
  const sampleCtx=sampleCanvas.getContext('2d',{willReadFrequently:true});
  let aspectRatio=(+genW.value||512)/(+genH.value||512);
  let rackClipboard=null;

  const controlsAdv={
    sourcePreset:byId('sourcePreset'),sourcePresetBtn:byId('sourcePresetBtn'),sizePreset:byId('sizePreset'),aspectLock:byId('aspectLock'),renderBudget:byId('renderBudget'),previewZoom:byId('previewZoom'),pixelPreview:byId('pixelPreview'),resolutionReadout:byId('resolutionReadout'),exportFullBtn:byId('exportFullBtn'),
    paletteMode:byId('paletteMode'),paletteShift:byId('paletteShift'),palette1:byId('palette1'),palette2:byId('palette2'),palette3:byId('palette3'),palette4:byId('palette4'),overlayEnabled:byId('overlayEnabled'),overlayBlend:byId('overlayBlend'),overlayOpacity:byId('overlayOpacity'),overlayFit:byId('overlayFit'),overlayScale:byId('overlayScale'),overlayRotate:byId('overlayRotate'),overlayX:byId('overlayX'),overlayY:byId('overlayY'),
    configMode:byId('configMode'),effectSearch:byId('effectSearch'),activeEffects:byId('activeEffects'),expandRacksBtn:byId('expandRacksBtn'),collapseRacksBtn:byId('collapseRacksBtn'),userPresetName:byId('userPresetName'),userPresetSelect:byId('userPresetSelect'),userPresetSave:byId('userPresetSave'),userPresetApply:byId('userPresetApply'),userPresetDelete:byId('userPresetDelete')
  };

  const sourcePresets={
    calibration:{label:'Calibration card',engine:'calibration',mode:'pixel',motion:'static',prompt:'broadcast calibration card grid circles grayscale color bars',cell:8,palette:'rgb'},
    checker:{label:'Checkerboard',engine:'calibration',mode:'pixel',motion:'static',prompt:'checkerboard alignment grid',cell:16,palette:'mono'},
    ramp:{label:'Gradient ramp',engine:'gradient',mode:'pixel',motion:'static',prompt:'linear grayscale and color gradient ramp',cell:4,palette:'mono'},
    radial:{label:'Radial resolution',engine:'mandala',mode:'pixel',motion:'static',prompt:'radial resolution spokes concentric rings symmetry',cell:4,palette:'mono'},
    geometry:{label:'Geometry sheet',engine:'primitives',mode:'pixel',motion:'static',prompt:'geometric primitives circles rectangles triangles lines alignment',cell:8,palette:'cool'},
    glyphs:{label:'Glyph / text sheet',engine:'textsheet',mode:'pixel',motion:'static',prompt:'ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 symbols glyph reference',cell:12,palette:'mono'},
    scope:{label:'Wave / scope',engine:'waveform',mode:'pixel',motion:'wave',prompt:'oscilloscope sine triangle square lissajous waveform',cell:4,palette:'neon'},
    mandala:{label:'Mandala / symmetry',engine:'mandala',mode:'hybrid',motion:'orbit',prompt:'mandala radial symmetry rings spokes recursive',cell:8,palette:'neon'},
    texture:{label:'Noise / texture',engine:'noise',mode:'pixel',motion:'drift',prompt:'multi scale noise texture terrain clouds grain',cell:6,palette:'earth'},
    sprite:{label:'Sprite primitives',engine:'primitives',mode:'pixel',motion:'static',prompt:'sprite icons robot face ship heart star key potion pixel objects',cell:12,palette:'game'},
    moire:{label:'Moiré field',engine:'gradient',mode:'pixel',motion:'orbit',prompt:'moire interference rings waves high frequency',cell:3,palette:'mono'},
    tiles:{label:'Tile reference',engine:'primitives',mode:'hybrid',motion:'static',prompt:'tile sheet repeating symbols arrows doors walls corners',cell:16,palette:'game'}
  };

  const groupHelp={
    'Render':'Internal render scale and target frame rate. Use Canvas & output for source size and live pixel budget.',
    'Color':'Tone, palette reduction and per-pixel color transforms.',
    'Channel / glitch':'Digital corruption, RGB separation, quantization, blocks and datamosh behavior.',
    'Geometry':'Spatial warps, repetition, mirroring, displacement and structural distortion.',
    'Print / neon':'Edges, halftone/ASCII, scanlines, scratches, glow and display/print artifacts.',
    'Optical recursion':'Temporal echo, ghosting, prism and recursive feedback treatments.'
  };
  const paramHelp={
    scale:'Internal effect resolution relative to the source. It does not change the source canvas size.',fps:'Maximum effect redraw rate.',bright:'Add or remove brightness.',contrast:'Expand or compress tonal contrast.',sat:'Color saturation.',hue:'Rotate hue.',rgb:'Separate RGB channels spatially.',poster:'Reduce colors into posterized steps.',bits:'Bit depth per channel.',noise:'Seeded pixel noise.',pixel:'Pixel block size.',sort:'Pixel sorting strength.',blocks:'Number of glitch blocks.',blockSize:'Maximum corruption block size.',blockDrift:'Horizontal block displacement.',scan:'Scanline opacity.',wobble:'Horizontal line warp.',wobbleFreq:'Number of wobble bands.',wave:'Wobble animation speed/direction.',edge:'Edge detection amount.',half:'Halftone size/amount.',ascii:'ASCII effect cell size.',solar:'Solarization threshold.',melt:'Vertical melt probability.',shred:'Horizontal shred probability.',kaleido:'Kaleidoscope segment count.',tiles:'Repeated tile count.',vignette:'Corner darkening.',strobe:'Flash intensity; use cautiously.',strobeRate:'Flash frequency.',glow:'Bloom-like screen blend.',emboss:'Emboss edge depth.',duotone:'Two-tone mapping amount.',bands:'Animated color band amount.',bandSpeed:'Color band motion.',tunnel:'Recursive tunnel copies.',prism:'Chromatic rotational copies.',ghost:'Offset temporal-style copy.',echo:'Previous-frame persistence.',ripples:'Wave displacement amount.',rippleFreq:'Ripple density.',scratch:'Scratch count/opacity.',posterBurn:'High-contrast poster burn.',blockInvert:'Random inverted blocks.',lineOffset:'Horizontal line offsets.',chromaNoise:'Seeded channel jitter.',dither:'Ordered dither amount.',threshold:'Luminance cut-off.',displace:'Band displacement strength.',feedbackZoom:'Zoom applied to frame feedback.',datamosh:'Temporal slice corruption.'
  };

  function addOption(select,value,label){if(select&&![...select.options].some(o=>o.value===value)){const o=document.createElement('option');o.value=value;o.textContent=label;select.appendChild(o)}}
  [['gradient','Gradient / ramp'],['primitives','Geometry / sprites'],['calibration','Calibration / test card'],['waveform','Waveform / scope'],['mandala','Mandala / radial'],['textsheet','Text / glyph sheet'],['noise','Noise / texture']].forEach(([v,l])=>addOption(genEngine,v,l));
  genW.max=4096;genH.max=4096;

  function hueShiftColor(color,shift){const m=String(color).match(/hsl\(([-\d.]+)/i);if(!m)return color;const h=(+m[1]+shift+3600)%360;return color.replace(/hsl\(([-\d.]+)/i,`hsl(${h}`)}
  function paletteFromMode(mode,shift){
    if(mode==='custom')return [controlsAdv.palette1.value,controlsAdv.palette2.value,controlsAdv.palette3.value,controlsAdv.palette4.value];
    const bases={mono:[0,0,0,0],warm:[6,24,45,340],cool:[175,195,220,260],neon:[185,300,65,25],earth:[35,72,112,165],game:[48,110,196,330],rgb:[0,120,220,300],pastel:[10,85,190,285]};
    const hues=bases[mode]||bases.cool;
    if(mode==='mono')return ['hsl(0 0% 8%)','hsl(0 0% 34%)','hsl(0 0% 68%)','hsl(0 0% 96%)'];
    return hues.map((h,i)=>`hsl(${(h+shift+360)%360} ${mode==='pastel'?62:82}% ${28+i*15}%)`);
  }
  paletteFor=function(c){
    const mode=controlsAdv.paletteMode?.value||'auto',shift=+(controlsAdv.paletteShift?.value||0);
    if(mode==='auto')return originalPaletteFor(c).map(x=>hueShiftColor(x,shift));
    return paletteFromMode(mode,shift);
  };

  function ensureSourceSize(c){if(sourceCanvas.width!==c.w||sourceCanvas.height!==c.h){sourceCanvas.width=c.w;sourceCanvas.height=c.h}sourceCtx.imageSmoothingEnabled=false}
  function clearSource(c,color='#05070b'){ensureSourceSize(c);sourceCtx.globalCompositeOperation='source-over';sourceCtx.globalAlpha=1;sourceCtx.setTransform(1,0,0,1,0,0);sourceCtx.fillStyle=color;sourceCtx.fillRect(0,0,c.w,c.h)}
  function applyGeneratorMode(c){
    if(c.mode==='pixel'&&c.cell<=2)return;
    const sw=Math.max(1,Math.ceil(c.w/c.cell)),sh=Math.max(1,Math.ceil(c.h/c.cell));sampleCanvas.width=sw;sampleCanvas.height=sh;sampleCtx.imageSmoothingEnabled=true;sampleCtx.drawImage(sourceCanvas,0,0,sw,sh);
    const data=sampleCtx.getImageData(0,0,sw,sh).data,chars=' .:-=+*#%@';sourceCtx.clearRect(0,0,c.w,c.h);sourceCtx.imageSmoothingEnabled=false;
    if(c.mode==='pixel'){sourceCtx.drawImage(sampleCanvas,0,0,sw,sh,0,0,c.w,c.h);return}
    sourceCtx.fillStyle='#03050a';sourceCtx.fillRect(0,0,c.w,c.h);sourceCtx.font=`${Math.max(6,c.cell)}px ui-monospace,monospace`;sourceCtx.textBaseline='top';
    for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const i=(y*sw+x)*4,br=(data[i]+data[i+1]+data[i+2])/765,ch=chars[Math.min(chars.length-1,Math.floor(br*(chars.length-1)))],px=x*c.cell,py=y*c.cell;sourceCtx.fillStyle=`rgb(${data[i]},${data[i+1]},${data[i+2]})`;if(c.mode==='hybrid'){sourceCtx.fillRect(px,py,c.cell,c.cell);sourceCtx.fillStyle=br>.55?'#fff9':'#0009'}sourceCtx.fillText(ch,px,py)}
  }
  function drawGradient(c,time){
    clearSource(c);const pal=paletteFor(c),t=motionTime(c,time),p=c.prompt;let g;
    if(p.includes('radial')||p.includes('moire')||p.includes('ring'))g=sourceCtx.createRadialGradient(c.w*.5,c.h*.5,0,c.w*.5,c.h*.5,Math.hypot(c.w,c.h)*.55);else g=sourceCtx.createLinearGradient(0,0,c.w,c.h);
    pal.forEach((col,i)=>g.addColorStop(i/(pal.length-1),col));sourceCtx.fillStyle=g;sourceCtx.fillRect(0,0,c.w,c.h);
    if(p.includes('moire')){sourceCtx.save();sourceCtx.globalCompositeOperation='difference';sourceCtx.strokeStyle='#fff';sourceCtx.globalAlpha=.7;for(let r=8;r<Math.max(c.w,c.h);r+=7){sourceCtx.beginPath();sourceCtx.arc(c.w*.5+Math.sin(t)*c.w*.04,c.h*.5+Math.cos(t*.7)*c.h*.04,r,0,Math.PI*2);sourceCtx.stroke()}sourceCtx.restore()}
    if(p.includes('ramp')){for(let i=0;i<16;i++){sourceCtx.fillStyle=`rgb(${i*17},${i*17},${i*17})`;sourceCtx.fillRect(i*c.w/16,c.h*.78,c.w/16,c.h*.22)}}applyGeneratorMode(c)
  }
  function drawPrimitives(c,time){
    clearSource(c);const pal=paletteFor(c),r=mulberry32(hash32(`${c.seed}|${c.prompt}|primitive`)),t=motionTime(c,time),p=c.prompt;sourceCtx.lineWidth=Math.max(1,c.w/420);sourceCtx.strokeStyle=pal[3];sourceCtx.globalAlpha=.92;
    if(p.includes('sprite')||p.includes('tile')){const cs=Math.max(24,c.cell*4),cols=Math.max(1,Math.floor(c.w/cs)),rows=Math.max(1,Math.floor(c.h/cs));for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){const x=gx*cs+cs/2,y=gy*cs+cs/2,n=(gx+gy*cols)%8;sourceCtx.fillStyle=pal[n%pal.length];sourceCtx.strokeStyle=pal[(n+2)%pal.length];sourceCtx.lineWidth=Math.max(2,cs*.05);sourceCtx.beginPath();if(n===0){sourceCtx.rect(x-cs*.25,y-cs*.22,cs*.5,cs*.44);sourceCtx.moveTo(x-cs*.14,y);sourceCtx.lineTo(x+cs*.14,y)}else if(n===1){sourceCtx.arc(x,y,cs*.24,0,Math.PI*2)}else if(n===2){sourceCtx.moveTo(x,y-cs*.28);sourceCtx.lineTo(x+cs*.26,y+cs*.22);sourceCtx.lineTo(x-cs*.26,y+cs*.22);sourceCtx.closePath()}else if(n===3){for(let k=0;k<5;k++){const a=-Math.PI/2+k*Math.PI*2/5,b=a+Math.PI/5;sourceCtx.lineTo(x+Math.cos(a)*cs*.28,y+Math.sin(a)*cs*.28);sourceCtx.lineTo(x+Math.cos(b)*cs*.12,y+Math.sin(b)*cs*.12)}sourceCtx.closePath()}else if(n===4){sourceCtx.moveTo(x-cs*.28,y);sourceCtx.lineTo(x+cs*.28,y);sourceCtx.moveTo(x,y-cs*.28);sourceCtx.lineTo(x,y+cs*.28)}else if(n===5){sourceCtx.arc(x,y,cs*.26,Math.PI*.1,Math.PI*.9);sourceCtx.arc(x,y+cs*.1,cs*.18,Math.PI*1.1,Math.PI*1.9)}else if(n===6){sourceCtx.rect(x-cs*.26,y-cs*.26,cs*.52,cs*.52);sourceCtx.rect(x-cs*.12,y-cs*.12,cs*.24,cs*.24)}else{sourceCtx.moveTo(x-cs*.25,y-cs*.18);sourceCtx.lineTo(x+cs*.25,y);sourceCtx.lineTo(x-cs*.25,y+cs*.18);sourceCtx.closePath()}sourceCtx.fill();sourceCtx.stroke()}}
    else{for(let i=0;i<48;i++){const x=r()*c.w,y=r()*c.h,sz=(.02+r()*.12)*Math.min(c.w,c.h),a=t*.15+i*.53;sourceCtx.save();sourceCtx.translate(x,y);sourceCtx.rotate(a);sourceCtx.fillStyle=pal[i%pal.length];sourceCtx.strokeStyle=pal[(i+2)%pal.length];sourceCtx.globalAlpha=.25+r()*.65;if(i%4===0)sourceCtx.fillRect(-sz/2,-sz/2,sz,sz);else if(i%4===1){sourceCtx.beginPath();sourceCtx.arc(0,0,sz*.52,0,Math.PI*2);sourceCtx.fill()}else if(i%4===2){sourceCtx.beginPath();sourceCtx.moveTo(0,-sz*.6);sourceCtx.lineTo(sz*.55,sz*.45);sourceCtx.lineTo(-sz*.55,sz*.45);sourceCtx.closePath();sourceCtx.fill()}else{sourceCtx.beginPath();sourceCtx.moveTo(-sz,0);sourceCtx.lineTo(sz,0);sourceCtx.moveTo(0,-sz);sourceCtx.lineTo(0,sz);sourceCtx.stroke()}sourceCtx.restore()}}
    sourceCtx.globalAlpha=1;applyGeneratorMode(c)
  }
  function drawCalibration(c){
    clearSource(c,'#111');const pal=paletteFor(c),p=c.prompt,grid=Math.max(16,Math.floor(Math.min(c.w,c.h)/16));sourceCtx.lineWidth=Math.max(1,c.w/900);sourceCtx.strokeStyle='#ffffff55';
    for(let x=0;x<=c.w;x+=grid){sourceCtx.beginPath();sourceCtx.moveTo(x,0);sourceCtx.lineTo(x,c.h);sourceCtx.stroke()}for(let y=0;y<=c.h;y+=grid){sourceCtx.beginPath();sourceCtx.moveTo(0,y);sourceCtx.lineTo(c.w,y);sourceCtx.stroke()}
    if(p.includes('checker')){for(let y=0;y<c.h;y+=grid)for(let x=0;x<c.w;x+=grid){sourceCtx.fillStyle=((x/grid+y/grid)&1)?'#efefef':'#101010';sourceCtx.fillRect(x,y,grid,grid)}}
    else{const barH=c.h*.18;for(let i=0;i<8;i++){sourceCtx.fillStyle=`hsl(${i*45} 90% 55%)`;sourceCtx.fillRect(i*c.w/8,0,c.w/8,barH)}for(let i=0;i<16;i++){const v=i*17;sourceCtx.fillStyle=`rgb(${v},${v},${v})`;sourceCtx.fillRect(i*c.w/16,c.h-barH,c.w/16,barH)}sourceCtx.strokeStyle=pal[2];sourceCtx.lineWidth=Math.max(2,c.w/500);for(let r=Math.min(c.w,c.h)*.08;r<Math.min(c.w,c.h)*.42;r+=Math.min(c.w,c.h)*.08){sourceCtx.beginPath();sourceCtx.arc(c.w/2,c.h/2,r,0,Math.PI*2);sourceCtx.stroke()}sourceCtx.beginPath();sourceCtx.moveTo(0,c.h/2);sourceCtx.lineTo(c.w,c.h/2);sourceCtx.moveTo(c.w/2,0);sourceCtx.lineTo(c.w/2,c.h);sourceCtx.stroke();sourceCtx.fillStyle='#fff';sourceCtx.font=`bold ${Math.max(12,c.w/40)}px ui-monospace,monospace`;sourceCtx.fillText(`${c.w}×${c.h}`,grid*.5,barH+grid*.9)}applyGeneratorMode(c)
  }
  function drawWaveform(c,time){
    clearSource(c,'#030806');const pal=paletteFor(c),t=motionTime(c,time);sourceCtx.lineWidth=Math.max(1,c.w/700);sourceCtx.strokeStyle='#3cff7650';for(let x=0;x<c.w;x+=Math.max(20,c.w/20)){sourceCtx.beginPath();sourceCtx.moveTo(x,0);sourceCtx.lineTo(x,c.h);sourceCtx.stroke()}for(let y=0;y<c.h;y+=Math.max(20,c.h/12)){sourceCtx.beginPath();sourceCtx.moveTo(0,y);sourceCtx.lineTo(c.w,y);sourceCtx.stroke()}
    for(let wave=0;wave<4;wave++){sourceCtx.strokeStyle=pal[wave];sourceCtx.lineWidth=Math.max(1.5,c.w/550);sourceCtx.beginPath();for(let x=0;x<c.w;x+=2){const u=x/c.w*Math.PI*2,y=c.h*(.2+wave*.2)+Math.sin(u*(wave+1)*2+t*(wave*.3+1)+Math.sin(u*3+t))*c.h*.07;if(x===0)sourceCtx.moveTo(x,y);else sourceCtx.lineTo(x,y)}sourceCtx.stroke()}applyGeneratorMode(c)
  }
  function drawMandala(c,time){
    clearSource(c);const pal=paletteFor(c),t=motionTime(c,time),cx=c.w/2,cy=c.h/2,m=Math.min(c.w,c.h),spokes=c.prompt.includes('resolution')?72:16+(hash32(c.seed)%16);sourceCtx.save();sourceCtx.translate(cx,cy);sourceCtx.lineWidth=Math.max(1,m/700);for(let i=0;i<spokes;i++){const a=i*Math.PI*2/spokes+t*.12;sourceCtx.strokeStyle=pal[i%pal.length];sourceCtx.globalAlpha=.35+.55*(i%3)/2;sourceCtx.beginPath();sourceCtx.moveTo(Math.cos(a)*m*.05,Math.sin(a)*m*.05);sourceCtx.lineTo(Math.cos(a)*m*.46,Math.sin(a)*m*.46);sourceCtx.stroke()}for(let r=m*.06,idx=0;r<m*.48;r+=m*.055,idx++){sourceCtx.strokeStyle=pal[idx%pal.length];sourceCtx.globalAlpha=.7;sourceCtx.beginPath();sourceCtx.arc(0,0,r*(1+.025*Math.sin(t*2+idx)),0,Math.PI*2);sourceCtx.stroke()}sourceCtx.restore();sourceCtx.globalAlpha=1;applyGeneratorMode(c)
  }
  function drawTextSheet(c,time){
    clearSource(c);const pal=paletteFor(c),text=(promptEl.value.trim()||'CIRCUITBEND 0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ !?+-*/#@%'),cell=Math.max(8,c.cell),cols=Math.max(1,Math.floor(c.w/cell));sourceCtx.font=`${cell*.82}px ui-monospace,monospace`;sourceCtx.textBaseline='top';for(let y=0,row=0;y<c.h;y+=cell,row++)for(let x=0,col=0;x<c.w;x+=cell,col++){const i=(row*cols+col+Math.floor(motionTime(c,time)*3))%text.length;sourceCtx.fillStyle=pal[(i+row)%pal.length];sourceCtx.fillText(text[i]||' ',x,y)}if(c.mode==='hybrid')applyGeneratorMode(c)
  }
  function drawNoise(c,time){
    clearSource(c);const pal=paletteFor(c),cell=Math.max(2,c.cell),step=Math.floor(motionTime(c,time)*4);for(let y=0;y<c.h;y+=cell)for(let x=0;x<c.w;x+=cell){const gx=Math.floor(x/cell),gy=Math.floor(y/cell),n=clamp(coordNoise(gx,gy,step)*.48+coordNoise(Math.floor(gx/3),Math.floor(gy/3),step+17)*.32+coordNoise(Math.floor(gx/9),Math.floor(gy/9),step+31)*.2,0,1),idx=Math.min(pal.length-1,Math.floor(n*pal.length));sourceCtx.fillStyle=pal[idx];sourceCtx.fillRect(x,y,cell,cell)}applyGeneratorMode(c)
  }

  function drawOverlay(c,time){
    if(!controlsAdv.overlayEnabled?.checked||inputMedia==='none')return;const [rw,rh]=refSize();if(!rw||!rh)return;const ref=refSource(),fit=controlsAdv.overlayFit.value,scale=+(controlsAdv.overlayScale.value||1),rot=+(controlsAdv.overlayRotate.value||0)*Math.PI/180,panX=+(controlsAdv.overlayX.value||0),panY=+(controlsAdv.overlayY.value||0);let dw=c.w,dh=c.h;if(fit!=='stretch'){const k=fit==='contain'?Math.min(c.w/rw,c.h/rh):fit==='native'?1:Math.max(c.w/rw,c.h/rh);dw=rw*k;dh=rh*k}sourceCtx.save();sourceCtx.globalAlpha=clamp(+(controlsAdv.overlayOpacity.value||.5),0,1);sourceCtx.globalCompositeOperation=controlsAdv.overlayBlend.value;sourceCtx.translate(c.w/2+panX,c.h/2+panY);sourceCtx.rotate(rot);sourceCtx.scale(scale,scale);sourceCtx.drawImage(ref,-dw/2,-dh/2,dw,dh);sourceCtx.restore();sourceCtx.globalAlpha=1;sourceCtx.globalCompositeOperation='source-over'
  }
  generateSource=function(time=0){const c=generatorConfig();if(c.engine==='gradient')drawGradient(c,time);else if(c.engine==='primitives')drawPrimitives(c,time);else if(c.engine==='calibration')drawCalibration(c,time);else if(c.engine==='waveform')drawWaveform(c,time);else if(c.engine==='mandala')drawMandala(c,time);else if(c.engine==='textsheet')drawTextSheet(c,time);else if(c.engine==='noise')drawNoise(c,time);else originalGenerateSource(time);drawOverlay(c,time)};

  function liveBudgetPixels(){return Math.max(.25,+(controlsAdv.renderBudget?.value||2))*1e6}
  resize=function(){originalResize();const max=liveBudgetPixels(),pixels=canvas.width*canvas.height;if(pixels>max){const k=Math.sqrt(max/pixels),w=Math.max(16,Math.floor(canvas.width*k)),h=Math.max(16,Math.floor(canvas.height*k));for(const c of[canvas,tmp,fx,echo]){c.width=w;c.height=h}}updateResolutionReadout()};
  function updateResolutionReadout(){if(!controlsAdv.resolutionReadout)return;const sw=sourceCanvas.width||size()[0]||0,sh=sourceCanvas.height||size()[1]||0,pix=sw*sh/1e6,live=canvas.width*canvas.height/1e6;controlsAdv.resolutionReadout.textContent=`source ${sw}×${sh} (${pix.toFixed(2)} MP) · live ${canvas.width}×${canvas.height} (${live.toFixed(2)} MP)`;controlsAdv.resolutionReadout.classList.toggle('budgetWarn',pix>liveBudgetPixels()/1e6);controlsAdv.resolutionReadout.classList.toggle('budgetHot',pix>12)}

  function applySizePreset(){const v=controlsAdv.sizePreset?.value;if(!v||v==='custom')return;const [w,h]=v.split('x').map(Number);if(!w||!h)return;genW.value=w;genH.value=h;aspectRatio=w/h;if(media==='generated')startGenerated();else updateResolutionReadout()}
  function maintainAspect(changed){if(!controlsAdv.aspectLock?.checked)return;if(changed===genW)genH.value=Math.round((+genW.value||512)/aspectRatio);else genW.value=Math.round((+genH.value||512)*aspectRatio)}
  function clampDimensions(){genW.value=clamp(+genW.value||512,64,4096);genH.value=clamp(+genH.value||512,64,4096);if(!controlsAdv.aspectLock?.checked)aspectRatio=(+genW.value)/(+genH.value)}
  controlsAdv.sizePreset?.addEventListener('change',applySizePreset);controlsAdv.aspectLock?.addEventListener('change',()=>{aspectRatio=(+genW.value||512)/(+genH.value||512)});[genW,genH].forEach(el=>el.addEventListener('change',()=>{maintainAspect(el);clampDimensions();controlsAdv.sizePreset.value='custom';if(media==='generated')startGenerated();updateResolutionReadout()}));controlsAdv.renderBudget?.addEventListener('change',()=>{resize();renderStaticIfNeeded()});
  controlsAdv.previewZoom?.addEventListener('input',()=>{canvas.style.width=`${controlsAdv.previewZoom.value}%`;canvas.style.height='auto'});controlsAdv.pixelPreview?.addEventListener('change',()=>canvas.closest('.preview')?.classList.toggle('pixelPreview',controlsAdv.pixelPreview.checked));

  async function exportFullResolution(){
    if(!ready)return;const [sw,sh]=size();if(!sw||!sh)return;const pixels=sw*sh;if(pixels>17e6){alert('Full-resolution export is limited to about 17 megapixels to avoid exhausting browser memory.');return}const wasPlaying=playing,oldScale=base.scale,oldSScale=s.scale,oldQ=quality.value,oldBudget=controlsAdv.renderBudget.value;playing=false;base.scale=s.scale=1;quality.value='1';controlsAdv.renderBudget.value=String(Math.max(2,Math.ceil(pixels/1e6)));drawOnce();await new Promise(resolve=>canvas.toBlob(blob=>{if(blob){const url=URL.createObjectURL(blob);download(`circuitbend-${canvas.width}x${canvas.height}.png`,url);setTimeout(()=>URL.revokeObjectURL(url),30000)}resolve()},'image/png'));base.scale=s.scale=oldScale;quality.value=oldQ;controlsAdv.renderBudget.value=oldBudget;resize();playing=wasPlaying;if(!playing)drawOnce();sync(true)
  }
  controlsAdv.exportFullBtn?.addEventListener('click',exportFullResolution);

  function applySourcePreset(){const p=sourcePresets[controlsAdv.sourcePreset?.value];if(!p)return;genEngine.value=p.engine;genMode.value=p.mode;genMotion.value=p.motion;promptEl.value=p.prompt;cellSize.value=p.cell;if(controlsAdv.paletteMode)controlsAdv.paletteMode.value=p.palette;startGenerated();updateAdvancedState()}
  controlsAdv.sourcePresetBtn?.addEventListener('click',applySourcePreset);

  const redrawInputs=[controlsAdv.paletteMode,controlsAdv.paletteShift,controlsAdv.palette1,controlsAdv.palette2,controlsAdv.palette3,controlsAdv.palette4,controlsAdv.overlayEnabled,controlsAdv.overlayBlend,controlsAdv.overlayOpacity,controlsAdv.overlayFit,controlsAdv.overlayScale,controlsAdv.overlayRotate,controlsAdv.overlayX,controlsAdv.overlayY];redrawInputs.forEach(el=>el?.addEventListener('input',()=>{renderStaticIfNeeded();updateAdvancedState()}));

  function enhanceRack(group){
    const name=group.dataset.group,head=group.querySelector('.groupHead');if(!head||head.dataset.enhanced)return;head.dataset.enhanced='1';const help=document.createElement('div');help.className='groupHelp';help.textContent=groupHelp[name]||'Effect controls.';head.after(help);
    const mk=(label,action)=>{const b=document.createElement('button');b.type='button';b.className='groupAction';b.textContent=label;b.addEventListener('click',action);head.appendChild(b);return b};
    mk('Random',()=>randomizeGroup(name));mk('Reset',()=>resetGroup(name));mk('Copy',()=>copyGroup(name));mk('Paste',()=>pasteGroup(name));mk('Fold',()=>group.classList.toggle('collapsed'));
  }
  function groupKeys(name){return groups.find(g=>g[0]===name)?.[1]||[]}
  function resetGroup(name){pushUndo();for(const k of groupKeys(name)){base[k]=s[k]=defaults[k];rate[k]=0;lfo[k]={mode:'off',amt:0,hz:1};stopSweep(k)}groupEnabled[name]=true;sync(true);syncNumeric();renderStaticIfNeeded();renderActiveEffects()}
  function randomizeGroup(name){pushUndo();const r=mulberry32(hash32(`${fxSeed.value}|${name}|${Date.now()}`));for(const k of groupKeys(name)){if(typeof defaults[k]==='boolean')base[k]=s[k]=r()<.22;else{const[min,max]=ranges[k];const strength=name==='Render'?.3:.72;base[k]=s[k]=+(min+(max-min)*r()*strength).toFixed(2)}}sync(true);syncNumeric();renderStaticIfNeeded();renderActiveEffects()}
  function copyGroup(name){rackClipboard={name,values:Object.fromEntries(groupKeys(name).map(k=>[k,base[k]])),enabled:groupEnabled[name]!==false}}
  function pasteGroup(name){if(!rackClipboard)return;pushUndo();const target=groupKeys(name),sourceVals=Object.values(rackClipboard.values);target.forEach((k,i)=>{const val=rackClipboard.values[k]??sourceVals[i];if(val==null)return;if(typeof defaults[k]==='boolean')base[k]=s[k]=!!val;else setParam(k,+val,true)});groupEnabled[name]=rackClipboard.enabled;sync(true);syncNumeric();renderStaticIfNeeded();renderActiveEffects()}

  function enhanceParam(range){if(range.dataset.advanced)return;range.dataset.advanced='1';const k=range.dataset.k,ctrl=range.closest('.ctrl');if(!ctrl)return;const labelEl=ctrl.querySelector('label'),valueEl=ctrl.querySelector('.val');const top=document.createElement('div');top.className='ctrlTop';if(labelEl)top.appendChild(labelEl);const num=document.createElement('input');num.type='number';num.className='paramNumber';num.min=range.min;num.max=range.max;num.step=range.step;num.value=range.value;num.dataset.paramNumber=k;if(valueEl)valueEl.style.display='none';top.appendChild(num);ctrl.prepend(top);const hint=document.createElement('small');hint.className='paramHint';hint.textContent=paramHelp[k]||`Adjust ${label(k).toLowerCase()}.`;range.after(hint);range.title=hint.textContent;num.title=hint.textContent;num.addEventListener('input',()=>{range.value=num.value;range.dispatchEvent(new Event('input',{bubbles:true}));renderActiveEffects()});range.addEventListener('input',()=>{num.value=range.value;renderActiveEffects()})
  }
  document.querySelectorAll('.group').forEach(enhanceRack);document.querySelectorAll('input[data-k]').forEach(enhanceParam);document.querySelectorAll('.check').forEach(ch=>{const k=ch.querySelector('[data-bool]')?.dataset.bool;if(k){ch.title=paramHelp[k]||`Toggle ${label(k).toLowerCase()}.`;ch.addEventListener('input',renderActiveEffects)}});

  function syncNumeric(){document.querySelectorAll('[data-param-number]').forEach(n=>{const k=n.dataset.paramNumber;if(document.activeElement!==n)n.value=Number.isFinite(+s[k])?s[k]:base[k]})}
  function renderActiveEffects(){if(!controlsAdv.activeEffects)return;const active=[];for(const k in defaults){const group=keyGroup[k];if(group&&groupEnabled[group]===false)continue;const v=base[k],d=defaults[k],on=typeof d==='boolean'?!!v:Math.abs((+v||0)-(+d||0))>(ranges[k]?.[2]||.01)*.51;if(on)active.push(`${label(k)} ${typeof v==='boolean'?'on':(+v).toFixed((ranges[k]?.[2]||1)<1?1:0)}`)}controlsAdv.activeEffects.innerHTML='';if(!active.length){const x=document.createElement('span');x.className='effectChip muted';x.textContent='No active FX';controlsAdv.activeEffects.appendChild(x);return}active.slice(0,24).forEach(text=>{const x=document.createElement('span');x.className='effectChip';x.textContent=text;controlsAdv.activeEffects.appendChild(x)});if(active.length>24){const x=document.createElement('span');x.className='effectChip muted';x.textContent=`+${active.length-24} more`;controlsAdv.activeEffects.appendChild(x)}}
  controlsAdv.configMode?.addEventListener('change',()=>document.getElementById('app').classList.toggle('simpleConfig',controlsAdv.configMode.value==='simple'));
  controlsAdv.effectSearch?.addEventListener('input',()=>{const q=controlsAdv.effectSearch.value.trim().toLowerCase();document.querySelectorAll('.group').forEach(g=>{let any=false;g.querySelectorAll('.ctrl,.check').forEach(row=>{const match=!q||row.textContent.toLowerCase().includes(q)||row.querySelector('[title]')?.title.toLowerCase().includes(q);row.classList.toggle('hiddenBySearch',!match);any ||= match});g.classList.toggle('hiddenBySearch',!any)})});
  controlsAdv.expandRacksBtn?.addEventListener('click',()=>document.querySelectorAll('.group').forEach(g=>g.classList.remove('collapsed')));controlsAdv.collapseRacksBtn?.addEventListener('click',()=>document.querySelectorAll('.group').forEach(g=>g.classList.add('collapsed')));

  const USER_PRESET_KEY='circuitbend.userPresets.v1';
  function readUserPresets(){try{return JSON.parse(localStorage.getItem(USER_PRESET_KEY)||'{}')||{}}catch{return{}}}
  function writeUserPresets(v){localStorage.setItem(USER_PRESET_KEY,JSON.stringify(v));refreshUserPresets()}
  function refreshUserPresets(){if(!controlsAdv.userPresetSelect)return;const all=readUserPresets(),old=controlsAdv.userPresetSelect.value;controlsAdv.userPresetSelect.innerHTML='<option value="">User preset…</option>';Object.keys(all).sort().forEach(name=>{const o=document.createElement('option');o.value=name;o.textContent=name;controlsAdv.userPresetSelect.appendChild(o)});if(all[old])controlsAdv.userPresetSelect.value=old}
  function saveUserPreset(){const name=(controlsAdv.userPresetName.value||'').trim();if(!name)return;const all=readUserPresets();all[name]={base:{...base},groupEnabled:{...groupEnabled},generator:{prompt:promptEl.value,seed:seedEl.value,mode:genMode.value,engine:genEngine.value,motion:genMotion.value,w:+genW.value,h:+genH.value,cell:+cellSize.value,speed:+genSpeed.value},advanced:exportAdvancedState()};writeUserPresets(all);controlsAdv.userPresetSelect.value=name}
  function applyUserPreset(){const p=readUserPresets()[controlsAdv.userPresetSelect.value];if(!p)return;pushUndo();base={...defaults,...p.base};s={...base};groupEnabled={...groupEnabled,...p.groupEnabled};if(p.generator){promptEl.value=p.generator.prompt||'';seedEl.value=p.generator.seed||seedEl.value;genMode.value=p.generator.mode||genMode.value;genEngine.value=p.generator.engine||genEngine.value;genMotion.value=p.generator.motion||genMotion.value;genW.value=p.generator.w||genW.value;genH.value=p.generator.h||genH.value;cellSize.value=p.generator.cell||cellSize.value;genSpeed.value=p.generator.speed??genSpeed.value}importAdvancedState(p.advanced);sync(true);syncNumeric();startGenerated();renderActiveEffects()}
  function deleteUserPreset(){const name=controlsAdv.userPresetSelect.value;if(!name)return;const all=readUserPresets();delete all[name];writeUserPresets(all)}
  controlsAdv.userPresetSave?.addEventListener('click',saveUserPreset);controlsAdv.userPresetApply?.addEventListener('click',applyUserPreset);controlsAdv.userPresetDelete?.addEventListener('click',deleteUserPreset);refreshUserPresets();

  function exportAdvancedState(){return{paletteMode:controlsAdv.paletteMode?.value,paletteShift:+(controlsAdv.paletteShift?.value||0),palette:[controlsAdv.palette1?.value,controlsAdv.palette2?.value,controlsAdv.palette3?.value,controlsAdv.palette4?.value],overlay:{enabled:!!controlsAdv.overlayEnabled?.checked,blend:controlsAdv.overlayBlend?.value,opacity:+(controlsAdv.overlayOpacity?.value||.5),fit:controlsAdv.overlayFit?.value,scale:+(controlsAdv.overlayScale?.value||1),rotate:+(controlsAdv.overlayRotate?.value||0),x:+(controlsAdv.overlayX?.value||0),y:+(controlsAdv.overlayY?.value||0)},canvas:{sizePreset:controlsAdv.sizePreset?.value,aspectLock:!!controlsAdv.aspectLock?.checked,renderBudget:+(controlsAdv.renderBudget?.value||2),previewZoom:+(controlsAdv.previewZoom?.value||100),pixelPreview:!!controlsAdv.pixelPreview?.checked},configMode:controlsAdv.configMode?.value}}
  function setValue(el,v){if(el&&v!=null)el.value=String(v)}
  function importAdvancedState(a){if(!a)return;setValue(controlsAdv.paletteMode,a.paletteMode);setValue(controlsAdv.paletteShift,a.paletteShift);if(Array.isArray(a.palette))[controlsAdv.palette1,controlsAdv.palette2,controlsAdv.palette3,controlsAdv.palette4].forEach((el,i)=>setValue(el,a.palette[i]));const o=a.overlay||{};if(controlsAdv.overlayEnabled)controlsAdv.overlayEnabled.checked=!!o.enabled;setValue(controlsAdv.overlayBlend,o.blend);setValue(controlsAdv.overlayOpacity,o.opacity);setValue(controlsAdv.overlayFit,o.fit);setValue(controlsAdv.overlayScale,o.scale);setValue(controlsAdv.overlayRotate,o.rotate);setValue(controlsAdv.overlayX,o.x);setValue(controlsAdv.overlayY,o.y);const c=a.canvas||{};setValue(controlsAdv.sizePreset,c.sizePreset);if(controlsAdv.aspectLock&&c.aspectLock!=null)controlsAdv.aspectLock.checked=!!c.aspectLock;setValue(controlsAdv.renderBudget,c.renderBudget);setValue(controlsAdv.previewZoom,c.previewZoom);if(controlsAdv.pixelPreview&&c.pixelPreview!=null)controlsAdv.pixelPreview.checked=!!c.pixelPreview;setValue(controlsAdv.configMode,a.configMode);canvas.style.width=`${controlsAdv.previewZoom?.value||100}%`;canvas.closest('.preview')?.classList.toggle('pixelPreview',!!controlsAdv.pixelPreview?.checked);document.getElementById('app').classList.toggle('simpleConfig',controlsAdv.configMode?.value==='simple');resize();updateAdvancedState()}
  function updateAdvancedState(){updateResolutionReadout();renderActiveEffects()}
  window.circuitbendAdvanced={exportState:exportAdvancedState,importState:importAdvancedState,applySourcePreset,exportFullResolution};

  controlsAdv.configMode?.dispatchEvent(new Event('change'));controlsAdv.pixelPreview?.dispatchEvent(new Event('change'));controlsAdv.previewZoom?.dispatchEvent(new Event('input'));updateAdvancedState();setInterval(()=>{syncNumeric();renderActiveEffects();updateResolutionReadout()},500);
})();
