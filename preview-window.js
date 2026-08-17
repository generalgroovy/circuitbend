(() => {
  const byId=id=>document.getElementById(id);
  const preview=document.querySelector('.preview');
  const output=byId('canvas');
  const sourceCanvas=byId('sourceCanvas');
  const video=byId('video');
  const image=byId('image');
  if(!preview||!output||!sourceCanvas)return;

  const STORAGE='circuitbend.viewer.v1';
  const state={source:'output',zoom:100,floating:false,pixel:false,x:null,y:null,w:null,h:null};
  let popup=null,popupCanvas=null,popupCtx=null,popupSource=null,popupZoom=null,popupZoomRead=null;
  let drag=null;
  let frameId=0;

  function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
  function save(){try{localStorage.setItem(STORAGE,JSON.stringify(state))}catch{}}
  function load(){try{const x=JSON.parse(localStorage.getItem(STORAGE)||'null');if(x)Object.assign(state,x)}catch{}}
  function addStyle(){if(document.querySelector('link[data-circuitbend-viewer]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='preview-window.css';l.dataset.circuitbendViewer='1';document.head.appendChild(l)}

  function sourceInfo(kind=state.source){
    if(kind==='output'&&output.width&&output.height)return{element:output,w:output.width,h:output.height,label:'Processed output'};
    if(kind==='source'&&sourceCanvas.width&&sourceCanvas.height)return{element:sourceCanvas,w:sourceCanvas.width,h:sourceCanvas.height,label:'Source canvas'};
    if(kind==='media'){
      if(video&&video.currentSrc&&video.readyState>=2&&video.videoWidth&&video.videoHeight)return{element:video,w:video.videoWidth,h:video.videoHeight,label:'Imported video'};
      if(image&&image.currentSrc&&image.complete&&image.naturalWidth&&image.naturalHeight)return{element:image,w:image.naturalWidth,h:image.naturalHeight,label:'Imported image'};
      if(image&&image.src&&image.complete&&image.naturalWidth&&image.naturalHeight)return{element:image,w:image.naturalWidth,h:image.naturalHeight,label:'Imported image'};
    }
    return null;
  }

  function ensureMirror(){
    let mirror=byId('viewerMirror');
    if(!mirror){mirror=document.createElement('canvas');mirror.id='viewerMirror';mirror.className='viewerMirror';mirror.hidden=true;preview.insertBefore(mirror,preview.firstChild)}
    return mirror;
  }

  function injectTools(){
    if(byId('viewerTools'))return;
    const tools=document.createElement('div');tools.id='viewerTools';tools.className='viewerTools';
    tools.innerHTML='<span id="viewerDrag" class="viewerDrag" title="Drag floating preview">Preview</span><span class="viewerFloatBadge">floating</span><select id="viewerSource" title="Choose what the viewer shows"><option value="output">Output</option><option value="source">Source</option><option value="media">Imported image/video</option></select><label class="viewerZoom">Scale <input id="viewerZoom" type="range" min="25" max="400" step="5" value="100"><span id="viewerZoomRead" class="viewerZoomRead">Fit</span></label><button id="viewerFit" title="Fit viewer to its container">Fit</button><button id="viewerPixel" title="Toggle nearest-neighbor display">Crisp</button><button id="viewerFloat" title="Float this preview above the workspace and resize it freely">Float</button><button id="viewerPopout" title="Open a separate freely resizable live preview window">Pop out</button>';
    preview.appendChild(tools);
    const noSource=document.createElement('div');noSource.id='viewerNoSource';noSource.className='viewerNoSource';noSource.hidden=true;noSource.textContent='No imported image/video loaded';preview.appendChild(noSource);
  }

  function applySource(){
    const mirror=ensureMirror();
    const alternate=state.source!=='output';
    preview.classList.toggle('viewerAlternate',alternate);
    mirror.hidden=!alternate;
    const select=byId('viewerSource');if(select)select.value=state.source;
    updateNoSource();syncPopupControls();save();
  }

  function applyZoom(){
    preview.style.setProperty('--viewer-zoom',String(state.zoom));
    preview.classList.toggle('viewerScaled',state.zoom!==100);
    const slider=byId('viewerZoom');if(slider)slider.value=String(state.zoom);
    const read=byId('viewerZoomRead');if(read)read.textContent=state.zoom===100?'Fit':`${state.zoom}%`;
    if(popupCanvas)popupCanvas.style.width=state.zoom===100?'100%':`${state.zoom}%`;
    if(popupZoom)popupZoom.value=String(state.zoom);
    if(popupZoomRead)popupZoomRead.textContent=state.zoom===100?'Fit':`${state.zoom}%`;
    save();
  }

  function applyPixel(){
    preview.classList.toggle('viewerPixel',!!state.pixel);
    const b=byId('viewerPixel');if(b){b.classList.toggle('active',!!state.pixel);b.setAttribute('aria-pressed',String(!!state.pixel))}
    if(popupCanvas)popupCanvas.style.imageRendering=state.pixel?'pixelated':'auto';
    save();
  }

  function applyFloat(){
    const b=byId('viewerFloat');
    if(state.floating){
      const rect=preview.getBoundingClientRect();
      if(!Number.isFinite(state.w)||state.w<260)state.w=Math.max(320,rect.width);
      if(!Number.isFinite(state.h)||state.h<190)state.h=Math.max(240,rect.height);
      if(!Number.isFinite(state.x))state.x=Math.max(8,window.innerWidth-state.w-20);
      if(!Number.isFinite(state.y))state.y=Math.max(8,Math.min(100,window.innerHeight-state.h-8));
      preview.classList.add('viewerFloating');
      preview.style.left=`${state.x}px`;preview.style.top=`${state.y}px`;preview.style.width=`${state.w}px`;preview.style.height=`${state.h}px`;
    }else{
      preview.classList.remove('viewerFloating');
      preview.style.removeProperty('left');preview.style.removeProperty('top');preview.style.removeProperty('width');preview.style.removeProperty('height');
    }
    if(b){b.classList.toggle('active',!!state.floating);b.textContent=state.floating?'Dock':'Float';b.setAttribute('aria-pressed',String(!!state.floating))}
    save();
  }

  function updateNoSource(){
    const n=byId('viewerNoSource');if(!n)return;
    const missing=state.source==='media'&&!sourceInfo('media');
    n.hidden=!missing;
  }

  function drawTo(ctx,canvas,info){
    if(!ctx||!canvas||!info)return false;
    if(canvas.width!==info.w||canvas.height!==info.h){canvas.width=info.w;canvas.height=info.h}
    try{ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(info.element,0,0,canvas.width,canvas.height);return true}catch{return false}
  }

  function renderMirrors(){
    const info=sourceInfo();
    if(state.source!=='output'){
      const mirror=ensureMirror();
      if(info){mirror.hidden=false;drawTo(mirror.getContext('2d'),mirror,info)}else mirror.hidden=true;
    }
    if(popup&&popup.closed){popup=null;popupCanvas=null;popupCtx=null;popupSource=null;popupZoom=null;popupZoomRead=null}
    if(popupCanvas&&info){drawTo(popupCtx,popupCanvas,info);const meta=popup.document.getElementById('popMeta');if(meta)meta.textContent=`${info.label} · ${info.w}×${info.h}`}
    updateNoSource();
    frameId=requestAnimationFrame(renderMirrors);
  }

  function buildPopup(){
    const w=window.open('','circuitbend-live-viewer','popup=yes,resizable=yes,scrollbars=yes,width=900,height=700');
    if(!w)return null;
    w.document.open();
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Circuitbend Live Viewer</title><style>html,body{margin:0;min-height:100%;background:#020306;color:#dfefff;font-family:Inter,system-ui,sans-serif}body{overflow:auto}.bar{position:sticky;top:0;z-index:5;display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:7px;background:#080d15ee;border-bottom:1px solid #26384c;backdrop-filter:blur(8px)}button,select,input{background:#1b2634;color:#eaf7ff;border:1px solid #334b62;border-radius:6px;padding:5px;font:11px inherit}label{display:flex;align-items:center;gap:5px;font-size:10px;color:#9cb0c4}.meta{margin-left:auto;font:10px ui-monospace,monospace;color:#8edfff}.stage{min-width:100%;min-height:calc(100vh - 45px);display:grid;place-items:center;overflow:auto}canvas{display:block;background:#000;max-width:none;height:auto}</style></head><body><div class="bar"><select id="popSource"><option value="output">Output</option><option value="source">Source</option><option value="media">Imported image/video</option></select><label>Scale <input id="popZoom" type="range" min="25" max="400" step="5"><span id="popZoomRead"></span></label><button id="popFit">Fit</button><button id="popCrisp">Crisp</button><span id="popMeta" class="meta">live preview</span></div><div class="stage"><canvas id="popCanvas"></canvas></div></body></html>');
    w.document.close();
    popup=w;popupCanvas=w.document.getElementById('popCanvas');popupCtx=popupCanvas.getContext('2d');popupSource=w.document.getElementById('popSource');popupZoom=w.document.getElementById('popZoom');popupZoomRead=w.document.getElementById('popZoomRead');
    popupSource.value=state.source;popupZoom.value=String(state.zoom);popupZoomRead.textContent=state.zoom===100?'Fit':`${state.zoom}%`;popupCanvas.style.width=state.zoom===100?'100%':`${state.zoom}%`;popupCanvas.style.imageRendering=state.pixel?'pixelated':'auto';
    popupSource.addEventListener('change',()=>{state.source=popupSource.value;applySource()});
    popupZoom.addEventListener('input',()=>{state.zoom=clamp(+popupZoom.value||100,25,400);applyZoom()});
    w.document.getElementById('popFit').addEventListener('click',()=>{state.zoom=100;applyZoom()});
    w.document.getElementById('popCrisp').addEventListener('click',()=>{state.pixel=!state.pixel;applyPixel()});
    w.addEventListener('beforeunload',()=>{popup=null;popupCanvas=null;popupCtx=null;popupSource=null;popupZoom=null;popupZoomRead=null});
    w.focus();return w;
  }

  function syncPopupControls(){if(popupSource)popupSource.value=state.source}
  function openPopup(){if(popup&&!popup.closed){popup.focus();return}const w=buildPopup();if(!w){const n=byId('viewerNoSource');if(n){n.hidden=false;n.textContent='Pop-up blocked by browser';setTimeout(()=>{n.textContent='No imported image/video loaded';updateNoSource()},1800)}}}

  function bindDrag(){
    const handle=byId('viewerDrag');if(!handle)return;
    handle.addEventListener('pointerdown',e=>{if(!state.floating||e.button!==0)return;const r=preview.getBoundingClientRect();drag={dx:e.clientX-r.left,dy:e.clientY-r.top,w:r.width,h:r.height};e.preventDefault()});
    window.addEventListener('pointermove',e=>{if(!drag)return;state.x=clamp(e.clientX-drag.dx,-drag.w+90,window.innerWidth-90);state.y=clamp(e.clientY-drag.dy,0,window.innerHeight-42);preview.style.left=`${state.x}px`;preview.style.top=`${state.y}px`});
    window.addEventListener('pointerup',()=>{if(drag){drag=null;const r=preview.getBoundingClientRect();state.x=r.left;state.y=r.top;state.w=r.width;state.h=r.height;save()}});
    if('ResizeObserver'in window)new ResizeObserver(()=>{if(!state.floating)return;const r=preview.getBoundingClientRect();state.w=r.width;state.h=r.height;save()}).observe(preview);
  }

  function bind(){
    load();addStyle();ensureMirror();injectTools();preview.classList.add('viewerEnabled');
    byId('viewerSource').value=state.source;
    byId('viewerSource').addEventListener('change',e=>{state.source=e.target.value;applySource()});
    byId('viewerZoom').addEventListener('input',e=>{state.zoom=clamp(+e.target.value||100,25,400);applyZoom()});
    byId('viewerFit').addEventListener('click',()=>{state.zoom=100;applyZoom()});
    byId('viewerPixel').addEventListener('click',()=>{state.pixel=!state.pixel;applyPixel()});
    byId('viewerFloat').addEventListener('click',()=>{state.floating=!state.floating;applyFloat()});
    byId('viewerPopout').addEventListener('click',openPopup);
    preview.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();state.zoom=clamp(state.zoom+(e.deltaY<0?10:-10),25,400);applyZoom()},{passive:false});
    window.addEventListener('resize',()=>{if(!state.floating)return;const r=preview.getBoundingClientRect();state.x=clamp(r.left,-r.width+90,window.innerWidth-90);state.y=clamp(r.top,0,window.innerHeight-42);preview.style.left=`${state.x}px`;preview.style.top=`${state.y}px`;save()});
    bindDrag();applySource();applyZoom();applyPixel();applyFloat();
    if(!frameId)frameId=requestAnimationFrame(renderMirrors);
    window.circuitbendViewer={exportState:()=>({...state}),importState:x=>{if(!x)return;Object.assign(state,x);state.source=['output','source','media'].includes(state.source)?state.source:'output';state.zoom=clamp(+state.zoom||100,25,400);applySource();applyZoom();applyPixel();applyFloat()},openPopup,dock:()=>{state.floating=false;applyFloat()},float:()=>{state.floating=true;applyFloat()}};
  }

  if(document.readyState==='complete')bind();else window.addEventListener('load',bind,{once:true});
})();