/* Runtime transactions shared by imports, transport, history, recording and export. */
(() => {
  'use strict';
  const notify = message => window.circuitbendWorkspace?.notify(message);
  const copy = value => JSON.parse(JSON.stringify(value));
  let request = 0, pending = null, currentUrl = null, descriptor = null;
  let comparing = false, mix = 1, inDraw = false, lastSync = -Infinity;
  let exporting = false, recording = null, disposed = false, renderErrors = 0;
  let redoStack = [], editing = null, restoringHistory = false;
  const busy = () => exporting || recording !== null;
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const usesVideo = () => inputMedia === 'video' && (media === 'video' || (media === 'generated' && (genEngine.value === 'reference' || $('overlayEnabled').checked)));
  const pixelPass = pixels, drawFrame = draw, syncControls = sync, effective = effectiveState;
  const colorKeys = ['bright','contrast','sat','hue','invert','gray','solar','duotone','posterBurn','poster','bits','noise','dither','threshold'];
  pixels = function(w, h) {
    if (colorKeys.every(key => s[key] === defaults[key])) return;
    return pixelPass(w, h);
  };
  resize = function() {
    const [sw, sh] = size(); if (!sw || !sh) return;
    const factor = clamp(+quality.value || .75, .2, 1) * clamp(s.scale, .12, 1);
    let w = Math.max(16, Math.floor(sw * factor)), h = Math.max(16, Math.floor(sh * factor));
    const limit = Math.max(.25, +$('renderBudget').value || 2) * 1e6;
    if (w * h > limit) {const ratio = Math.sqrt(limit / (w * h)); w = Math.max(16, Math.floor(w * ratio)); h = Math.max(16, Math.floor(h * ratio));}
    // A MediaRecorder stream must not change dimensions halfway through a clip.
    if (recording) [w, h] = recording.size;
    if (canvas.width !== w || canvas.height !== h) for (const surface of [canvas, tmp, fx, echo]) {surface.width = w; surface.height = h;}
    const read = $('resolutionReadout'), text = `source ${sw}×${sh} · live ${w}×${h}`;
    if (read && read.textContent !== text) read.textContent = text;
  };
  draw = function(t) {
    inDraw = true; const live = s;
    try {
      drawFrame(t);
      if (!comparing && mix > 0 && mix < 1) {ctx.save(); ctx.globalAlpha = 1 - mix; ctx.drawImage(tmp, 0, 0); ctx.restore();}
    } catch (error) {
      renderErrors++; playing = false; video.pause();
      notify(`Rendering stopped: ${error.message}. Reset FX or choose another source.`);
    } finally {s = live; inDraw = false;}
  };
  sync = function(force) {
    const now = performance.now();
    if (inDraw && !force && now - lastSync < 120) return;
    lastSync = now; syncControls(force);
    if (force) {
      document.querySelectorAll('[data-rate]').forEach(node => {node.value = rate[node.dataset.rate] || 0;});
      document.querySelectorAll('[data-mode]').forEach(node => {node.value = lfo[node.dataset.mode]?.mode || 'off';});
      document.querySelectorAll('[data-amt]').forEach(node => {node.value = lfo[node.dataset.amt]?.amt || 0;});
      document.querySelectorAll('[data-param-number]').forEach(node => {if (document.activeElement !== node) node.value = s[node.dataset.paramNumber];});
    }
    fpsRead.textContent = playing ? `${drawFps} fps` : 'paused';
    $('playBtn').textContent = playing ? 'Pause' : 'Play';
    $('playBtn').setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
    $('undoBtn').disabled = undoStack.length === 0 || busy();
    if ($('redoBtn')) $('redoBtn').disabled = redoStack.length === 0 || busy();
    if ($('fxMix')) {$('fxMix').value = Math.round(mix * 100); $('fxMixValue').textContent = `${Math.round(mix * 100)}%`;}
    if ($('videoSeek')) {
      const hasVideo = usesVideo() && Number.isFinite(video.duration);
      $('videoSeek').disabled = !hasVideo || busy(); $('videoSeek').max = hasVideo ? video.duration : 1;
      if (document.activeElement !== $('videoSeek')) $('videoSeek').value = hasVideo ? video.currentTime : 0;
      const time = hasVideo ? video.currentTime : timelineTime / 1000;
      $('transportReadout').textContent = `${time.toFixed(2)}s${hasVideo ? ` / ${video.duration.toFixed(2)}s` : ''}`;
    }
  };
  effectiveState = function(value) {return comparing || mix === 0 ? {...defaults, scale: value.scale, fps: value.fps} : effective(value);};
  function setMix(value) {if(exporting)return;mix = Number.isFinite(+value) ? clamp(+value, 0, 1) : 1; sync(false); renderStaticIfNeeded();}
  function setComparing(value) {
    if(exporting)return;comparing = !!value; $('compareBtn').setAttribute('aria-pressed', String(comparing));
    $('compareBtn').textContent = comparing ? 'Original shown' : 'Compare'; renderStaticIfNeeded();
  }
  $('compareBtn').addEventListener('click', () => setComparing(!comparing));

  // Effect history deliberately does not restore an unrelated source seed or prompt.
  snapshot = () => ({base: {...base}, s: {...s}, groupEnabled: {...groupEnabled}, rate: {...rate}, lfo: copy(lfo), fxSeed: fxSeed.value, mix});
  pushUndo = function() {
    if (restoringHistory) return;
    const state = snapshot();
    if (JSON.stringify(undoStack.at(-1)) !== JSON.stringify(state)) undoStack.push(state);
    if (undoStack.length > 40) undoStack.shift(); redoStack = [];
  };
  restoreSnapshot = function(value) {
    if (!value) return;
    stopAllSweeps(); base = {...defaults, ...value.base}; s = {...base};
    for (const key in ranges) {
      rate[key] = Number.isFinite(+value.rate?.[key]) ? +value.rate[key] : 0;
      lfo[key] = value.lfo?.[key] ? {...value.lfo[key]} : {mode:'off', amt:0, hz:1};
    }
    groupEnabled = {...groupEnabled, ...value.groupEnabled};
    if (value.fxSeed != null) fxSeed.value = value.fxSeed;
    mix = Number.isFinite(value.mix) ? value.mix : 1;
    sync(true); renderStaticIfNeeded();
  };
  function historyMove(from, to) {
    if (busy() || !from.length) return;
    to.push(snapshot()); restoringHistory = true;
    try {restoreSnapshot(from.pop());} finally {restoringHistory = false; editing = null; sync(true);}
  }
  const history = {undo: () => historyMove(undoStack, redoStack), redo: () => historyMove(redoStack, undoStack), clear: () => {undoStack = []; redoStack = []; sync(true);}};
  $('undoBtn').onclick = history.undo;
  controls.addEventListener('input', event => {
    const d = event.target.dataset;
    const key = d.k || d.paramNumber || d.bool || d.rate || d.mode || d.amt;
    if (key && editing !== key) {pushUndo(); editing = key;}
  }, {capture:true});
  controls.addEventListener('change', () => {editing = null;});
  controls.addEventListener('focusout', () => {editing = null;});
  const oldRand = rand;
  rand = function(strength) {
    if (busy()) {notify('Finish recording or exporting before remixing.'); return;}
    if (strength >= 1) {oldRand(strength); return;}
    pushUndo(); stopAllSweeps();
    const oldScale = base.scale, oldFps = base.fps;
    initState(false); base.scale = s.scale = oldScale; base.fps = s.fps = oldFps;
    const random = mulberry32(hash32(`${fxSeed.value}|remix|${Date.now()}`));
    const choices = [{rgb:[4,20],scan:[8,30],noise:[2,10]}, {poster:[3,8],sat:[15,70],dither:[8,25]}, {glow:[10,40],hue:[-35,35],ghost:[4,20]}, {pixel:[2,7],contrast:[5,40],rgb:[2,10]}, {ripples:[3,15],prism:[3,20],sat:[10,50]}];
    for (const [key, [min,max]] of Object.entries(choices[Math.floor(random()*choices.length)])) {setParam(key, Math.round(min+random()*(max-min)), true); groupEnabled[keyGroup[key]] = true;}
    sync(true); renderStaticIfNeeded(); notify('Remixed effects. Source, size and frame rate are unchanged.');
  };
  $('randomBtn').onclick = () => rand(.35);

  function cancelPending() {request++; pending?.abort(); pending = null;}
  function sourceChanging() {
    if (busy()) {notify('Finish recording or exporting before changing the source.'); return false;}
    cancelPending(); video.pause(); ectx.clearRect(0,0,echo.width,echo.height); return true;
  }
  async function refreshTransport() {
    if (usesVideo() && playing && !document.hidden) {
      const target = video;
      try {await target.play();} catch {if (target === video) {playing = false; notify('Video is ready. Press Play to start.');}}
    } else video.pause();
    sync(false);
  }
  async function setPlaying(value) {
    if (!ready || exporting || recording?.phase === 'stopping') return;
    playing = !!value; last = performance.now();
    await refreshTransport(); loopStart(); renderStaticIfNeeded(); sync(true);
  }
  $('playBtn').onclick = () => setPlaying(!playing);
  $('stillBtn').onclick = () => setPlaying(false);
  function decode(element, url, isVideo, signal) {
    return new Promise((resolve,reject) => {
      const event = isVideo ? 'loadeddata' : 'load';
      const clean = () => {clearTimeout(timer); element.removeEventListener(event,done); element.removeEventListener('error',fail); signal?.removeEventListener('abort',abort);};
      const done = () => {clean(); resolve();};
      const fail = () => {clean(); reject(new Error('This media could not be decoded. The current source is unchanged.'));};
      const abort = () => {clean(); reject(new DOMException('Superseded by another source','AbortError'));};
      const timer = setTimeout(() => {clean(); reject(new Error('Media loading timed out. Try a smaller file.'));},15000);
      element.addEventListener(event,done,{once:true}); element.addEventListener('error',fail,{once:true});
      signal?.addEventListener('abort',abort,{once:true});
      if (signal?.aborted) {abort(); return;}
      element.src = url; if (isVideo) element.load();
    });
  }
  function releaseVideo(element) {element.pause(); element.removeAttribute('src'); element.load();}
  load = async function(fileBlob, options = {}) {
    if (!(fileBlob instanceof Blob)) return false;
    if (busy()) {notify('Stop recording or exporting before changing media.'); return false;}
    const isVideo = fileBlob.type.startsWith('video/'), isImage = fileBlob.type.startsWith('image/');
    if (!isVideo && !isImage) {notify('Choose an image or video. The current source has not changed.'); return false;}
    if (fileBlob.size > 256*1024*1024) {notify('Choose media smaller than 256 MB.'); return false;}
    cancelPending(); const token = request, controller = new AbortController(); pending = controller;
    const url = URL.createObjectURL(fileBlob), probe = isVideo ? document.createElement('video') : new Image();
    if (isVideo) {probe.preload='auto'; probe.muted=true; probe.loop=true; probe.playsInline=true;}
    let retained = false;
    try {
      await decode(probe,url,isVideo,controller.signal);
      if (token !== request || busy()) return false;
      const w = isVideo ? probe.videoWidth : probe.naturalWidth, h = isVideo ? probe.videoHeight : probe.naturalHeight;
      if (!w || !h || w*h > 17e6) throw new Error('Source dimensions must be nonzero and at most 17 megapixels.');
      // Commit the already decoded node synchronously. No second decode or half-loaded DOM state.
      video.pause();
      if (isVideo) {probe.id='video'; video.replaceWith(probe); releaseVideo(video); video=probe; img.removeAttribute('src');}
      else {probe.id='image'; probe.alt=fileBlob.name||'Source image'; img.replaceWith(probe); img=probe; releaseVideo(video);}
      if (currentUrl) URL.revokeObjectURL(currentUrl); currentUrl=url; retained=true;
      descriptor={name:fileBlob.name||'media',type:fileBlob.type,size:fileBlob.size,lastModified:fileBlob.lastModified||0,sampleId:options.sampleId||null};
      inputMedia=media=isVideo?'video':'image'; ready=true; frame=0; timelineTime=0;
      placeholder.style.display='none'; playing=isVideo&&!reducedMotion()&&!options.paused;
      resize(); ectx.clearRect(0,0,echo.width,echo.height); drawOnce(); loopStart(); sync(true);
      document.dispatchEvent(new CustomEvent('circuitbend:media',{detail:{...descriptor,kind:media}}));
      await refreshTransport(); return token === request;
    } catch(error) {if(token===request&&error.name!=='AbortError')notify(error.message); return false;}
    finally {if(pending===controller)pending=null;if(!retained){if(isVideo)releaseVideo(probe);URL.revokeObjectURL(url);}}
  };
  file.onchange = event => {const selected=event.target.files?.[0];if(selected)load(selected);event.target.value='';};
  const stage=document.querySelector('.stage');
  stage.addEventListener('dragover',event=>{if(event.dataTransfer?.types.includes('Files'))event.preventDefault();});
  stage.addEventListener('drop',event=>{if(event.target.closest('#drop'))return;const selected=event.dataTransfer?.files[0];if(selected){event.preventDefault();load(selected);}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();else{last=performance.now();refreshTransport();}});
  $('overlayEnabled').addEventListener('input',refreshTransport);

  async function seek(seconds) {
    if (busy() || !ready) return false;
    await setPlaying(false);
    let t=Math.max(0,Number.isFinite(+seconds)?+seconds:0);
    if(usesVideo()&&Number.isFinite(video.duration))t=Math.min(t,video.duration);
    timelineTime=t*1000; frame=0; ectx.clearRect(0,0,echo.width,echo.height);
    if(usesVideo()&&Number.isFinite(video.duration)){
      const target=video, value=clamp(t,0,video.duration);
      if(Math.abs(target.currentTime-value)>.001) await new Promise(resolve=>{
        const done=()=>{clearTimeout(timer);target.removeEventListener('seeked',done);resolve();};
        const timer=setTimeout(done,2000);target.addEventListener('seeked',done,{once:true});target.currentTime=value;
      });
    }
    drawOnce();sync(true);return true;
  }
  function lockUI() {
    const saved=new Map();
    const extra=exporting?',.controls input,.controls select,.controls button,.global input,.global select,.global button,[data-preset],[data-look],#fxMix,#compareBtn,#playBtn,#snapBtn':'';
    for(const node of document.querySelectorAll('.generator input,.generator select,.generator button,[data-sample],#projectFile,#randomBtn,#chaosBtn,#resetBtn,#undoBtn,#redoBtn,#quality,#renderBudget,#exportFullBtn,#userPresetApply,[data-k="scale"],[data-k="fps"],[data-param-number="scale"],[data-param-number="fps"],#restartBtn,#stepBtn,#experimentSave,[data-experiment-load],[data-recipe]'+extra)){saved.set(node,node.disabled);node.disabled=true;}
    return ()=>{for(const[node,value]of saved)node.disabled=value;};
  }
  function cloneCanvas(source) {const target=document.createElement('canvas');target.width=source.width;target.height=source.height;target.getContext('2d').drawImage(source,0,0);return target;}
  async function exportFullResolution() {
    if(!ready||busy()){notify('Finish recording/exporting before a full-resolution still.');return false;}
    const[sw,sh]=size();if(!sw||!sh||sw*sh>17e6){notify('Full-resolution export is limited to 17 megapixels.');return false;}
    exporting=true;cancelPending();const unlock=lockUI();
    const prior={playing,baseScale:base.scale,sScale:s.scale,quality:quality.value,budget:$('renderBudget').value,time:timelineTime,frame};
    let output=null,feedback=null;
    playing=false;video.pause();
    try {
      output=cloneCanvas(canvas);feedback=cloneCanvas(echo);
      base.scale=s.scale=1;quality.value='1';$('renderBudget').value='17';
      const failures=renderErrors;draw(timelineTime);
      if(renderErrors!==failures)throw new Error('The full-resolution render failed. Try a smaller source.');
      const blob=await new Promise((resolve,reject)=>{canvas.toBlob(value=>value?resolve(value):reject(new Error('The browser could not encode a PNG.')),'image/png');});
      const url=URL.createObjectURL(blob);download(`circuitbend-${sw}x${sh}.png`,url);setTimeout(()=>URL.revokeObjectURL(url),30000);return true;
    }catch(error){notify(`PNG export failed: ${error.message}`);return false;}
    finally {
      base.scale=prior.baseScale;s.scale=prior.sScale;quality.value=prior.quality;$('renderBudget').value=prior.budget;
      timelineTime=prior.time;frame=prior.frame;resize();
      if(output){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(output,0,0,canvas.width,canvas.height);output.width=1;}
      if(feedback){ectx.clearRect(0,0,echo.width,echo.height);ectx.drawImage(feedback,0,0,echo.width,echo.height);feedback.width=1;}
      exporting=false;unlock();playing=prior.playing;last=performance.now();await refreshTransport();sync(true);
    }
  }
  toggleRecording = function() {
    if(recording){if(recording.phase==='recording'){recording.phase='stopping';$('recordBtn').disabled=true;$('recordBtn').textContent='Finishing…';if(recording.recorder.state!=='inactive')recording.recorder.stop();}return;}
    if(exporting||!ready){notify('Choose a source and finish any export first.');return;}
    if(!canvas.captureStream||!window.MediaRecorder){notify('Recording is unavailable in this browser. PNG export still works.');return;}
    const mimeType=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
    if(!mimeType){notify('No supported recording format. PNG export still works.');return;}
    cancelPending();
    const priorPlaying=playing;let stream=null,unlock=()=>{};
    try {
      stream=canvas.captureStream(clamp(s.fps,1,60));
      const session=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:6000000});
      const state={recorder:session,stream,size:[canvas.width,canvas.height],chunks:[],bytes:0,phase:'recording',failed:false,priorPlaying};
      recorder=session;recording=state;unlock=lockUI();
      const finish=()=>{clearTimeout(state.timer);stream.getTracks().forEach(track=>track.stop());if(recording===state)recording=null;unlock();$('recordBtn').disabled=false;$('recordBtn').textContent='Record video';$('recordBtn').classList.remove('recording');$('exportActions').appendChild($('recordBtn'));playing=priorPlaying;refreshTransport();sync(true);};
      session.ondataavailable=event=>{if(event.data.size){state.chunks.push(event.data);state.bytes+=event.data.size;if(state.bytes>64*1024*1024&&state.phase==='recording'){notify('Recording stopped at the 64 MB safety limit.');toggleRecording();}}};
      session.onerror=()=>{state.failed=true;notify('Recording failed. Try lower resolution or another browser.');};
      session.onstop=()=>{
        const blob=new Blob(state.chunks,{type:session.mimeType});finish();state.chunks=[];
        if(disposed||state.failed||!blob.size)return;
        const url=URL.createObjectURL(blob);download(`circuitbend-recording.${session.mimeType.includes('mp4')?'mp4':'webm'}`,url);setTimeout(()=>URL.revokeObjectURL(url),30000);
      };
      session.start(250);state.timer=setTimeout(()=>{if(recording===state){notify('Recording stopped at the two-minute safety limit.');toggleRecording();}},120000);
      document.querySelector('.top .actions').appendChild($('recordBtn'));$('recordBtn').textContent='Stop recording';$('recordBtn').classList.add('recording');
      playing=true;refreshTransport();loopStart();sync(true);
    }catch(error){stream?.getTracks().forEach(track=>track.stop());recording=null;unlock();$('recordBtn').disabled=false;notify(`Could not record: ${error.message}`);sync(true);}
  };
  $('recordBtn').onclick=toggleRecording;
  document.addEventListener('keydown',event=>{if(event.code==='Space'&&event.target.closest('button,summary,[contenteditable="true"]'))event.stopPropagation();});
  window.addEventListener('beforeunload',()=>{disposed=true;cancelPending();if(currentUrl)URL.revokeObjectURL(currentUrl);recording?.stream.getTracks().forEach(track=>track.stop());});
  window.circuitbendSandbox={load,sourceChanging,cancelPending,refreshTransport,setPlaying,seek,history,setMix,setComparing,exportFullResolution,
    get mix(){return mix;},get comparing(){return comparing;},get activeStream(){return recording?.stream||null;},
    get recordingPhase(){return recording?.phase||'idle';},get busy(){return busy();},get exporting(){return exporting;},get sourceRevision(){return request;},get pending(){return !!pending;},get renderErrors(){return renderErrors;},
    mediaDescriptor:()=>descriptor?{...descriptor}:null};
  sync(true);
})();
