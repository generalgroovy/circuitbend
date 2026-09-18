/* Bounded media lifetime and inexpensive clean frames. No renderer replacement. */
(() => {
  'use strict';
  const notify = message => window.circuitbendWorkspace?.notify(message);
  let request = 0, currentUrl = null, comparing = false, inDraw = false, lastSync = -Infinity;
  let recordingStream = null, commitQueue = Promise.resolve();
  const pixelPass = pixels, drawFrame = draw, syncControls = sync, effective = effectiveState;
  const colorKeys = ['bright','contrast','sat','hue','invert','gray','solar','duotone','posterBurn','poster','bits','noise','dither','threshold'];
  pixels = function(w, h) {
    if (colorKeys.every(key => s[key] === defaults[key])) return;
    return pixelPass(w, h);
  };
  // Compute the budgeted size BEFORE touching canvas dimensions. The old path
  // allocated a large surface and shrank it on every frame, also erasing feedback.
  resize = function() {
    const [sw, sh] = size(); if (!sw || !sh) return;
    const factor = clamp(+quality.value || .75, .2, 1) * clamp(s.scale, .12, 1);
    let w = Math.max(16, Math.floor(sw * factor)), h = Math.max(16, Math.floor(sh * factor));
    const limit = Math.max(.25, +$('renderBudget').value || 2) * 1e6;
    if (w * h > limit) {const ratio = Math.sqrt(limit / (w * h)); w = Math.max(16, Math.floor(w * ratio)); h = Math.max(16, Math.floor(h * ratio));}
    if (canvas.width !== w || canvas.height !== h) for (const surface of [canvas, tmp, fx, echo]) {surface.width = w; surface.height = h;}
    const read = $('resolutionReadout'), text = `source ${sw}×${sh} · live ${w}×${h}`;
    if (read && read.textContent !== text) read.textContent = text;
  };
  // UI events still synchronize immediately; only animation-frame DOM work is throttled.
  draw = function(t) {inDraw = true; try {return drawFrame(t);} finally {inDraw = false;}};
  sync = function(force) {
    const now = performance.now();
    if (inDraw && !force && now - lastSync < 120) return;
    lastSync = now; syncControls(force);
    if (force) {
      document.querySelectorAll('[data-rate]').forEach(node => {node.value = rate[node.dataset.rate] || 0;});
      document.querySelectorAll('[data-mode]').forEach(node => {node.value = lfo[node.dataset.mode]?.mode || 'off';});
      document.querySelectorAll('[data-amt]').forEach(node => {node.value = lfo[node.dataset.amt]?.amt || 0;});
    }
    $('playBtn').textContent = playing ? 'Pause' : 'Play';
    $('playBtn').setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
    $('undoBtn').disabled = undoStack.length === 0;
  };
  effectiveState = function(value) {return comparing ? {...defaults, scale: value.scale, fps: value.fps} : effective(value);};
  $('compareBtn').addEventListener('click', () => {
    comparing = !comparing; $('compareBtn').setAttribute('aria-pressed', String(comparing));
    $('compareBtn').textContent = comparing ? 'Original shown' : 'Compare';
    renderStaticIfNeeded(); notify(comparing ? 'Original source shown. Your effect settings are untouched.' : 'Back to processed output.');
  });
  // Effect history also restores modulation, rather than leaving a prior LFO running.
  const originalSnapshot = snapshot, originalRestore = restoreSnapshot;
  snapshot = function() {return {...originalSnapshot(), rate: {...rate}, lfo: JSON.parse(JSON.stringify(lfo))};};
  restoreSnapshot = function(value) {
    if (!value) return;
    if (value.rate) rate = {...value.rate};
    if (value.lfo) lfo = JSON.parse(JSON.stringify(value.lfo));
    originalRestore(value);
    document.querySelectorAll('[data-rate]').forEach(node => {node.value = rate[node.dataset.rate] || 0;});
    document.querySelectorAll('[data-mode]').forEach(node => {node.value = lfo[node.dataset.mode]?.mode || 'off';});
    document.querySelectorAll('[data-amt]').forEach(node => {node.value = lfo[node.dataset.amt]?.amt || 0;});
  };
  const oldRand = rand;
  rand = function(strength) {
    if (strength >= 1) {oldRand(strength); return;}
    pushUndo(); stopAllSweeps();
    const oldScale = base.scale, oldFps = base.fps;
    initState(false); base.scale = s.scale = oldScale; base.fps = s.fps = oldFps;
    const random = mulberry32(hash32(`${fxSeed.value}|remix|${Date.now()}`));
    const choices = [{rgb: [4,20], scan: [8,30], noise: [2,10]}, {poster: [3,8], sat: [15,70], dither: [8,25]}, {glow: [10,40], hue: [-35,35], ghost: [4,20]}, {pixel: [2,7], contrast: [5,40], rgb: [2,10]}, {ripples: [3,15], prism: [3,20], sat: [10,50]}];
    const look = choices[Math.floor(random() * choices.length)];
    for (const [key, [min, max]] of Object.entries(look)) {setParam(key, Math.round(min + random() * (max - min)), true); groupEnabled[keyGroup[key]] = true;}
    sync(true); renderStaticIfNeeded(); notify('Remixed a few effects. Render size, frame rate and source are unchanged.');
  };
  $('randomBtn').onclick = () => rand(.35);
  function decode(element, url, isVideo) {
    return new Promise((resolve, reject) => {
      const event = isVideo ? 'loadeddata' : 'load';
      const cleanup = () => {clearTimeout(timer); element.removeEventListener(event, done); element.removeEventListener('error', fail);};
      const done = () => {cleanup(); resolve();};
      const fail = () => {cleanup(); reject(new Error('This file could not be decoded. Try another image or a supported video codec.'));};
      const timer = setTimeout(() => {cleanup(); reject(new Error('Media loading timed out. Try a smaller file.'));}, 15000);
      element.addEventListener(event, done, {once: true}); element.addEventListener('error', fail, {once: true});
      element.src = url; if (isVideo) element.load();
    });
  }
  function releaseVideo(element) {element.pause(); element.removeAttribute('src'); element.load();}
  load = async function(fileBlob) {
    if (!(fileBlob instanceof Blob)) return false;
    if (recorder && recorder.state !== 'inactive') {notify('Stop recording before changing source media.'); return false;}
    const isVideo = fileBlob.type.startsWith('video/'), isImage = fileBlob.type.startsWith('image/');
    if (!isVideo && !isImage) {notify('Choose an image or video. The current source has not changed.'); return false;}
    const token = ++request, url = URL.createObjectURL(fileBlob);
    const probe = isVideo ? document.createElement('video') : new Image();
    if (isVideo) {probe.preload = 'auto'; probe.muted = true; probe.playsInline = true;}
    let retained = false;
    try {
      await decode(probe, url, isVideo);
      if (token !== request) return false;
      await (commitQueue = commitQueue.catch(() => {}).then(async () => {
      if (token !== request) return;
      // Decode before replacing the source, so bad files do not destroy the current experiment.
      const target = isVideo ? video : img;
      pushUndo(); ready = false; playing = false; video.pause();
      video.onloadedmetadata = null; img.onload = null;
      await decode(target, url, isVideo);
      if (isVideo) img.removeAttribute('src'); else releaseVideo(video);
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      currentUrl = url; retained = true;
      inputMedia = media = isVideo ? 'video' : 'image'; ready = true; frame = 0;
      placeholder.style.display = 'none';
      playing = isVideo && !matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (playing) {
        try {await video.play();} catch {playing = false; notify('Video is ready. Press Play to start.');}
      }
      resize(); drawOnce(); loopStart(); sync(true);
      document.dispatchEvent(new CustomEvent('circuitbend:media', {detail: {name: fileBlob.name || 'media', kind: media}}));
      }));
      return retained;
    } catch (error) {
      if (token === request) notify(error.message);
      return false;
    } finally {
      if (isVideo) releaseVideo(probe);
      if (!retained) URL.revokeObjectURL(url);
    }
  };
  file.onchange = event => {const selected = event.target.files?.[0]; if (selected) load(selected); event.target.value = '';};
  // Drag anywhere on the preview or sample shelf, not only the narrow drop target.
  const stage = document.querySelector('.stage');
  stage.addEventListener('dragover', event => {if (event.dataTransfer?.types.includes('Files')) event.preventDefault();});
  stage.addEventListener('drop', event => {
    if (event.target.closest('#drop')) return;
    const selected = event.dataTransfer?.files[0]; if (selected) {event.preventDefault(); load(selected);}
  });
  toggleRecording = function() {
    if (recorder && recorder.state === 'recording') {recorder.stop(); return;}
    if (!ready) {notify('Choose a source first.'); return;}
    if (!canvas.captureStream || !window.MediaRecorder) {notify('Recording is unavailable in this browser. PNG export still works.'); return;}
    const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
    const mimeType = types.find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) {notify('No supported recording format was found. PNG export still works.'); return;}
    try {
      recordingStream = canvas.captureStream(clamp(s.fps, 1, 60));
      recorder = new MediaRecorder(recordingStream, {mimeType, videoBitsPerSecond: 6000000}); recordChunks = [];
      const session = recorder, stream = recordingStream;
      recorder.ondataavailable = event => {if (event.data.size) recordChunks.push(event.data);};
      const cleanup = () => {stream.getTracks().forEach(track => track.stop()); recordingStream = null; $('recordBtn').textContent = 'Record video'; $('recordBtn').classList.remove('recording'); $('exportActions').appendChild($('recordBtn')); sync(true);};
      recorder.onerror = () => {cleanup(); notify('Recording failed. Try a different browser or lower preview resolution.');};
      recorder.onstop = () => {
        const blob = new Blob(recordChunks, {type: session.mimeType}); cleanup();
        if (!blob.size) {notify('No frames were recorded.'); return;}
        const url = URL.createObjectURL(blob), extension = session.mimeType.includes('mp4') ? 'mp4' : 'webm';
        download(`circuitbend-recording.${extension}`, url); setTimeout(() => URL.revokeObjectURL(url), 30000);
      };
      recorder.start(250); document.querySelector('.top .actions').appendChild($('recordBtn')); $('recordBtn').textContent = 'Stop recording'; $('recordBtn').classList.add('recording');
      playing = true;
      if (media === 'video') video.play().catch(() => notify('Press Play to animate the video while recording.'));
      loopStart(); sync(true);
    } catch (error) {
      recordingStream?.getTracks().forEach(track => track.stop()); recordingStream = null; notify(`Could not record: ${error.message}`);
    }
  };
  $('recordBtn').onclick = toggleRecording;
  // Native buttons already handle Space/Enter. Do not run the global Space shortcut twice.
  document.addEventListener('keydown', event => {
    if (event.code === 'Space' && event.target.closest('button,summary,[contenteditable="true"]')) event.stopPropagation();
  });
  window.addEventListener('beforeunload', () => {if (currentUrl) URL.revokeObjectURL(currentUrl); recordingStream?.getTracks().forEach(track => track.stop());});
  window.circuitbendSandbox = {load, get comparing() {return comparing;}, get activeStream() {return recordingStream;}};
  sync(true);
})();
