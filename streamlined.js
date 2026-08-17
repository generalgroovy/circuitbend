(() => {
  const byId=id=>document.getElementById(id);
  const STORAGE='circuitbend.workspace.v1';
  const state={focus:true,task:'create',previewPinned:true};
  let syncing=false;

  function el(tag,attrs={},html=''){
    const n=document.createElement(tag);
    for(const [k,v] of Object.entries(attrs)){
      if(k==='class')n.className=v;
      else if(k==='text')n.textContent=v;
      else n.setAttribute(k,v);
    }
    if(html)n.innerHTML=html;
    return n;
  }
  function loadLocal(){try{const x=JSON.parse(localStorage.getItem(STORAGE)||'null');if(x)Object.assign(state,x)}catch{}}
  function saveLocal(){try{localStorage.setItem(STORAGE,JSON.stringify(state))}catch{}}
  function fire(node,type='change'){node?.dispatchEvent(new Event(type,{bubbles:true}))}
  function click(id){byId(id)?.click()}
  function legacyTab(name){document.querySelector(`[data-webtab="${name}"]`)?.click()}

  const tasks={
    create:{legacy:'source',label:'Create'},
    math:{legacy:'art',label:'Math'},
    style:{legacy:'art',label:'Style'},
    fx:{legacy:'fx',label:'FX'},
    export:{legacy:'output',label:'Export'}
  };

  function injectStyles(){
    if(document.querySelector('link[data-circuitbend-streamlined]'))return;
    const l=document.createElement('link');l.rel='stylesheet';l.href='streamlined.css';l.dataset.circuitbendStreamlined='1';document.head.appendChild(l);
  }

  function buildTaskbar(){
    if(byId('streamBar'))return;
    const anchor=byId('webviewBar')||document.querySelector('.top');
    if(!anchor)return;
    const bar=el('div',{id:'streamBar',class:'streamBar'});
    bar.innerHTML=`<div class="taskTabs">${Object.entries(tasks).map(([k,v])=>`<button data-task="${k}">${v.label}</button>`).join('')}</div><div class="quickMake"><label>Engine<select id="quickEngine"></select></label><label>Mode<select id="quickMode"></select></label><label class="quickSeed">Seed<input id="quickSeed" type="text"></label><label>Cell<input id="quickCell" type="number" min="2" max="32" step="1"></label><button id="quickGenerate" class="accent">Generate</button><button id="quickVariation">Variation</button></div><div class="streamTools"><span id="streamSummary"></span><button id="previewPin" title="Keep the preview visible while scrolling">Pin preview</button><button id="focusToggle" title="Focus hides secondary controls; Full exposes the complete workstation">Focus</button><details id="moreMenu"><summary>More</summary><div id="moreActions" class="moreActions"></div></details></div>`;
    anchor.after(bar);
  }

  function copySelectOptions(from,to){
    if(!from||!to)return;
    to.innerHTML='';
    [...from.children].forEach(child=>to.appendChild(child.cloneNode(true)));
    to.value=from.value;
  }

  function wireProxy(proxy,source,type='change'){
    if(!proxy||!source)return;
    const sourceEvent=source.tagName==='INPUT'&&source.type==='range'?'input':type;
    proxy.addEventListener(type,()=>{
      if(syncing)return;syncing=true;source.value=proxy.value;fire(source,sourceEvent);fire(source,'change');syncing=false;updateSummary();
    });
    const sync=()=>{if(syncing)return;syncing=true;proxy.value=source.value;syncing=false;updateSummary()};
    source.addEventListener('input',sync);source.addEventListener('change',sync);
  }

  function buildQuickControls(){
    copySelectOptions(genEngine,byId('quickEngine'));
    copySelectOptions(genMode,byId('quickMode'));
    byId('quickSeed').value=seedEl.value;
    byId('quickCell').value=cellSize.value;
    wireProxy(byId('quickEngine'),genEngine);
    wireProxy(byId('quickMode'),genMode);
    wireProxy(byId('quickSeed'),seedEl,'input');
    wireProxy(byId('quickCell'),cellSize,'input');
    byId('quickGenerate')?.addEventListener('click',()=>click('generateBtn'));
    byId('quickVariation')?.addEventListener('click',()=>click('variationBtn'));
  }

  function moveSecondaryActions(){
    const box=byId('moreActions');if(!box)return;
    const ids=['fullBtn','undoBtn','resetBtn','randomBtn','chaosBtn','exportFullBtn','projectSaveBtn'];
    for(const id of ids){const n=byId(id);if(n)box.appendChild(n)}
    const projectFile=byId('projectFile')?.closest('label');if(projectFile)box.appendChild(projectFile);
    const browserSave=byId('savePresetBtn'),browserLoad=byId('loadPresetBtn');if(browserSave)box.appendChild(browserSave);if(browserLoad)box.appendChild(browserLoad);
  }

  function setDetails(openIds=[]){
    if(!state.focus)return;
    document.querySelectorAll('.generator details,.panel details').forEach(d=>{if(d.id)d.open=openIds.includes(d.id)});
    if(state.task==='style'&&byId('artLab'))byId('artLab').open=true;
    if(state.task==='math'&&byId('mathLab'))byId('mathLab').open=true;
  }

  function setTask(task){
    if(!tasks[task])task='create';
    state.task=task;
    document.body.dataset.task=task;
    legacyTab(tasks[task].legacy);
    document.querySelectorAll('[data-task]').forEach(b=>b.classList.toggle('active',b.dataset.task===task));
    if(task==='create')setDetails([]);
    else if(task==='math')setDetails(['mathLab']);
    else if(task==='style')setDetails(['artLab']);
    else if(task==='export')setDetails([]);
    if(task==='math')byId('mathLab')?.scrollIntoView({block:'nearest'});
    if(task==='style')byId('artLab')?.scrollIntoView({block:'nearest'});
    saveLocal();updateSummary();
  }

  function applyFocus(){
    document.body.classList.toggle('streamFocus',!!state.focus);
    document.body.classList.toggle('streamFull',!state.focus);
    const b=byId('focusToggle');if(b){b.textContent=state.focus?'Focus':'Full';b.classList.toggle('active',state.focus)}
    if(state.focus)setTask(state.task);else legacyTab('all');
    saveLocal();
  }

  function applyPreviewPin(){
    document.body.classList.toggle('previewPinned',!!state.previewPinned);
    const b=byId('previewPin');if(b){b.classList.toggle('active',state.previewPinned);b.textContent=state.previewPinned?'Preview pinned':'Pin preview'}
    saveLocal();
  }

  function updateSummary(){
    const n=byId('streamSummary');if(!n)return;
    const w=+genW.value||sourceCanvas.width||0,h=+genH.value||sourceCanvas.height||0;
    n.textContent=`${genEngine.value} · ${genMode.value} · ${w}×${h}`;
  }

  function simplifyLabels(){
    const title=document.querySelector('.generator .sectionTitle');if(title){const span=title.querySelector('span');if(span)span.textContent='source and generation'}
    const fxTitle=document.querySelector('.panel .sectionTitle span');if(fxTitle)fxTitle.textContent='presets';
  }

  function bind(){
    loadLocal();injectStyles();buildTaskbar();buildQuickControls();moveSecondaryActions();simplifyLabels();
    document.querySelectorAll('[data-task]').forEach(b=>b.addEventListener('click',()=>setTask(b.dataset.task)));
    byId('focusToggle')?.addEventListener('click',()=>{state.focus=!state.focus;applyFocus()});
    byId('previewPin')?.addEventListener('click',()=>{state.previewPinned=!state.previewPinned;applyPreviewPin()});
    [genEngine,genMode,genW,genH,seedEl,cellSize].forEach(n=>{n?.addEventListener('input',updateSummary);n?.addEventListener('change',()=>{copySelectOptions(genEngine,byId('quickEngine'));copySelectOptions(genMode,byId('quickMode'));byId('quickSeed').value=seedEl.value;byId('quickCell').value=cellSize.value;updateSummary()})});
    const observer=new MutationObserver(()=>{copySelectOptions(genEngine,byId('quickEngine'));copySelectOptions(genMode,byId('quickMode'));updateSummary()});
    observer.observe(genEngine,{childList:true,subtree:true});observer.observe(genMode,{childList:true,subtree:true});
    applyPreviewPin();applyFocus();updateSummary();
    window.circuitbendWorkspace={
      exportState:()=>({...state}),
      importState:x=>{if(!x)return;Object.assign(state,x);applyPreviewPin();applyFocus();setTask(state.task)},
      setTask,
      setFocus:value=>{state.focus=!!value;applyFocus()}
    };
  }

  if(document.readyState==='complete')bind();else window.addEventListener('load',bind,{once:true});
})();