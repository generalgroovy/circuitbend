(() => {
  'use strict';
  const VERSION=7, MAX_JSON_BYTES=24*1024*1024;
  const saveBtn=document.getElementById('projectSaveBtn'),fileInput=document.getElementById('projectFile');
  if(!saveBtn||!fileInput)return;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const number=(value,min,max,fallback)=>typeof value==='number'&&Number.isFinite(value)?clamp(value,min,max):fallback;
  const text=(value,fallback='',length=4096)=>typeof value==='string'?value.slice(0,length):fallback;
  const boolean=(value,fallback=false)=>typeof value==='boolean'?value:fallback;
  const select=(id,value,fallback)=>[...$(id).options].some(option=>option.value===value)?value:fallback;
  const color=(value,fallback)=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value:fallback;
  const notify=message=>window.circuitbendWorkspace?.notify(message);
  let restoreId=0;

  // Validate all imported fields before decoding or modifying the live experiment.
  function normalize(p) {
    if(!p||p.format!=='circuitbend-project')throw new Error('Not a Circuitbend project file.');
    const version=p.version??1;
    if(!Number.isInteger(version)||version<1||version>VERSION)throw new Error(`Unsupported project version ${version}.`);
    const g=object(p.generator),e=object(p.effects),t=object(p.transport),a=object(p.advanced),o=object(a.overlay),c=object(a.canvas);
    const effectBase={},rates={},lfos={},enabled={};
    for(const[key,initial]of Object.entries(defaults)) {
      effectBase[key]=typeof initial==='boolean'?boolean(object(e.base)[key],initial):number(object(e.base)[key],ranges[key][0],ranges[key][1],initial);
      if(ranges[key]) {
        const span=ranges[key][1]-ranges[key][0],m=object(object(e.lfo)[key]);
        rates[key]=number(object(e.rate)[key],-span,span,0);
        lfos[key]={mode:['off','sine','tri','square','noise','beat'].includes(m.mode)?m.mode:'off',amt:number(m.amt,0,span,0),hz:number(m.hz,0,60,1)};
      }
    }
    for(const[name]of groups)enabled[name]=boolean(object(e.groupEnabled)[name],true);
    const source=object(p.source),ref=object(source.reference);
    const kind=['generated','baked','external','image','video'].includes(source.kind)?source.kind:'generated';
    const reference=source.reference?{sampleId:typeof ref.sampleId==='string'?text(ref.sampleId,'',80):null,name:text(ref.name,'media',256),type:text(ref.type,'',100),size:number(ref.size,0,256*1024*1024,0),lastModified:number(ref.lastModified,0,Number.MAX_SAFE_INTEGER,0)}:null;
    let bakedPng=null;
    if(kind==='baked') {
      if(typeof source.bakedPng!=='string'||source.bakedPng.length>MAX_JSON_BYTES||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(source.bakedPng))throw new Error('The baked source must be an embedded PNG smaller than 24 MB.');
      bakedPng=source.bakedPng;
    }
    let webview=null;
    if(p.webview) {
      const v=object(p.webview),art=object(v.art);
      webview={compact:boolean(v.compact,true),tab:['all','source','art','fx','output'].includes(v.tab)?v.tab:'source',art:{
        pixelShape:select('pixelShape',art.pixelShape,'square'),toneSteps:+select('toneSteps',String(art.toneSteps),'8'),dither:select('artDither',art.dither,'bayer4'),gap:number(art.gap,0,8,0),
        glyphSet:select('glyphSet',art.glyphSet,'dense'),glyphChars:text(art.glyphChars,' .#@',256),glyphInvert:boolean(art.glyphInvert),
        glyphColor:select('glyphColor',art.glyphColor,'source'),glyphAspect:number(art.glyphAspect,.5,2,1),asciiBg:color(art.asciiBg,'#03050a')
      }};
    }
    let mathview=null;
    if(p.mathview) {
      const m=object(p.mathview);
      if(window.circuitbendMath?.concepts.includes(m.engine)) {
        mathview={engine:m.engine};
        for(const key of ['a','b','c','d'])mathview[key]=number(m[key],-10000,10000,0);
        for(const[key,min,max,fallback]of [['detail',1,10,5],['zoom',.05,1000,1],['cx',-10,10,0],['cy',-10,10,0],['density',64,140000,20000],['symmetry',1,12,1],['line',.25,8,1]])mathview[key]=number(m[key],min,max,fallback);
        mathview.color=select('mathColor',m.color,'smooth');mathview.animate=boolean(m.animate);
      }
    }
    const w=object(p.workspace),v=object(p.viewer);
    return {
      format:'circuitbend-project',version:VERSION,
      generator:{prompt:text(g.prompt),seed:text(g.seed,'circuitbend',256),mode:select('genMode',g.mode,'pixel'),engine:select('genEngine',g.engine,'math'),motion:select('genMotion',g.motion,'static'),width:Math.round(number(g.width,64,4096,512)),height:Math.round(number(g.height,64,4096,512)),cell:number(g.cell,2,32,8),speed:number(g.speed,0,4,1)},
      effects:{base:effectBase,rate:rates,lfo:lfos,groupEnabled:enabled,fxSeed:text(e.fxSeed,'fx',256)},
      transport:{master:number(t.master,-4,4,1),macroA:number(t.macroA,0,1,0),macroB:number(t.macroB,0,1,0),bpm:number(t.bpm,20,300,120),quality:select('quality',String(t.quality),'0.75'),mix:number(t.mix,0,1,1),elapsedMs:number(t.elapsedMs,0,86400000,0)},
      advanced:{paletteMode:select('paletteMode',a.paletteMode,'auto'),paletteShift:number(a.paletteShift,-360,360,0),palette:['#081018','#22d3ee','#a855f7','#f8fafc'].map((fallback,index)=>color(a.palette?.[index],fallback)),
        overlay:{enabled:boolean(o.enabled),blend:select('overlayBlend',o.blend,'source-over'),opacity:number(o.opacity,0,1,.5),fit:select('overlayFit',o.fit,'cover'),scale:number(o.scale,.1,4,1),rotate:number(o.rotate,-180,180,0),x:number(o.x,-4096,4096,0),y:number(o.y,-4096,4096,0)},
        canvas:{sizePreset:select('sizePreset',c.sizePreset,'custom'),aspectLock:boolean(c.aspectLock),renderBudget:+select('renderBudget',String(c.renderBudget),'2'),previewZoom:number(c.previewZoom,25,200,100),pixelPreview:boolean(c.pixelPreview)},configMode:select('configMode',a.configMode,'simple')},
      webview,mathview,workspace:p.workspace?{focus:boolean(w.focus,true),previewPinned:boolean(w.previewPinned,true),task:['create','math','style','fx','export'].includes(w.task)?w.task:'create'}:null,
      viewer:p.viewer?{source:['output','source','media'].includes(v.source)?v.source:'output',zoom:number(v.zoom,25,400,100),floating:boolean(v.floating),pixel:boolean(v.pixel),x:number(v.x,0,4000,0),y:number(v.y,0,2000,0),w:number(v.w,260,4096,640),h:number(v.h,190,2160,480)}:null,
      source:{kind,reference,bakedPng,videoTime:number(source.videoTime,0,86400,0)}
    };
  }
  function projectState() {
    if(!ready)throw new Error('Choose or generate a source first.');
    const needsReference=['image','video'].includes(media)||(media==='generated'&&(genEngine.value==='reference'||$('overlayEnabled').checked));
    return {
      format:'circuitbend-project',version:VERSION,savedAt:new Date().toISOString(),
      generator:{prompt:promptEl.value,seed:seedEl.value,mode:genMode.value,engine:genEngine.value,motion:genMotion.value,width:+genW.value,height:+genH.value,cell:+cellSize.value,speed:+genSpeed.value},
      effects:{base:clone(base),groupEnabled:clone(groupEnabled),rate:clone(rate),lfo:clone(lfo),fxSeed:fxSeed.value},
      transport:{master:+master.value,macroA:+macroA.value,macroB:+macroB.value,bpm:+bpm.value,quality:+quality.value,mix:window.circuitbendSandbox?.mix??1,elapsedMs:timelineTime},
      advanced:window.circuitbendAdvanced?.exportState?.()||null,webview:window.circuitbendWebview?.exportState?.()||null,
      mathview:window.circuitbendMath?.exportState?.()||null,workspace:window.circuitbendWorkspace?.exportState?.()||null,viewer:window.circuitbendViewer?.exportState?.()||null,
      source:{kind:media==='generated'?'generated':media==='baked'?'baked':'external',reference:needsReference?window.circuitbendSandbox?.mediaDescriptor():null,
        videoTime:needsReference&&inputMedia==='video'?video.currentTime:0,bakedPng:media==='baked'?sourceCanvas.toDataURL('image/png'):null}
    };
  }
  function matchesReference(expected,actual) {
    return actual&&(!expected||((!expected.name||expected.name===actual.name)&&(!expected.type||expected.type===actual.type)&&(!expected.size||expected.size===actual.size)&&(!expected.lastModified||expected.lastModified===actual.lastModified)));
  }
  async function restoreProject(input) {
    const p=normalize(input),sandbox=window.circuitbendSandbox;
    if(!sandbox)throw new Error('The workspace is still loading.');
    if(sandbox.busy)throw new Error('Finish recording or exporting before loading a project.');
    const id=++restoreId,ref=p.source.reference;let revision=sandbox.sourceRevision;
    const external=['external','image','video'].includes(p.source.kind);
    const needsReference=external||(p.source.kind==='generated'&&(p.generator.engine==='reference'||p.advanced.overlay.enabled));
    let baked=null,sample=null;
    if(p.source.kind==='baked') {
      baked=new Image();baked.src=p.source.bakedPng;
      try{await baked.decode();}catch{throw new Error('The baked PNG could not be decoded. No settings changed.');}
      if(!baked.naturalWidth||!baked.naturalHeight||baked.naturalWidth*baked.naturalHeight>17e6)throw new Error('Baked source exceeds 17 megapixels.');
    }
    if(needsReference) {
      if(ref?.sampleId)sample=window.circuitbendSamples?.createFile(ref.sampleId);
      else if(inputMedia==='none'||!matchesReference(ref,sandbox.mediaDescriptor()))throw new Error(`Reopen ${ref?.name||'the original media'} using Open media, then load this project again. No settings changed.`);
    }
    if(id!==restoreId||revision!==sandbox.sourceRevision||sandbox.busy)return false;
    if(sample&&!(await sandbox.load(sample,{sampleId:ref.sampleId,paused:true})))throw new Error('The project sample could not be loaded.');
    if(id!==restoreId)return false;
    sandbox.cancelPending();revision=sandbox.sourceRevision;await sandbox.setPlaying(false);
    if(needsReference&&inputMedia==='video')await sandbox.seek(p.source.videoTime);
    if(id!==restoreId||revision!==sandbox.sourceRevision||sandbox.busy)return false;
    // Importers may request redraws. Keep ready false until all state is coherent.
    pushUndo();stopAllSweeps();ready=false;playing=false;video.pause();
    try {
      const g=p.generator,e=p.effects,t=p.transport;
      promptEl.value=g.prompt;seedEl.value=g.seed;genMode.value=g.mode;genEngine.value=g.engine;genMotion.value=g.motion;
      genW.value=g.width;genH.value=g.height;cellSize.value=g.cell;genSpeed.value=g.speed;
      base={...e.base};s={...base};rate={...e.rate};lfo=clone(e.lfo);groupEnabled={...e.groupEnabled};fxSeed.value=e.fxSeed;
      master.value=t.master;macroA.value=t.macroA;macroB.value=t.macroB;bpm.value=t.bpm;quality.value=t.quality;
      window.circuitbendAdvanced?.importState?.(p.advanced);window.circuitbendWebview?.importState?.(p.webview);
      window.circuitbendMath?.importState?.(p.mathview);genEngine.value=g.engine;
      window.circuitbendWorkspace?.importState?.(p.workspace);window.circuitbendViewer?.importState?.(p.viewer);
      if(baked){sourceCanvas.width=baked.naturalWidth;sourceCanvas.height=baked.naturalHeight;sourceCtx.drawImage(baked,0,0);media='baked';inputMedia='none';}
      else if(external)media=inputMedia;
      else {media='generated';if(!needsReference)inputMedia='none';}
      timelineTime=t.elapsedMs;frame=0;sandbox.setComparing(false);sandbox.setMix(t.mix);placeholder.style.display='none';ready=true;
      resize();ectx.clearRect(0,0,echo.width,echo.height);drawOnce();loopStart();sync(true);
      document.dispatchEvent(new CustomEvent('circuitbend:project',{detail:{source:p.source}}));
      notify('Project restored, paused for inspection. Press Play to animate.');return true;
    }catch(error){ready=!!size()[0];playing=false;throw error;}
  }
  function saveProject() {
    try {
      const json=JSON.stringify(projectState(),null,2);
      if(json.length>MAX_JSON_BYTES)throw new Error('Project exceeds 24 MB. Export the image separately or use a smaller baked source.');
      const blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob);
      download(`circuitbend-${slug(seedEl.value||'project')||'project'}.json`,url);setTimeout(()=>URL.revokeObjectURL(url),30000);
    }catch(error){notify(error.message);}
  }
  saveBtn.addEventListener('click',saveProject);
  fileInput.addEventListener('change',async event=>{
    const f=event.target.files?.[0];if(!f)return;
    try{if(f.size>MAX_JSON_BYTES)throw new Error('Project file is larger than 24 MB.');await restoreProject(JSON.parse(await f.text()));}
    catch(error){notify(`Could not load project: ${error.message}`);}finally{event.target.value='';}
  });
  window.circuitbendProject={capture:projectState,restore:restoreProject,normalize,save:saveProject};
  function loadViewer(){if(document.querySelector('script[data-circuitbend-viewer]'))return;const v=document.createElement('script');v.src='preview-window.js';v.dataset.circuitbendViewer='1';v.async=false;document.body.appendChild(v)}
  function loadStreamlined(){
    const existing=document.querySelector('script[data-circuitbend-streamlined]');
    if(existing){if(window.circuitbendWorkspace)loadViewer();else existing.addEventListener('load',loadViewer,{once:true});return}
    const w=document.createElement('script');w.src='streamlined.js';w.dataset.circuitbendStreamlined='1';w.async=false;w.addEventListener('load',loadViewer,{once:true});document.body.appendChild(w)
  }
  function loadMathLab(){
    const existing=document.querySelector('script[data-circuitbend-mathlab]');
    if(existing){if(window.circuitbendMath)loadStreamlined();else existing.addEventListener('load',loadStreamlined,{once:true});return}
    const m=document.createElement('script');m.src='mathlab.js';m.dataset.circuitbendMathlab='1';m.async=false;m.addEventListener('load',loadStreamlined,{once:true});document.body.appendChild(m)
  }
  window.addEventListener('load',()=>{const existing=document.querySelector('script[data-circuitbend-webview]');if(existing){loadMathLab();return}const s=document.createElement('script');s.src='webview.js';s.dataset.circuitbendWebview='1';s.async=false;s.addEventListener('load',loadMathLab,{once:true});document.body.appendChild(s)},{once:true});
})();
