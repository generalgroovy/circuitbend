/* Compact workspace. Original controls are moved, never cloned or removed. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const STORAGE = 'circuitbend.workspace.v2';
  const state = {focus: true, task: 'create', previewPinned: true};
  const tasks = {
    create: {legacy: 'source', label: 'Source', help: 'Pick a sample, open your own media, or generate a source.'},
    math: {legacy: 'art', label: 'Math', help: 'Explore mathematical structures. Every parameter is editable.'},
    style: {legacy: 'art', label: 'Pixel / ASCII', help: 'Turn a generated or imported source into pixels and glyphs.'},
    fx: {legacy: 'fx', label: 'Effects', help: 'Start with a look, then adjust individual effects. Undo keeps experiments reversible.'},
    export: {legacy: 'output', label: 'Export', help: 'Save an image, a silent video, or a reusable project.'}
  };
  let toastTimer;
  function el(tag, attrs = {}, html = '') {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (html) node.innerHTML = html;
    return node;
  }
  function notify(text) {
    const node = byId('sandboxNotice');
    if (!node) return;
    node.textContent = text; node.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => {node.hidden = true;}, 5000);
  }
  function saveLocal() {try {localStorage.setItem(STORAGE, JSON.stringify(state));} catch {}}
  function importState(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.focus === 'boolean') state.focus = value.focus;
    if (Object.hasOwn(tasks, value.task)) state.task = value.task;
    if (typeof value.previewPinned === 'boolean') state.previewPinned = value.previewPinned;
  }
  function legacyTab(name) {document.querySelector(`[data-webtab="${name}"]`)?.click();}
  function labelFor(id, text) {const node = byId(id); if (node) node.textContent = text;}
  function setTask(task) {
    if (!Object.hasOwn(tasks, task)) task = 'create';
    state.task = task;
    document.body.dataset.task = state.focus ? task : 'all';
    legacyTab(state.focus ? tasks[task].legacy : 'all');
    document.querySelectorAll('[data-task]').forEach(button => {
      const active = state.focus && button.dataset.task === task;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    byId('workspaceHelp').textContent = state.focus ? tasks[task].help : 'All tools, together. Search effects or open a section to go deeper.';
    if (task === 'math' && byId('mathLab')) byId('mathLab').open = true;
    if (task === 'style' && byId('artLab')) byId('artLab').open = true;
    if (task === 'export') document.querySelector('.advancedSection[data-webpanel="output"]')?.setAttribute('open', '');
    document.querySelector('.panel')?.scrollTo({top: 0});
    saveLocal(); updateSummary();
  }
  function applyFocus() {
    document.body.classList.toggle('streamFocus', state.focus);
    document.body.classList.toggle('streamFull', !state.focus);
    byId('focusToggle').classList.toggle('active', !state.focus);
    byId('focusToggle').setAttribute('aria-pressed', String(!state.focus));
    setTask(state.task);
  }
  function updateSummary() {
    const node = byId('streamSummary');
    if (node) node.textContent = media === 'image' || media === 'video' ? `${media} · ${size().join(' × ')}` : `${genEngine.value} · ${genW.value} × ${genH.value}`;
  }
  function moveSecondaryActions() {
    const more = byId('moreActions');
    for (const id of ['fullBtn', 'chaosBtn', 'savePresetBtn', 'loadPresetBtn']) {
      const node = byId(id); if (node) more.appendChild(node);
    }
    byId('chaosBtn').title = 'Advanced randomization can enable strobing and extreme effects.';
    const actions = document.querySelector('.top .actions');
    for (const id of ['undoBtn', 'resetBtn', 'randomBtn', 'snapBtn']) actions.appendChild(byId(id));
    const exporter = el('section', {id: 'workspaceExport', class: 'workspaceExport'});
    exporter.innerHTML = '<h2>Save your experiment</h2><p>PNG saves the current preview. Full-res PNG renders the source size. Recording saves a silent clip at preview resolution.</p><div id="exportActions"></div><p>Project JSON restores built-in samples, generators, settings and baked stills. External files stay private: reopen the named file before loading its project.</p><div id="projectActions"></div>';
    document.querySelector('.panel').appendChild(exporter);
    for (const id of ['exportFullBtn', 'recordBtn', 'asciiBtn']) byId('exportActions').appendChild(byId(id));
    for (const id of ['projectSaveBtn', 'projectFile']) {
      const node = byId(id); byId('projectActions').appendChild(id === 'projectFile' ? node.closest('label') : node);
    }
    more.addEventListener('click', event => {if (event.target.closest('button')) byId('moreMenu').open = false;});
    labelFor('randomBtn', 'Remix'); labelFor('resetBtn', 'Reset FX'); labelFor('snapBtn', 'Save PNG');
    labelFor('generateBtn', 'Generate'); labelFor('variationBtn', 'New seed'); labelFor('useOutputBtn', 'Bake → source');
    labelFor('projectSaveBtn', 'Save project'); labelFor('recordBtn', 'Record video');
    document.querySelectorAll('.filebtn').forEach(node => {node.tabIndex = 0; node.setAttribute('role', 'button'); node.addEventListener('keydown', event => {if (event.key === 'Enter' || event.code === 'Space') {event.preventDefault(); event.stopPropagation(); node.querySelector('input')?.click();}});});
    byId('undoBtn').title = 'Undo effect changes (Ctrl/Cmd+Z). Source files are not in effect history.';
    byId('randomBtn').title = 'A restrained, non-strobing remix. Undo returns to the previous effect settings.';
  }
  function accessibleControls() {
    document.querySelectorAll('[data-k]').forEach(node => {
      const key = node.dataset.k; node.id ||= `effect-${key}`;
      const label = node.closest('.ctrl')?.querySelector('label');
      if (label) label.htmlFor = node.id;
      node.setAttribute('aria-label', label?.textContent || key);
      const number = document.querySelector(`[data-param-number="${key}"]`);
      number?.setAttribute('aria-label', `${label?.textContent || key}: exact value`);
    });
    document.querySelectorAll('input[title],select[title]').forEach(node => {
      if (!node.labels?.length && !node.hasAttribute('aria-label')) node.setAttribute('aria-label', node.title);
    });
    [['prompt', 'Describe a procedural source'], ['effectSearch', 'Search effects'], ['userPresetName', 'User preset name'], ['userPresetSelect', 'Saved user presets']].forEach(([id, text]) => byId(id)?.setAttribute('aria-label', text));
    for (let i = 1; i <= 4; i++) byId(`palette${i}`)?.setAttribute('aria-label', `Custom palette color ${i}`);
  }
  function buildQuickControls() {
    // Use the real controls, not proxies that can drift out of sync.
    const quickMake = document.querySelector('.genGrid'); quickMake.classList.add('quickMake'); quickMake.dataset.webpanel = 'source art';
    const useMedia = el('button', {id: 'styleImported', type: 'button'}, 'Use imported media as reference');
    const help = el('p', {class: 'styleHelp'}, 'Pixel / ASCII styles apply to generated sources. Use your imported media as a reference to style it.');
    const lab = byId('artLab');
    if (lab) {lab.querySelector('summary').after(help); help.after(useMedia);}
    useMedia.addEventListener('click', () => {
      if (inputMedia === 'none') {notify('Open an image or video, or choose a sample first.'); return;}
      genEngine.value = 'reference'; genMotion.value = inputMedia === 'video' ? 'drift' : 'static';
      startGenerated(); notify('Imported media is now the generator reference.');
    });
  }
  function bind() {
    if (document.body.classList.contains('sandboxWorkspace')) return;
    try {importState(JSON.parse(localStorage.getItem(STORAGE) || 'null'));} catch {}
    const style = el('link', {rel: 'stylesheet', href: 'streamlined.css', 'data-circuitbend-streamlined': '1'}); document.head.appendChild(style);
    document.body.classList.add('sandboxWorkspace');
    const top = document.querySelector('.top');
    document.querySelector('.brand h1').textContent = 'Circuitbend';
    document.querySelector('.generator > .sectionTitle strong').textContent = 'Generate a source';
    document.querySelector('.generator > .sectionTitle span').textContent = 'Create or replace the current source';
    document.querySelector('.brand .sub').textContent = 'A playground for pictures + motion';
    const bar = el('nav', {id: 'streamBar', class: 'streamBar', 'aria-label': 'Workspace tools'});
    bar.innerHTML = `<div class="taskTabs">${Object.entries(tasks).map(([key, task]) => `<button type="button" data-task="${key}" aria-pressed="false">${task.label}</button>`).join('')}<button id="focusToggle" type="button" title="Show every tool in one workspace" aria-pressed="false">All tools</button></div><div class="streamTools"><span id="streamSummary"></span><details id="moreMenu"><summary>More</summary><div id="moreActions" class="moreActions"></div></details></div>`;
    top.after(bar);
    const panel = document.querySelector('.panel');
    panel.prepend(document.querySelector('.generator'));
    const help = el('p', {id: 'workspaceHelp', class: 'workspaceHelp'}); panel.prepend(help);
    const stage = document.querySelector('.stage');
    const tray = el('section', {class: 'sampleShelf', id: 'sampleShelf', 'aria-label': 'Built-in test media'});
    tray.innerHTML = '<div class="shelfHeading"><h2>Start playing</h2><span>4 images · 2 loops · no upload needed</span></div><div id="sampleGrid" class="sampleGrid"></div><div id="sampleDescription">Choose a sample. Your effects stay in place.</div>';
    stage.appendChild(tray);
    const looks = el('section', {class: 'quickLooks', 'aria-label': 'Quick effect looks'});
    looks.innerHTML = '<span>Try a look</span>' + ['clean','dirty','neon','poster','terminal','dream'].map(name => `<button type="button" data-look="${name}">${({clean:'Original',dirty:'VHS',neon:'Neon',poster:'Print',terminal:'Terminal',dream:'Dream'})[name]}</button>`).join('');
    stage.appendChild(looks);
    looks.addEventListener('click', event => {const key = event.target.dataset.look; if (key) {document.querySelector(`[data-preset="${key}"]`)?.click(); notify(`${event.target.textContent} look applied. Undo restores the previous effects.`);}});
    const note = el('p', {class: 'sandboxHint'}, 'Pick a source → try a look → bend the controls. Nothing leaves your browser.'); stage.appendChild(note);
    drop.innerHTML = '<strong>Drop an image or video</strong><span> or use Open media</span>';
    drop.setAttribute('aria-label', 'Drop an image or video here, or use the Open media button');
    const compare = el('button', {id: 'compareBtn', type: 'button', 'aria-pressed': 'false', title: 'Temporarily bypass effects without changing their values'}, 'Compare');
    byId('playBtn').after(compare);
    const notice = el('div', {id: 'sandboxNotice', role: 'status', 'aria-live': 'polite', hidden: ''}); document.body.appendChild(notice);
    moveSecondaryActions(); buildQuickControls(); accessibleControls();
    document.querySelectorAll('.generator details').forEach(node => {node.open = false;});
    byId('configMode').value = 'simple'; byId('configMode').dispatchEvent(new Event('change', {bubbles: true}));
    // Fold rarely needed configuration without removing any existing actions.
    const global = document.querySelector('.global');
    const globalDetails = el('details', {class: 'sandboxAdvanced', id: 'globalAutomation'}, '<summary>Animation, macros & performance</summary>');
    global.before(globalDetails); globalDetails.appendChild(global);
    const presetRow = byId('userPresetName').closest('.configRow');
    const presetDetails = el('details', {class: 'sandboxAdvanced'}, '<summary>My effect presets</summary>');
    presetRow.before(presetDetails); presetDetails.appendChild(presetRow);
    byId('focusToggle').addEventListener('click', () => {state.focus = !state.focus; applyFocus();});
    document.querySelectorAll('[data-task]').forEach(button => button.addEventListener('click', () => {state.focus = true; state.task = button.dataset.task; applyFocus();}));
    document.addEventListener('keydown', event => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') byId('moreMenu').open = false;
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {event.preventDefault(); byId('generateBtn').click();}
      if (!event.target.closest('input,textarea,select,[contenteditable="true"]') && event.altKey && /^[1-5]$/.test(event.key)) {event.preventDefault(); state.focus = true; state.task = Object.keys(tasks)[+event.key - 1]; applyFocus();}
    });
    document.addEventListener('pointerdown', event => {if (!byId('moreMenu').contains(event.target)) byId('moreMenu').open = false;});
    [genEngine, genMode, genW, genH].forEach(node => node.addEventListener('change', updateSummary));
    document.addEventListener('circuitbend:media', updateSummary);
    window.circuitbendWorkspace = {exportState: () => ({...state}), importState: value => {importState(value); applyFocus();}, setTask: task => {state.focus = true; state.task = task; applyFocus();}, setFocus: value => {state.focus = !!value; applyFocus();}, notify};
    applyFocus();
    function loadSupport(name) {
      return new Promise((resolve, reject) => {const script = el('script', {src: name}); script.onload = resolve; script.onerror = () => reject(new Error(`Could not load ${name}`)); document.body.appendChild(script);});
    }
    loadSupport('sandbox-runtime.js').then(() => loadSupport('sandbox-samples.js')).then(() => loadSupport('sandbox-lab.js')).catch(error => notify(`${error.message}. Existing generators and effects are still available.`));
  }
  if (document.readyState === 'complete') bind(); else window.addEventListener('load', bind, {once: true});
})();
