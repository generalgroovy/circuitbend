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
    create:{legacy:'source',label:'Source'},
    fx:{legacy:'fx',label:'Effects'},
    export:{legacy:'output',label:'Export'},
    math:{legacy:'art',label:'Math'},
    style:{legacy:'art',label:'Style'}
  };

  function injectStyles(){
    if(document.querySelector('link[data-circuitbend-streamlined]'))return;
    const l=document.createElement('link');l.rel='stylesheet';l.href='streamlined.css';l.dataset.circuitbendStreamlined='1';document.head.appendChild(l);
  }

  function buildTaskbar(){
    if(byId('streamBar'))return;
    const anchor=byId('webviewBar')||document.querySelector('.top');
    if(!anchor)return;
    const bar=el('div',{id:'streamBar',class:'streamBar',role:'navigation','aria-label':'Creative workflow'});
    bar.innerHTML=`<div class="taskTabs">${Object.entries(tasks).map(([k,v])=>`<button data-task="${k}">${v.label}</button>`).join('')}</div><div class="streamTools"><details id="moreMenu"><summary>Project &amp; tools</summary><div id="moreActions" class="moreActions"></div></details></div><div class="quickMake"><label>Generator<select id="quickEngine" aria-label="Generator"></select></label><label>Render style<select id="quickMode" aria-label="Render mode"></select></label><button id="quickGenerate" class="accent" title="Generate (Ctrl/Cmd+Enter)">Generate</button><button id="quickVariation" title="Create a seed variation">New variation</button></div>`;
    const menuSummary=bar.querySelector('#moreMenu > summary');menuSummary.setAttribute('aria-label','Project and tools');menuSummary.innerHTML='<span class="menuLabelWide">Project &amp; tools</span><span class="menuLabelNarrow">Tools</span>';
    anchor.after(bar);
  }

  function copySelectOptions(from,to){
    if(!from||!to)return;
    const current=from.value;
    to.innerHTML='';
    [...from.children].forEach(child=>to.appendChild(child.cloneNode(true)));
    to.value=current;
  }

  function wireProxy(proxy,source,type='change'){
    if(!proxy||!source)return;
    const sourceEvent=source.tagName==='INPUT'&&source.type==='range'?'input':type;
    proxy.addEventListener(type,()=>{
      if(syncing)return;syncing=true;source.value=proxy.value;fire(source,sourceEvent);if(sourceEvent!=='change')fire(source,'change');syncing=false;updateSummary();
    });
    const sync=()=>{if(syncing)return;syncing=true;proxy.value=source.value;syncing=false;updateSummary()};
    source.addEventListener('input',sync);source.addEventListener('change',sync);
  }

  function buildQuickControls(){
    copySelectOptions(genEngine,byId('quickEngine'));
    copySelectOptions(genMode,byId('quickMode'));
    wireProxy(byId('quickEngine'),genEngine);
    wireProxy(byId('quickMode'),genMode);
    byId('quickGenerate')?.addEventListener('click',()=>click('generateBtn'));
    byId('quickVariation')?.addEventListener('click',()=>click('variationBtn'));
  }

  function closeMoreMenu(){
    const menu=byId('moreMenu');
    if(!menu?.open)return false;
    menu.open=false;
    menu.querySelector('summary')?.focus();
    return true;
  }

  function moveSecondaryActions(){
    const box=byId('moreActions');if(!box)return;
    const ids=['fullBtn','undoBtn','resetBtn','randomBtn','chaosBtn','recordBtn','exportFullBtn','projectSaveBtn','asciiBtn','useOutputBtn'];
    for(const id of ids){const n=byId(id);if(n)box.appendChild(n)}
    const projectFile=byId('projectFile')?.closest('label');if(projectFile)box.appendChild(projectFile);
    const browserSave=byId('savePresetBtn'),browserLoad=byId('loadPresetBtn');if(browserSave)box.appendChild(browserSave);if(browserLoad)box.appendChild(browserLoad);
    box.append(el('button',{id:'previewPin',text:'Pin preview'}),el('button',{id:'focusToggle',text:'Show all tools'}));
    box.addEventListener('click',e=>{if(e.target.closest('button,.filebtn'))closeMoreMenu()});
  }

  function setDetails(openIds=[]){
    if(!state.focus)return;
    document.querySelectorAll('.generator details,.panel details').forEach(d=>{if(d.id)d.open=openIds.includes(d.id)});
    if(state.task==='style'&&byId('artLab'))byId('artLab').open=true;
    if(state.task==='math'&&byId('mathLab'))byId('mathLab').open=true;
  }

  function setTask(task,fromNavigation=false){
    if(!tasks[task])task='create';
    state.task=task;
    document.body.dataset.task=task;
    legacyTab(state.focus?tasks[task].legacy:'all');
    document.querySelectorAll('.taskTabs [data-task]').forEach(b=>{const active=b.dataset.task===task;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
    if(state.focus){
      if(task==='create')setDetails([]);
      else if(task==='math')setDetails(['mathLab']);
      else if(task==='style')setDetails(['artLab']);
      else if(task==='export')setDetails([]);
    }
    saveLocal();updateSummary();
    if(fromNavigation&&window.matchMedia('(max-width:980px)').matches){
      const selector={create:'.quickMake',fx:'.configurator h3',export:'#exportTools h2',math:'#mathLab > summary',style:'#artLab > summary'}[task];
      const target=document.querySelector(selector);
      if(target){if(!target.matches('summary,button,input,select,a[href]'))target.tabIndex=-1;target.focus({preventScroll:true});target.scrollIntoView({block:'start'})}
    }
  }

  function applyFocus(){
    document.body.classList.toggle('streamFocus',!!state.focus);
    document.body.classList.toggle('streamFull',!state.focus);
    const b=byId('focusToggle');if(b){b.textContent=state.focus?'Show all tools':'Use focused workspace';b.setAttribute('aria-pressed',String(!state.focus))}
    setTask(state.task);
    saveLocal();
  }

  function applyPreviewPin(){
    document.body.classList.toggle('previewPinned',!!state.previewPinned);
    const b=byId('previewPin');if(b){b.classList.toggle('active',state.previewPinned);b.textContent=state.previewPinned?'Preview pinned':'Pin preview';b.setAttribute('aria-pressed',String(state.previewPinned))}
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

  function buildPreviewWorkflow(){
    const stage=document.querySelector('.stage'),preview=document.querySelector('.preview'),status=document.querySelector('.status');
    if(!stage||!preview)return;
    const tools=el('div',{class:'previewWorkflow'});
    const select=el('select',{id:'quickLook','aria-label':'FX preset'});
    select.appendChild(el('option',{value:'',text:'FX preset…'}));
    document.querySelectorAll('[data-preset]').forEach(button=>select.appendChild(el('option',{value:button.dataset.preset,text:button.textContent})));
    select.addEventListener('change',()=>{if(!select.value)return;applyPreset(select.value);updateSummary()});
    const compare=el('button',{id:'compareOriginal',text:'Compare original','aria-pressed':'false'});
    compare.addEventListener('click',()=>{
      previewOriginal=!previewOriginal;
      window.circuitbendViewer?.importState({source:'output'});
      compare.textContent=previewOriginal?'Show processed':'Compare original';
      compare.setAttribute('aria-pressed',String(previewOriginal));
      renderStaticIfNeeded();
    });
    const mixLabel=el('label',{class:'fxMixControl',for:'fxMix',text:'FX mix'});
    const mix=el('input',{id:'fxMix',type:'range',min:'0',max:'100',step:'1',value:String(fxMix*100),'aria-label':'FX mix'});
    const mixValue=el('output',{id:'fxMixValue',for:'fxMix',text:`${Math.round(fxMix*100)}%`});
    let mixStart=null;
    const beginMix=()=>{if(mixStart===null)mixStart=snapshot()};
    const finishMix=()=>{if(mixStart&&mixStart.fxMix!==fxMix){undoStack.push(mixStart);if(undoStack.length>40)undoStack.shift()}mixStart=null};
    mix.addEventListener('pointerdown',beginMix);
    mix.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))beginMix()});
    mix.addEventListener('input',()=>{beginMix();setFxMix(Number(mix.value)/100);renderStaticIfNeeded()});
    mix.addEventListener('change',finishMix);mix.addEventListener('blur',finishMix);mix.addEventListener('pointercancel',finishMix);
    mixLabel.append(mix,mixValue);
    tools.append(select,mixLabel,compare);
    const undo=byId('undoBtn');if(undo)tools.appendChild(undo);
    stage.prepend(tools,preview);
    if(status)preview.after(status);
    const feedback=byId('mediaStatus')?.parentElement;if(feedback)tools.after(feedback);
    const active=byId('activeEffects');
    if(active){const details=el('details',{class:'previewEffects'});details.append(el('summary',{text:'Adjusted effects'}),active);status?.after(details)}
    const info=el('details',{id:'workspaceInfo',class:'workspaceInfo'});
    info.innerHTML='<summary>How it works</summary><p>Generate a source or open your media. Choose an FX preset, then adjust FX mix. Save image captures the visible result as PNG. Undo restores the previous mix or parameter change.</p><p>Source options holds seed, size and motion. Math and Style go deeper into patterns, palettes and glyphs. Effects opens individual racks; Expert adds rate, LFO and sweep controls. Processing order is fixed.</p><p>Save project keeps editable settings, including workspace preferences. It does not include original imported media: keep those files too. Snapshots and saved looks stay in this browser.</p><p>Ctrl/Cmd+Enter: generate · Alt+1–5: workflow tabs · Space: playback outside controls.</p>';
    byId('moreActions')?.appendChild(info);
  }

  function buildExportTools(){
    const card=el('section',{id:'exportTools',class:'exportTools','aria-label':'Export options'});
    card.innerHTML='<h2>Keep what you made</h2><div class="exportChoices"><div><button class="accent" data-export="snapBtn">Save image · PNG</button><p>The pixels currently in the preview.</p></div><div><button data-export="exportFullBtn">Save full-size PNG</button><p>Render at the original source dimensions.</p></div><div><button data-export="projectSaveBtn">Save editable project</button><p>Settings in JSON. Keep imported media separately.</p></div><div><button data-export="asciiBtn">Save ASCII text</button><p>Characters from your generated source.</p></div></div>';
    card.querySelectorAll('[data-export]').forEach(button=>button.addEventListener('click',()=>click(button.dataset.export)));
    document.querySelector('.generator')?.prepend(card);
    for(const area of [document.querySelector('.generator'),document.querySelector('.panel')]){
      if(!area)continue;const back=el('button',{class:'backToPreview',text:'↑ Back to preview'});
      back.addEventListener('click',()=>{byId('quickLook')?.focus({preventScroll:true});document.querySelector('.previewWorkflow')?.scrollIntoView({block:'start'})});area.prepend(back);
    }
  }

  function makeImportsKeyboardAccessible(){
    for(const id of ['file','projectFile']){
      const input=byId(id),label=input?.closest('label');if(!label)continue;
      label.tabIndex=0;label.setAttribute('role','button');
      label.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();input.click()}});
    }
  }

  function bindKeyboard(){
    document.addEventListener('keydown',e=>{
      const tag=e.target?.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'){
        if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();click('generateBtn')}
        return;
      }
      if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();click('generateBtn');return}
      if(e.altKey&&/^[1-5]$/.test(e.key)){e.preventDefault();setTask(Object.keys(tasks)[Number(e.key)-1],true);return}
      if(e.key==='Escape'&&closeMoreMenu())e.preventDefault()
    });
  }

  function bind(){
    loadLocal();injectStyles();buildTaskbar();buildQuickControls();moveSecondaryActions();simplifyLabels();buildPreviewWorkflow();buildExportTools();makeImportsKeyboardAccessible();bindKeyboard();
    document.querySelectorAll('.taskTabs [data-task]').forEach(b=>b.addEventListener('click',()=>setTask(b.dataset.task,true)));
    byId('focusToggle')?.addEventListener('click',()=>{state.focus=!state.focus;applyFocus()});
    byId('previewPin')?.addEventListener('click',()=>{state.previewPinned=!state.previewPinned;applyPreviewPin()});
    [genEngine,genMode,genW,genH,seedEl,cellSize].forEach(n=>{n?.addEventListener('input',updateSummary);n?.addEventListener('change',()=>{copySelectOptions(genEngine,byId('quickEngine'));copySelectOptions(genMode,byId('quickMode'));updateSummary()})});
    const observer=new MutationObserver(()=>{copySelectOptions(genEngine,byId('quickEngine'));copySelectOptions(genMode,byId('quickMode'));updateSummary()});
    observer.observe(genEngine,{childList:true,subtree:true});observer.observe(genMode,{childList:true,subtree:true});
    applyPreviewPin();applyFocus();updateSummary();
    window.circuitbendWorkspace={
      syncSource:()=>{copySelectOptions(genEngine,byId('quickEngine'));copySelectOptions(genMode,byId('quickMode'));updateSummary()},
      syncMix:()=>{const mix=byId('fxMix'),value=byId('fxMixValue');if(mix)mix.value=String(Math.round(fxMix*100));if(value)value.textContent=`${Math.round(fxMix*100)}%`},
      exportState:()=>({...state}),
      importState:x=>{if(!x)return;Object.assign(state,x);applyPreviewPin();applyFocus()},
      setTask,
      setFocus:value=>{state.focus=!!value;applyFocus()}
    };
  }

  if(document.readyState==='complete')bind();else window.addEventListener('load',bind,{once:true});
})();
