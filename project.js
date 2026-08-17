(() => {
  const VERSION=2;
  const saveBtn=document.getElementById('projectSaveBtn');
  const fileInput=document.getElementById('projectFile');
  if(!saveBtn||!fileInput)return;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const projectState=()=>({
    format:'circuitbend-project',version:VERSION,savedAt:new Date().toISOString(),
    generator:{prompt:promptEl.value,seed:seedEl.value,mode:genMode.value,engine:genEngine.value,motion:genMotion.value,width:+genW.value,height:+genH.value,cell:+cellSize.value,speed:+genSpeed.value},
    effects:{base:clone(base),groupEnabled:clone(groupEnabled),rate:clone(rate),lfo:clone(lfo),fxSeed:fxSeed.value},
    transport:{master:+master.value,macroA:+macroA.value,macroB:+macroB.value,bpm:+bpm.value,quality:+quality.value},
    advanced:window.circuitbendAdvanced?.exportState?.()||null,
    source:{kind:media==='generated'?'generated':media==='baked'?'baked':'external',bakedPng:media==='baked'&&sourceCanvas.width?sourceCanvas.toDataURL('image/png'):null}
  });
  function saveProject(){
    const json=JSON.stringify(projectState(),null,2),blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob);
    download(`circuitbend-${slug(seedEl.value||'project')||'project'}.json`,url);
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function setSelect(el,value){if(value!=null&&[...el.options].some(o=>o.value===String(value)))el.value=String(value)}
  function syncModulationControls(){
    document.querySelectorAll('[data-rate]').forEach(el=>el.value=rate[el.dataset.rate]??0);
    document.querySelectorAll('[data-mode]').forEach(el=>el.value=lfo[el.dataset.mode]?.mode||'off');
    document.querySelectorAll('[data-amt]').forEach(el=>el.value=lfo[el.dataset.amt]?.amt??0);
  }
  function restoreProject(p){
    if(!p||p.format!=='circuitbend-project')throw new Error('Not a Circuitbend project file');
    if(p.version!=null&&+p.version>VERSION)throw new Error(`Project version ${p.version} is newer than this app supports`);
    pushUndo();stopAllSweeps();
    const g=p.generator||{},e=p.effects||{},t=p.transport||{};
    if(g.prompt!=null)promptEl.value=String(g.prompt);if(g.seed!=null)seedEl.value=String(g.seed);
    setSelect(genMode,g.mode);setSelect(genEngine,g.engine);setSelect(genMotion,g.motion);
    if(Number.isFinite(+g.width))genW.value=clamp(+g.width,64,4096);if(Number.isFinite(+g.height))genH.value=clamp(+g.height,64,4096);
    if(Number.isFinite(+g.cell))cellSize.value=clamp(+g.cell,2,32);if(Number.isFinite(+g.speed))genSpeed.value=clamp(+g.speed,0,4);
    base={...defaults,...(e.base||{})};s={...base};groupEnabled={...groupEnabled,...(e.groupEnabled||{})};
    for(const k in rate)rate[k]=e.rate&&Number.isFinite(+e.rate[k])?+e.rate[k]:0;
    for(const k in lfo){const m=e.lfo?.[k]||{};lfo[k]={mode:['off','sine','tri','square','noise','beat'].includes(m.mode)?m.mode:'off',amt:Number.isFinite(+m.amt)?+m.amt:0,hz:Number.isFinite(+m.hz)?+m.hz:1}}
    if(e.fxSeed!=null)fxSeed.value=String(e.fxSeed);
    if(Number.isFinite(+t.master))master.value=clamp(+t.master,-4,4);if(Number.isFinite(+t.macroA))macroA.value=clamp(+t.macroA,0,1);if(Number.isFinite(+t.macroB))macroB.value=clamp(+t.macroB,0,1);
    if(Number.isFinite(+t.bpm))bpm.value=clamp(+t.bpm,20,300);if(Number.isFinite(+t.quality))setSelect(quality,clamp(+t.quality,.35,1));
    window.circuitbendAdvanced?.importState?.(p.advanced);
    syncModulationControls();
    const baked=p.source?.bakedPng;
    if(p.source?.kind==='baked'&&baked){
      const restoreImg=new Image();restoreImg.onload=()=>{sourceCanvas.width=restoreImg.naturalWidth;sourceCanvas.height=restoreImg.naturalHeight;sourceCtx.drawImage(restoreImg,0,0);media='baked';inputMedia='none';ready=true;playing=false;placeholder.style.display='none';resize();drawOnce();loopStart();sync(true);syncModulationControls()};restoreImg.onerror=()=>alert('The baked image in this project could not be restored.');restoreImg.src=baked;
    }else{media='generated';ready=true;playing=genMotion.value!=='static';placeholder.style.display='none';generateSource(0);resize();drawOnce();loopStart();sync(true);syncModulationControls()}
  }
  saveBtn.addEventListener('click',saveProject);
  fileInput.addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{restoreProject(JSON.parse(await f.text()))}catch(err){console.error(err);alert(`Could not load project: ${err.message}`)}finally{e.target.value=''}});
})();
