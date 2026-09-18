/* Small creative affordances on the same renderer: transport, mix and scene slots. */
(() => {
  'use strict';
  const runtime=window.circuitbendSandbox,project=window.circuitbendProject;
  if(!runtime||!project)return;
  const style=document.createElement('link');style.rel='stylesheet';style.href='sandbox-lab.css';document.head.appendChild(style);
  const notify=message=>window.circuitbendWorkspace?.notify(message);
  const el=(tag,attributes={},content='')=>{const node=document.createElement(tag);for(const[key,value]of Object.entries(attributes))node.setAttribute(key,value);if(content)node.textContent=content;return node;};
  const redo=el('button',{id:'redoBtn',type:'button',title:'Redo effect edits (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)'},'Redo');
  $('undoBtn').after(redo);redo.addEventListener('click',runtime.history.redo);
  const transport=el('div',{class:'experimentTransport','aria-label':'Transport and effect blend'});
  transport.innerHTML='<button id="restartBtn" type="button" title="Pause and return to time zero">Restart</button><button id="stepBtn" type="button" title="Pause and advance 1/30 second">Step</button><input id="videoSeek" type="range" min="0" max="1" step="0.01" value="0" aria-label="Video playhead in seconds" disabled><output id="transportReadout" aria-live="off">0.00s</output><label for="fxMix">FX blend</label><input id="fxMix" type="range" min="0" max="100" step="1" value="100" title="Blend processed output with the original; effect values are preserved"><output id="fxMixValue" for="fxMix">100%</output>';
  document.querySelector('.status').after(transport);
  $('restartBtn').addEventListener('click',()=>runtime.seek(0));
  $('stepBtn').addEventListener('click',()=>runtime.seek((media==='video'?video.currentTime:timelineTime/1000)+1/30));
  $('videoSeek').addEventListener('change',event=>runtime.seek(+event.target.value));
  let mixGesture=false;
  $('fxMix').addEventListener('input',event=>{if(!mixGesture){pushUndo();mixGesture=true;}runtime.setMix(+event.target.value/100);});
  for(const name of ['change','blur'])$('fxMix').addEventListener(name,()=>{mixGesture=false;});

  const recipes=[
    {id:'circuit-garden',name:'Circuit garden',engine:'maze',mode:'pixel',motion:'static',palette:'neon',cell:6,fx:{scan:10,rgb:3},prompt:'circuit maze high contrast garden pathways'},
    {id:'plasma-tide',name:'Plasma tide',engine:'plasma',mode:'pixel',motion:'drift',palette:'pastel',cell:4,fx:{rgb:6,sat:25},prompt:'slow flowing plasma color waves'},
    {id:'orbital-ink',name:'Orbital ink',engine:'lissajous',mode:'pixel',motion:'drift',palette:'cool',cell:2,fx:{glow:18},prompt:'orbital curves',math:{engine:'lissajous',a:3,b:2,c:.4,d:0,detail:5,zoom:1,cx:0,cy:0,density:6000,symmetry:1,line:1.5,color:'phase',animate:true}},
    {id:'glass-cells',name:'Glass cells',engine:'voronoi',mode:'pixel',motion:'drift',palette:'cool',cell:4,fx:{prism:8,ghost:6},prompt:'colored crystalline cells'},
    {id:'amber-terminal',name:'Amber terminal',engine:'maze',mode:'ascii',motion:'static',palette:'mono',cell:8,fx:{scan:15,contrast:12},prompt:'circuit maze terminal',art:{glyphColor:'amber',glyphSet:'technical'}},
    {id:'interference-loom',name:'Interference loom',engine:'interference',mode:'hybrid',motion:'wave',palette:'neon',cell:8,fx:{sat:20},prompt:'interference ripples woven waves'}
  ];
  async function applyRecipe(id) {
    const recipe=recipes.find(item=>item.id===id);if(!recipe||runtime.busy)return false;
    const p={format:'circuitbend-project',version:7,
      generator:{engine:recipe.engine,mode:recipe.mode,motion:recipe.motion,width:640,height:400,cell:recipe.cell,speed:.4,seed:recipe.id,prompt:recipe.prompt},
      effects:{base:recipe.fx,fxSeed:recipe.id},advanced:{paletteMode:recipe.palette},
      webview:{compact:true,tab:'source',art:recipe.art||{}},mathview:recipe.math||null,
      workspace:{focus:true,task:recipe.math?'math':'create'},source:{kind:'generated'},transport:{quality:.75,mix:1}};
    try {await project.restore(p);notify(`${recipe.name} loaded. Press Play to animate, or edit its controls.`);return true;}
    catch(error){notify(error.message);return false;}
  }
  const lab=el('details',{id:'experimentLab',class:'sandboxAdvanced','data-webpanel':'source'});
  lab.innerHTML='<summary>Recipes & saved experiments</summary><div class="experimentBody"><p>Recipes change the source and its look. Save an experiment first to keep a scene.</p><div id="recipeGrid" class="recipeGrid"></div><div class="experimentSaveRow"><input id="experimentName" type="text" maxlength="48" placeholder="Experiment name" aria-label="Experiment name"><button id="experimentSave" type="button">Save experiment</button></div><small id="experimentStorage">Up to six local scenes. Project JSON is the portable backup.</small><div id="experimentSlots" class="experimentSlots"></div></div>';
  document.querySelector('.generator').prepend(lab);
  for(const recipe of recipes){const button=el('button',{type:'button','data-recipe':recipe.id},recipe.name);button.addEventListener('click',()=>applyRecipe(recipe.id));$('recipeGrid').appendChild(button);}
  const STORAGE='circuitbend.experiments.v1',LIMIT=6,MAX_BYTES=2*1024*1024;
  let slots=[],persistent=true;
  try {
    const raw=localStorage.getItem(STORAGE)||'[]';if(raw.length>MAX_BYTES)throw new Error('Saved scenes exceed the storage budget.');
    const saved=JSON.parse(raw);
    if(Array.isArray(saved))for(const item of saved.slice(0,LIMIT)){
      try{if(item&&typeof item.id==='string'&&typeof item.name==='string')slots.push({id:item.id.slice(0,80),name:item.name.slice(0,48),project:project.normalize(item.project),thumbnail:typeof item.thumbnail==='string'&&item.thumbnail.length<60000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(item.thumbnail)?item.thumbnail:''});}catch{}
    }
  }catch{persistent=false;}
  function storageLabel(){$('experimentStorage').textContent=persistent?'Up to six local scenes. Project JSON is the portable backup.':'Session-only storage. Save project to keep a portable copy.';}
  function persist(){try{const json=JSON.stringify(slots);if(json.length>MAX_BYTES)throw new Error('Storage budget');localStorage.setItem(STORAGE,json);persistent=true;}catch{persistent=false;}storageLabel();}
  function renderSlots(){
    const list=$('experimentSlots');list.replaceChildren();
    for(const slot of slots){
      const card=el('article',{class:'experimentCard'}),loadButton=el('button',{type:'button','data-experiment-load':slot.id,'aria-label':`Load experiment ${slot.name}`});
      if(slot.thumbnail){const image=el('img',{src:slot.thumbnail,alt:'',width:'120',height:'75'});loadButton.appendChild(image);}
      loadButton.appendChild(el('span',{},slot.name));loadButton.addEventListener('click',()=>restoreSlot(slot.id));
      const remove=el('button',{type:'button','data-experiment-delete':slot.id,'aria-label':`Delete saved experiment ${slot.name}`},'Delete');remove.addEventListener('click',()=>deleteSlot(slot.id));
      card.append(loadButton,remove);list.appendChild(card);
    }
    if(!slots.length)list.appendChild(el('p',{class:'emptyExperiments'},'No saved experiments yet. Save this scene before trying a recipe.'));
    storageLabel();
  }
  function saveSlot(name) {
    if(!ready||runtime.busy)return false;
    if(slots.length>=LIMIT){notify('Six scenes are saved. Delete a slot or use Save project for another.');return false;}
    const p=project.capture();
    if(JSON.stringify(p).length>MAX_BYTES/LIMIT){notify('This scene is too large for a browser slot. Use Save project to keep the full baked source.');return false;}
    const thumbnail=document.createElement('canvas');thumbnail.width=160;thumbnail.height=100;
    const context=thumbnail.getContext('2d');context.fillStyle='#0b1017';context.fillRect(0,0,160,100);
    const factor=Math.min(160/canvas.width,100/canvas.height),w=canvas.width*factor,h=canvas.height*factor;
    context.drawImage(canvas,(160-w)/2,(100-h)/2,w,h);
    const slot={id:`scene-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name:String(name||`Experiment ${slots.length+1}`).trim().slice(0,48)||'Experiment',project:p,thumbnail:thumbnail.toDataURL('image/jpeg',.65)};
    slots.push(slot);persist();renderSlots();notify(persistent?'Experiment saved in this browser.':'Experiment kept for this session. Use Save project for a permanent file.');return slot.id;
  }
  async function restoreSlot(id){const slot=slots.find(item=>item.id===id);if(!slot)return false;try{return await project.restore(slot.project);}catch(error){notify(error.message);return false;}}
  function deleteSlot(id){slots=slots.filter(item=>item.id!==id);persist();renderSlots();}
  $('experimentSave').addEventListener('click',()=>{try{saveSlot($('experimentName').value);}catch(error){notify(error.message);}});
  $('experimentName').addEventListener('keydown',event=>{if(event.key==='Enter'){$('experimentSave').click();event.preventDefault();}});
  document.addEventListener('circuitbend:source',()=>{
    document.querySelectorAll('[data-sample]').forEach(button=>button.setAttribute('aria-pressed','false'));
    $('sampleDescription').textContent=`Generated ${genEngine.selectedOptions[0]?.textContent||genEngine.value}. Pick a sample to switch back to media.`;
  });
  document.addEventListener('circuitbend:project',event=>{
    const source=event.detail.source,active=source.kind==='external'?source.reference?.sampleId:null;
    document.querySelectorAll('[data-sample]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.sample===active)));
    $('sampleDescription').textContent=active?'Built-in sample restored with its saved effects.':source.kind==='baked'?'Baked still restored.':source.kind==='generated'?`Generated ${genEngine.selectedOptions[0]?.textContent||genEngine.value}.`:`External media: ${source.reference?.name||'reopened file'}.`;
  });
  window.circuitbendLab={recipes:recipes.map(({id,name})=>({id,name})),applyRecipe,saveSlot,restoreSlot,deleteSlot,get slots(){return slots.map(({id,name})=>({id,name}));},get persistent(){return persistent;}};
  renderSlots();window.circuitbendWorkspace.importState(window.circuitbendWorkspace.exportState());sync(true);
})();
