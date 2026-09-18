/* Presentation only. This module does not write source, effect, transport or project state. */
(() => {
  'use strict';
  if (!window.circuitbendLab || window.circuitbendWorkbench) return;
  // This JSON also builds docs/GUIDE.md. Run node scripts/build-guide.mjs after editing it.
  const guide = /* guide:start */ [
    {
      "id": "start",
      "title": "First experiment",
      "task": "create",
      "steps": [
        "Pick Neon shapes from Test signals, or use Open media for your own image or video.",
        "Try VHS or Remix. Sample changes keep the current effects; recipes replace the source and its look.",
        "Move FX blend toward the original. Compare temporarily bypasses the effects without changing their values.",
        "Choose Save PNG. Use Export → Save project to keep an editable version too."
      ],
      "body": ["Everything runs on this device. There is no account, media upload or AI image service."]
    },
    {
      "id": "source",
      "title": "Make a source",
      "task": "create",
      "body": [
        "Source → Recipes & saved experiments has six starting scenes. Save the current experiment before trying one. Recipes and restored projects start paused; press Play to animate.",
        "To build a pattern, choose a source engine, a palette and a seed. Keywords such as grid, rings, warm or monochrome influence some engines. This is procedural generation, not general text-to-image AI.",
        "New seed changes the variation. Generate replaces the source. Bake → source freezes the processed output into a still that you can process again. Undo does not restore an earlier source file."
      ]
    },
    {
      "id": "math",
      "title": "Explore a mathematical structure",
      "task": "math",
      "body": [
        "Choose Math, then a Concept or recipe. The formula and description explain what you are changing. Adjust one parameter at a time; use Explore for a variation.",
        "Play animates the scene. Pause holds it still. Restart pauses at time zero; Step advances 1/30 second. That step is a time increment, not a native frame of an imported video."
      ]
    },
    {
      "id": "style",
      "title": "Turn media into pixels or type",
      "task": "style",
      "body": [
        "Open an image or video, choose Pixel / ASCII, then Use imported media as reference. Choose a Render mode; adjust cell size, pixel shape, palette or glyph set.",
        "Smaller cells give more detail and cost more work. Larger cells make a bolder pattern. These controls style the generator; a directly imported source does not use them until it becomes a reference."
      ]
    },
    {
      "id": "effects",
      "title": "Shape a look",
      "task": "fx",
      "body": [
        "Start with a quick look, then open Effects. Search for a control, drag its slider or type an exact value. Simple controls hide automation; Expert automation reveals rates, oscillation and sweeps.",
        "Undo and Redo cover effect values, modulation, rack bypass and FX blend—not source-file changes. Remix changes a few effects without changing render scale or frame rate. Reset FX returns the effects to their defaults.",
        "Remix does not enable strobing. Acid, Chaos and some manually configured effects can flash. Those controls carry warnings; avoid them when flashing is a concern."
      ]
    },
    {
      "id": "save",
      "title": "Save and reopen",
      "task": "export",
      "body": [
        "Save PNG captures preview resolution. Full-res PNG uses source resolution. Record video captures a silent clip at preview resolution; Stop recording finishes the download. Clips stop at two minutes or about 64 MB.",
        "Save project keeps built-in sample references, generator settings, effects, playback position and baked stills. It does not embed your imported files. Reopen the same media first, then Load project.",
        "Up to six named experiments can stay in this browser. Use Save project for a portable backup. Session-only means browser storage is unavailable or full; closing the page can lose those slots.",
        "Trails and feedback buffers are not saved. Bake → source preserves a still when the exact appearance matters."
      ]
    },
    {
      "id": "help",
      "title": "When something looks wrong",
      "task": "fx",
      "body": [
        "Effects seem inactive? Turn Compare off, raise FX blend, and check the rack is enabled. A paused image will not animate until you press Play.",
        "Preview feels slow? Lower Live quality under Effects → Animation, macros & performance. Lower Live effect budget under Export → Canvas & resolution. Source size is independent of preview size.",
        "Cannot load a file? Try a smaller image or a browser-supported video codec. Imports are limited to 256 MB and 17 megapixels; project files to 24 MB. Unsupported codecs vary by browser.",
        "Cannot change the source? Finish the recording or export first. Fit resets viewer zoom. Float and Pop out keep a separate view without changing the rendered image."
      ]
    },
    {
      "id": "keys",
      "title": "Keyboard",
      "body": [
        "Space: play/pause. G: generate. R: remix. S: save PNG. These single-key shortcuts do not run while typing in a field.",
        "Ctrl/Cmd + Z: undo effects. Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: redo. Ctrl/Cmd + Enter: generate. Alt + 1–5: switch workspace sections.",
        "?: open this guide. Escape: close the guide or More menu. Shortcuts are suspended while the guide is open. Tab and Shift + Tab move between controls."
      ]
    }
  ] /* guide:end */;
  const byId = id => document.getElementById(id);
  const make = (tag, text, attrs = {}) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  };
  document.body.classList.add('signalWorkbench');
  const transport = document.querySelector('.experimentTransport');
  const commands = make('div','',{class:'transportControls'});
  const blend = make('div','',{class:'blendControls'});
  for (const id of ['restartBtn','stepBtn','videoSeek','transportReadout']) commands.append(byId(id));
  blend.append(document.querySelector('label[for="fxMix"]'),byId('fxMix'),byId('fxMixValue'));
  transport.append(commands,blend);
  const heading = make('div', '', {class:'inspectorHeading'});
  const sectionName = make('strong', 'Source');
  heading.append(sectionName, make('span', 'Control desk'));
  byId('workspaceHelp').before(heading);
  const names = {create:'Source',math:'Math',style:'Pixel / ASCII',fx:'Effects',export:'Export'};
  function updateHeading() {
    const current = window.circuitbendWorkspace.exportState();
    sectionName.textContent = current.focus ? names[current.task] || 'Source' : 'All tools';
  }
  document.addEventListener('circuitbend:workspace', updateHeading);
  document.querySelectorAll('.taskTabs [data-task]').forEach((button, index) => {
    button.prepend(make('span', String(index + 1).padStart(2,'0'), {class:'taskIndex','aria-hidden':'true'}));
  });
  const descriptors = ['Maze / pixel paths','Flowing color field','Lissajous / curves','Voronoi / cells','Glyphs / contrast','Intersecting waves'];
  document.querySelectorAll('[data-recipe]').forEach((button,index) => {
    const name = button.textContent;
    button.replaceChildren(make('span',String(index+1).padStart(2,'0'),{class:'recipeNumber','aria-hidden':'true'}),make('span',name),make('small',descriptors[index]||''));
    button.title = `${name}: replaces the source and its look. Save this experiment first.`;
  });
  byId('prompt').placeholder = 'Keywords for a pattern: rings, warm palette, grid…';
  document.querySelectorAll('[data-preset="acid"],#chaosBtn').forEach(button => {
    button.title = 'May flash or strobe. Avoid when flashing is a concern.';
    button.setAttribute('aria-label', `${button.textContent} — may flash or strobe`);
  });
  const helpButton = make('button','? Guide',{id:'helpBtn',type:'button','aria-haspopup':'dialog','aria-controls':'quickGuide'});
  document.querySelector('.streamTools').prepend(helpButton);
  const dialog = make('dialog','',{id:'quickGuide','aria-labelledby':'guideTitle'});
  const header = make('div','',{class:'guideHeader'}),titleBlock = make('div');
  titleBlock.append(make('small','Circuitbend / field guide'),make('h2','A little structure. Lots of play.',{id:'guideTitle'}));
  const close = make('button','Close',{type:'button',id:'guideClose',autofocus:''});
  header.append(titleBlock,close);dialog.append(header);
  const sections = new Map();
  for (const item of guide) {
    const details = make('details','',{'data-guide-topic':item.id});
    details.append(make('summary',item.title));
    if (item.steps) {
      const steps = make('ol');item.steps.forEach(step => steps.append(make('li',step)));details.append(steps);
    }
    item.body.forEach(paragraph => details.append(make('p',paragraph)));
    if (item.task) {
      const jump = make('button',`Open ${names[item.task]}`,{type:'button',class:'guideJump','data-guide-task':item.task});
      jump.addEventListener('click', () => {
        dialog.close();window.circuitbendWorkspace.setTask(item.task);
        document.querySelector(`.taskTabs [data-task="${item.task}"]`)?.focus();
      });details.append(jump);
    }
    sections.set(item.id,details);dialog.append(details);
  }
  document.body.append(dialog);
  const topicForTask = {create:'start',math:'math',style:'style',fx:'effects',export:'save'};
  function openGuide() {
    if (dialog.open) return;
    const topic = topicForTask[window.circuitbendWorkspace.exportState().task] || 'start';
    for (const [id, section] of sections) section.open = id === topic;
    dialog.showModal();dialog.scrollTop = 0;
  }
  helpButton.addEventListener('click',openGuide);
  close.addEventListener('click',()=>dialog.close());
  // Preserve native focus containment and Escape, but keep app shortcuts out of the dialog.
  dialog.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(event.key!=='Tab')return;
    const focusable=[...dialog.querySelectorAll('button:not([disabled]),summary,a[href],input:not([disabled]),select,textarea,[tabindex="0"]')]
      .filter(node=>node.checkVisibility ? node.checkVisibility() : node.getClientRects().length>0);
    const first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  });
  document.addEventListener('keydown',event=>{
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input,textarea,select,[contenteditable],dialog')) return;
    if(event.key==='?'){event.preventDefault();event.stopPropagation();openGuide();}
  });
  const sourceContext = make('p','',{class:'sourceContext',id:'sourceContext',hidden:''});
  document.querySelector('.generator > .sectionTitle').after(sourceContext);
  function updateSourceContext() {
    const imported = media === 'image' || media === 'video';
    sourceContext.hidden = !imported;
    sourceContext.textContent = imported ? 'You are viewing imported media. Generate replaces it with the pattern below; Pixel / ASCII can use it as a reference.' : '';
  }
  for (const type of ['circuitbend:source','circuitbend:media','circuitbend:project']) document.addEventListener(type,updateSourceContext);
  byId('canvas').setAttribute('role','img');
  byId('canvas').setAttribute('aria-label','Processed visual preview. Compare shows the original.');
  const preview = document.querySelector('.preview');
  // Toolbar wrapping changes only its presentation inset, never the render dimensions.
  const toolsObserver = new ResizeObserver(entries => {
    for (const entry of entries) preview.style.setProperty('--toolbar-space',`${Math.ceil(entry.target.getBoundingClientRect().height)+10}px`);
  });
  function observeTools(){const tools=byId('viewerTools');if(!tools)return false;toolsObserver.observe(tools);return true;}
  if(!observeTools()){
    const pendingTools=new MutationObserver(()=>{if(observeTools())pendingTools.disconnect();});
    pendingTools.observe(preview,{childList:true});
  }
  updateSourceContext();updateHeading();
  window.circuitbendWorkbench = {openGuide, guide:guide.map(item=>({id:item.id,title:item.title}))};
})();
