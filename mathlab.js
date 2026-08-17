(() => {
  const byId = id => document.getElementById(id);
  const priorGenerateSource = generateSource;
  const STORAGE = 'circuitbend.mathlab.v1';
  const FIELD_BUDGET = 360000;
  const POINT_CAP = 140000;
  const work = document.createElement('canvas');
  const wctx = work.getContext('2d', { willReadFrequently: true });
  const colorProbe = document.createElement('canvas');
  colorProbe.width = colorProbe.height = 1;
  const colorCtx = colorProbe.getContext('2d', { willReadFrequently: true });

  const concepts = {
    mandelbrot: { name:'Mandelbrot set', group:'Complex dynamics', formula:'z(n+1)=z(n)^2+c', defaults:{a:2,b:0,c:0,d:0,detail:6,zoom:1,cx:-0.5,cy:0,density:40000,symmetry:1,line:1,color:'smooth',animate:false} },
    julia: { name:'Julia set', group:'Complex dynamics', formula:'z(n+1)=z(n)^2+(a+bi)', defaults:{a:-0.8,b:0.156,c:0,d:0,detail:7,zoom:1,cx:0,cy:0,density:40000,symmetry:1,line:1,color:'phase',animate:true} },
    newton: { name:'Newton basins', group:'Complex dynamics', formula:'z ← z-(z^3-1)/(3z^2)', defaults:{a:3,b:0,c:0,d:0,detail:7,zoom:1,cx:0,cy:0,density:40000,symmetry:1,line:1,color:'phase',animate:false} },
    burningship: { name:'Burning Ship', group:'Complex dynamics', formula:'z ← (|Re z|+i|Im z|)^2+c', defaults:{a:2,b:0,c:0,d:0,detail:7,zoom:0.9,cx:-0.45,cy:-0.5,density:40000,symmetry:1,line:1,color:'bands',animate:false} },
    domain: { name:'Complex domain coloring', group:'Complex analysis', formula:'f(z)=sin(z^2+c)', defaults:{a:1,b:0.4,c:0.2,d:-0.15,detail:5,zoom:1,cx:0,cy:0,density:40000,symmetry:1,line:1,color:'phase',animate:true} },
    chladni: { name:'Chladni nodal plate', group:'Eigenmodes', formula:'sin(nπx)sin(mπy)-sin(mπx)sin(nπy)', defaults:{a:3,b:5,c:18,d:0,detail:5,zoom:1,cx:0,cy:0,density:40000,symmetry:1,line:1,color:'bands',animate:true} },
    clifford: { name:'Clifford attractor', group:'Strange attractors', formula:'x′=sin(ay)+c cos(ax); y′=sin(bx)+d cos(by)', defaults:{a:-1.4,b:1.6,c:1,d:0.7,detail:6,zoom:1,cx:0,cy:0,density:85000,symmetry:1,line:0.75,color:'phase',animate:true} },
    dejong: { name:'De Jong attractor', group:'Strange attractors', formula:'x′=sin(ay)-cos(bx); y′=sin(cx)-cos(dy)', defaults:{a:1.4,b:-2.3,c:2.4,d:-2.1,detail:6,zoom:1,cx:0,cy:0,density:90000,symmetry:1,line:0.75,color:'phase',animate:true} },
    henon: { name:'Hénon map', group:'Strange attractors', formula:'x′=1-ax²+y; y′=bx', defaults:{a:1.4,b:0.3,c:0,d:0,detail:6,zoom:1,cx:0,cy:0,density:85000,symmetry:1,line:0.8,color:'smooth',animate:false} },
    lorenz: { name:'Lorenz attractor', group:'Differential equations', formula:'dx=σ(y-x); dy=x(ρ-z)-y; dz=xy-βz', defaults:{a:10,b:28,c:2.667,d:0.006,detail:6,zoom:1,cx:0,cy:0,density:65000,symmetry:1,line:0.8,color:'phase',animate:true} },
    lissajous: { name:'Lissajous figure', group:'Parametric curves', formula:'x=sin(at+δ); y=sin(bt)', defaults:{a:3,b:4,c:1.047,d:0,detail:5,zoom:1,cx:0,cy:0,density:12000,symmetry:1,line:1.2,color:'phase',animate:true} },
    harmonograph: { name:'Harmonograph', group:'Parametric curves', formula:'Σ sin(ft+φ)e^(-dt)', defaults:{a:3,b:4,c:5,d:2,detail:6,zoom:1,cx:0,cy:0,density:28000,symmetry:1,line:0.9,color:'phase',animate:true} },
    superformula: { name:'Superformula', group:'Parametric curves', formula:'r=(|cos(mφ/4)|^n2+|sin(mφ/4)|^n3)^(-1/n1)', defaults:{a:7,b:0.3,c:1.7,d:1.7,detail:6,zoom:1,cx:0,cy:0,density:12000,symmetry:1,line:1.1,color:'phase',animate:true} },
    rose: { name:'Rose / rhodonea curve', group:'Parametric curves', formula:'r=cos(kθ)', defaults:{a:5,b:2,c:0,d:0,detail:5,zoom:1,cx:0,cy:0,density:10000,symmetry:1,line:1.1,color:'phase',animate:true} },
    modular: { name:'Modular multiplication circle', group:'Number patterns', formula:'i → (k·i) mod N', defaults:{a:2,b:360,c:0,d:0,detail:5,zoom:1,cx:0,cy:0,density:360,symmetry:1,line:0.65,color:'phase',animate:true} },
    phyllotaxis: { name:'Golden-angle phyllotaxis', group:'Number patterns', formula:'θ=n·137.507…°; r∝√n', defaults:{a:137.507764,b:0.5,c:0,d:0,detail:5,zoom:1,cx:0,cy:0,density:14000,symmetry:1,line:1,color:'phase',animate:true} },
    logistic: { name:'Logistic bifurcation', group:'Chaos & bifurcation', formula:'x(n+1)=r·x(n)·(1-x(n))', defaults:{a:2.5,b:4,c:0.5,d:0,detail:7,zoom:1,cx:0,cy:0,density:40000,symmetry:1,line:1,color:'smooth',animate:false} },
    ulam: { name:'Ulam prime spiral', group:'Number patterns', formula:'integers on a square spiral; mark primes', defaults:{a:0,b:0,c:0,d:0,detail:6,zoom:1,cx:0,cy:0,density:40000,symmetry:1,line:1,color:'binary',animate:false} },
    hilbert: { name:'Hilbert curve', group:'Fractal curves', formula:'recursive space-filling curve', defaults:{a:0,b:0,c:0,d:0,detail:6,zoom:1,cx:0,cy:0,density:40000,symmetry:1,line:1,color:'phase',animate:true} },
    sierpinski: { name:'Sierpiński chaos game', group:'Fractal curves', formula:'x(n+1)=(x(n)+vertex)/2', defaults:{a:0.5,b:0,c:0,d:0,detail:6,zoom:1,cx:0,cy:0,density:90000,symmetry:1,line:0.8,color:'phase',animate:true} }
  };

  const recipes = {
    seahorse:{label:'Mandelbrot · Seahorse valley',engine:'mandelbrot',set:{zoom:8,cx:-0.7453,cy:0.1127,detail:8,color:'bands'}},
    dendrite:{label:'Julia · Dendrite',engine:'julia',set:{a:0,b:1,zoom:1.15,detail:7,color:'phase'}},
    rabbit:{label:'Julia · Douady rabbit',engine:'julia',set:{a:-0.123,b:0.745,zoom:1.1,detail:8,color:'smooth'}},
    roots:{label:'Newton · Root basins',engine:'newton',set:{detail:8,color:'phase'}},
    ship:{label:'Burning Ship · Coast',engine:'burningship',set:{zoom:1.5,cx:-0.48,cy:-0.56,detail:8,color:'bands'}},
    plate:{label:'Chladni · 5:8 plate',engine:'chladni',set:{a:5,b:8,c:24,color:'bands'}},
    smoke:{label:'Clifford · Smoke',engine:'clifford',set:{a:-1.4,b:1.6,c:1,d:0.7,density:110000,symmetry:2}},
    lace:{label:'De Jong · Lace',engine:'dejong',set:{a:1.4,b:-2.3,c:2.4,d:-2.1,density:120000,symmetry:2}},
    butterfly:{label:'Lorenz · Butterfly',engine:'lorenz',set:{a:10,b:28,c:2.667,d:0.006,density:80000}},
    knot:{label:'Lissajous · Harmonic knot',engine:'lissajous',set:{a:5,b:4,c:1.2,symmetry:3}},
    flower:{label:'Superformula · Flower',engine:'superformula',set:{a:8,b:0.28,c:1.8,d:1.8,symmetry:2}},
    rose:{label:'Rhodonea · 7/4 rose',engine:'rose',set:{a:7,b:4,symmetry:2}},
    cardioid:{label:'Modular · Cardioid',engine:'modular',set:{a:2,density:420}},
    golden:{label:'Phyllotaxis · Golden spiral',engine:'phyllotaxis',set:{a:137.507764,density:16000}},
    feigenbaum:{label:'Logistic · Feigenbaum',engine:'logistic',set:{a:2.7,b:4,detail:8}},
    primes:{label:'Ulam · Prime diagonals',engine:'ulam',set:{detail:7,color:'binary'}},
    labyrinth:{label:'Hilbert · Labyrinth',engine:'hilbert',set:{detail:7}},
    triangle:{label:'Sierpiński · Chaos triangle',engine:'sierpinski',set:{density:110000}}
  };

  const state = { engine:'mandelbrot', ...concepts.mandelbrot.defaults };

  function addEngineOptions() {
    let group = [...genEngine.children].find(n => n.tagName === 'OPTGROUP' && n.label === 'Math Lab');
    if (!group) {
      group = document.createElement('optgroup');
      group.label = 'Math Lab';
      genEngine.appendChild(group);
    }
    for (const [key, meta] of Object.entries(concepts)) {
      if ([...genEngine.options].some(o => o.value === key)) continue;
      const option = document.createElement('option');
      option.value = key;
      option.textContent = `${meta.group} · ${meta.name}`;
      group.appendChild(option);
    }
  }

  function injectUI() {
    if (byId('mathLab')) return;
    const actions = document.querySelector('.genActions');
    if (!actions) return;
    const panel = document.createElement('details');
    panel.id = 'mathLab';
    panel.className = 'mathLab webArt';
    panel.open = true;
    panel.dataset.webpanel = 'art';
    const conceptOptions = Object.entries(concepts).map(([key, m]) => `<option value="${key}">${m.group} · ${m.name}</option>`).join('');
    const recipeOptions = Object.entries(recipes).map(([key, r]) => `<option value="${key}">${r.label}</option>`).join('');
    panel.innerHTML = `<summary>Mathematical visual laboratory</summary><div class="mathBody"><div class="mathTop"><label>Concept<select id="mathConcept">${conceptOptions}</select></label><label>Recipe<select id="mathRecipe"><option value="">Math recipe…</option>${recipeOptions}</select></label><button id="mathExplore">Explore</button><button id="mathReset">Reset</button></div><div class="mathGrid"><label>A<input id="mathA" type="number" step=".001"></label><label>B<input id="mathB" type="number" step=".001"></label><label>C<input id="mathC" type="number" step=".001"></label><label>D<input id="mathD" type="number" step=".001"></label><label>Detail<input id="mathDetail" type="range" min="1" max="10" step="1"></label><label>Zoom<input id="mathZoom" type="number" min=".05" max="1000" step=".05"></label><label>Center X<input id="mathCX" type="number" min="-10" max="10" step=".001"></label><label>Center Y<input id="mathCY" type="number" min="-10" max="10" step=".001"></label><label>Points<input id="mathDensity" type="number" min="64" max="140000" step="64"></label><label>Symmetry<input id="mathSymmetry" type="number" min="1" max="12" step="1"></label><label>Stroke<input id="mathLine" type="number" min=".25" max="8" step=".25"></label><label>Color<select id="mathColor"><option value="smooth">Smooth palette</option><option value="bands">Contour bands</option><option value="phase">Phase / orbit</option><option value="binary">Binary / nodes</option><option value="mono">Monochrome</option><option value="invert">Inverted palette</option></select></label><label class="inlineCheck">Animate<input id="mathAnimate" type="checkbox"></label></div><div class="mathInfo"><strong id="mathName"></strong><code id="mathFormula"></code><span id="mathDescription"></span><span id="mathReadout" class="mathReadout"></span></div></div>`;
    const artLab = byId('artLab');
    if (artLab && artLab.parentNode === actions.parentNode) actions.parentNode.insertBefore(panel, artLab.nextSibling);
    else actions.before(panel);
    const tab = document.body.dataset.webtab || 'all';
    panel.classList.toggle('webHidden', !['all','art'].includes(tab));
  }

  function defaultsFor(engine) {
    return { engine, ...concepts[engine].defaults };
  }

  function loadLocal() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null');
      if (saved && concepts[saved.engine]) Object.assign(state, defaultsFor(saved.engine), saved);
    } catch {}
  }

  function saveLocal() {
    try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch {}
  }

  function writeUI() {
    const values = {mathConcept:'engine',mathA:'a',mathB:'b',mathC:'c',mathD:'d',mathDetail:'detail',mathZoom:'zoom',mathCX:'cx',mathCY:'cy',mathDensity:'density',mathSymmetry:'symmetry',mathLine:'line',mathColor:'color'};
    for (const [id,key] of Object.entries(values)) {
      const n = byId(id);
      if (n) n.value = String(state[key]);
    }
    const animate = byId('mathAnimate');
    if (animate) animate.checked = !!state.animate;
    const meta = concepts[state.engine];
    if (byId('mathName')) byId('mathName').textContent = meta.name;
    if (byId('mathFormula')) byId('mathFormula').textContent = meta.formula;
    if (byId('mathDescription')) byId('mathDescription').textContent = `${meta.group}. A/B/C/D are concept parameters; Detail controls iteration/order; all output can be rasterized through Pixel/ASCII modes.`;
  }

  function readUI() {
    const num = (id, fallback) => {
      const v = +byId(id)?.value;
      return Number.isFinite(v) ? v : fallback;
    };
    state.engine = byId('mathConcept')?.value || state.engine;
    state.a = num('mathA', state.a);
    state.b = num('mathB', state.b);
    state.c = num('mathC', state.c);
    state.d = num('mathD', state.d);
    state.detail = clamp(Math.round(num('mathDetail', state.detail)), 1, 10);
    state.zoom = clamp(num('mathZoom', state.zoom), 0.05, 1000);
    state.cx = num('mathCX', state.cx);
    state.cy = num('mathCY', state.cy);
    state.density = clamp(Math.round(num('mathDensity', state.density)), 64, POINT_CAP);
    state.symmetry = clamp(Math.round(num('mathSymmetry', state.symmetry)), 1, 12);
    state.line = clamp(num('mathLine', state.line), 0.25, 8);
    state.color = byId('mathColor')?.value || state.color;
    state.animate = !!byId('mathAnimate')?.checked;
    saveLocal();
  }

  function activate() {
    genEngine.value = state.engine;
    if (media !== 'generated') startGenerated();
    else renderStaticIfNeeded();
    saveLocal();
  }

  function applyRecipe(key) {
    const recipe = recipes[key];
    if (!recipe) return;
    Object.assign(state, defaultsFor(recipe.engine), recipe.set);
    writeUI();
    activate();
  }

  function explore() {
    const base = concepts[state.engine].defaults;
    const rand = mulberry32(hash32(`${seedEl.value}|math-explore|${Date.now()}`));
    const jitter = value => value + (rand() - 0.5) * Math.max(0.5, Math.abs(value)) * 0.75;
    state.a = jitter(base.a);
    state.b = jitter(base.b);
    state.c = jitter(base.c);
    state.d = jitter(base.d);
    state.zoom = clamp(base.zoom * Math.pow(2, (rand() - 0.5) * 2), 0.05, 1000);
    state.cx = base.cx + (rand() - 0.5) / state.zoom;
    state.cy = base.cy + (rand() - 0.5) / state.zoom;
    state.symmetry = rand() > 0.72 ? 2 + Math.floor(rand() * 5) : base.symmetry;
    state.color = ['smooth','bands','phase','binary','invert'][Math.floor(rand() * 5)];
    state.animate = rand() > 0.4;
    writeUI();
    activate();
  }

  function parseColor(css) {
    colorCtx.clearRect(0,0,1,1);
    colorCtx.fillStyle = css;
    colorCtx.fillRect(0,0,1,1);
    const d = colorCtx.getImageData(0,0,1,1).data;
    return [d[0],d[1],d[2]];
  }

  function paletteRGB(c) {
    return paletteFor({...c,mode:'pixel'}).map(parseColor);
  }

  function colorAt(value, phase, palette) {
    let v = clamp(Number.isFinite(value) ? value : 0, 0, 1);
    const p = Number.isFinite(phase) ? phase : 0;
    if (state.color === 'bands') v = ((v * 10) % 1 + 1) % 1;
    if (state.color === 'phase') v = ((v + p) % 1 + 1) % 1;
    if (state.color === 'binary') v = v > 0.5 ? 1 : 0;
    if (state.color === 'invert') v = 1 - v;
    if (state.color === 'mono') {
      const q = Math.round(v * 255);
      return [q,q,q];
    }
    const scaled = v * (palette.length - 1);
    const i = Math.min(palette.length - 2, Math.floor(scaled));
    const f = scaled - i;
    const a = palette[Math.max(0,i)];
    const b = palette[Math.max(1,i + 1)];
    return [a[0] + (b[0]-a[0])*f, a[1] + (b[1]-a[1])*f, a[2] + (b[2]-a[2])*f];
  }

  function ensure(c) {
    if (sourceCanvas.width !== c.w || sourceCanvas.height !== c.h) {
      sourceCanvas.width = c.w;
      sourceCanvas.height = c.h;
    }
    sourceCtx.setTransform(1,0,0,1,0,0);
    sourceCtx.globalAlpha = 1;
    sourceCtx.globalCompositeOperation = 'source-over';
    sourceCtx.imageSmoothingEnabled = false;
  }

  function clear(c) {
    ensure(c);
    sourceCtx.fillStyle = '#03050a';
    sourceCtx.fillRect(0,0,c.w,c.h);
  }

  function sampleSize(c) {
    const aspect = c.w / c.h;
    let w = Math.min(c.w, Math.max(48, Math.floor(Math.sqrt(FIELD_BUDGET * aspect))));
    let h = Math.min(c.h, Math.max(48, Math.floor(w / aspect)));
    if (w * h > FIELD_BUDGET) {
      const k = Math.sqrt(FIELD_BUDGET / (w * h));
      w = Math.max(48, Math.floor(w * k));
      h = Math.max(48, Math.floor(h * k));
    }
    return [w,h];
  }

  function renderField(c, fn) {
    const [w,h] = sampleSize(c);
    const palette = paletteRGB(c);
    work.width = w;
    work.height = h;
    const image = wctx.createImageData(w,h);
    for (let y=0; y<h; y++) {
      for (let x=0; x<w; x++) {
        const result = fn((x+0.5)/w, (y+0.5)/h) || 0;
        const value = typeof result === 'number' ? result : result.v;
        const phase = typeof result === 'number' ? 0 : (result.phase || 0);
        const rgb = colorAt(value, phase, palette);
        const i = (y*w+x)*4;
        image.data[i] = rgb[0];
        image.data[i+1] = rgb[1];
        image.data[i+2] = rgb[2];
        image.data[i+3] = 255;
      }
    }
    wctx.putImageData(image,0,0);
    clear(c);
    sourceCtx.drawImage(work,0,0,w,h,0,0,c.w,c.h);
  }

  function complexPoint(u,v,c,span=3.4) {
    return [state.cx + (u-0.5)*span*(c.w/c.h)/state.zoom, state.cy + (v-0.5)*span/state.zoom];
  }

  function renderEscape(c, time, type) {
    const maxIter = 24 + state.detail * 18;
    const bailout = Math.max(2, Math.abs(state.a) || 2);
    const drift = state.animate ? Math.sin(time * 0.35) * 0.035 : 0;
    renderField(c, (u,v) => {
      let [x,y] = complexPoint(u,v,c,type === 'burningship' ? 3.1 : 3.4);
      let cr = x, ci = y, zr = 0, zi = 0;
      if (type === 'julia') {
        zr = x; zi = y; cr = state.a + drift; ci = state.b + Math.cos(time*0.27)*drift;
      }
      for (let i=0; i<maxIter; i++) {
        if (type === 'burningship') { zr = Math.abs(zr); zi = Math.abs(zi); }
        const nextR = zr*zr - zi*zi + cr;
        const nextI = 2*zr*zi + ci;
        zr = nextR; zi = nextI;
        const mag = zr*zr + zi*zi;
        if (mag > bailout*bailout) {
          const smooth = i + 1 - Math.log2(Math.max(1e-9, Math.log2(Math.sqrt(mag))));
          return {v:clamp(smooth/maxIter,0,1),phase:(Math.atan2(zi,zr)/(2*Math.PI)+1)%1};
        }
      }
      return {v:0,phase:0};
    });
  }

  function renderNewton(c) {
    const maxIter = 12 + state.detail * 6;
    renderField(c, (u,v) => {
      let [zr,zi] = complexPoint(u,v,c,3.4);
      for (let i=0; i<maxIter; i++) {
        const z2r = zr*zr - zi*zi;
        const z2i = 2*zr*zi;
        const z3r = z2r*zr - z2i*zi;
        const z3i = z2r*zi + z2i*zr;
        const fr = z3r - 1, fi = z3i, dr = 3*z2r, di = 3*z2i;
        const den = dr*dr + di*di;
        if (den < 1e-12) break;
        const qr = (fr*dr + fi*di) / den;
        const qi = (fi*dr - fr*di) / den;
        zr -= qr; zi -= qi;
        if (qr*qr + qi*qi < 1e-10) {
          const phase = (Math.atan2(zi,zr)/(2*Math.PI)+1)%1;
          return {v:1-i/maxIter,phase};
        }
      }
      return 0;
    });
  }

  function renderDomain(c,time) {
    const drift = state.animate ? Math.sin(time*0.3)*0.3 : 0;
    renderField(c, (u,v) => {
      const [x,y] = complexPoint(u,v,c,4);
      const zr = (state.a || 1)*x + state.c + drift;
      const zi = (state.a || 1)*y + state.d;
      const z2r = zr*zr - zi*zi;
      const z2i = 2*zr*zi;
      const sr = Math.sin(z2r) * Math.cosh(z2i);
      const si = Math.cos(z2r) * Math.sinh(z2i);
      const magnitude = Math.hypot(sr,si);
      return {v:(Math.log1p(magnitude)*Math.max(0.2,Math.abs(state.b)||0.4))%1,phase:(Math.atan2(si,sr)/(2*Math.PI)+1)%1};
    });
  }

  function renderChladni(c,time) {
    const n = Math.max(1,Math.round(Math.abs(state.a)));
    const m = Math.max(1,Math.round(Math.abs(state.b)));
    const sharp = Math.max(4,Math.abs(state.c)||18);
    const drift = state.animate ? Math.sin(time*0.4)*0.3 : 0;
    renderField(c, (u,v) => {
      const x = u*2-1, y = v*2-1;
      const q = Math.sin(Math.PI*(n+drift)*x)*Math.sin(Math.PI*m*y)-Math.sin(Math.PI*m*x)*Math.sin(Math.PI*(n+drift)*y);
      return {v:Math.exp(-Math.abs(q)*sharp),phase:(Math.atan2(y,x)/(2*Math.PI)+1)%1};
    });
  }

  function trajectory(c, step, initial, time) {
    clear(c);
    const count = clamp(Math.round(state.density),500,POINT_CAP);
    const xs = new Float32Array(count), ys = new Float32Array(count);
    let p = initial(time), minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for (let i=0; i<count+160; i++) {
      p = step(p,i,time);
      if (i < 160) continue;
      const j = i-160, x=p[0], y=p[1];
      if (!Number.isFinite(x) || !Number.isFinite(y)) { p=initial(time); continue; }
      xs[j]=x; ys[j]=y;
      minX=Math.min(minX,x); maxX=Math.max(maxX,x); minY=Math.min(minY,y); maxY=Math.max(maxY,y);
    }
    const dx=Math.max(1e-9,maxX-minX), dy=Math.max(1e-9,maxY-minY), palette=paletteFor({...c,mode:'pixel'});
    const pad=Math.min(c.w,c.h)*0.06, usableW=c.w-2*pad, usableH=c.h-2*pad;
    sourceCtx.globalCompositeOperation='lighter';
    for (let i=0; i<count; i++) {
      const nx=(xs[i]-minX)/dx-0.5, ny=(ys[i]-minY)/dy-0.5;
      sourceCtx.fillStyle=palette[Math.min(palette.length-1,Math.floor((i/count)*palette.length))];
      sourceCtx.globalAlpha=0.08+0.45*i/count;
      for (let k=0; k<state.symmetry; k++) {
        const a=2*Math.PI*k/state.symmetry, rx=nx*Math.cos(a)-ny*Math.sin(a), ry=nx*Math.sin(a)+ny*Math.cos(a);
        sourceCtx.fillRect(c.w/2+rx*usableW,c.h/2+ry*usableH,state.line,state.line);
      }
    }
    sourceCtx.globalAlpha=1;
    sourceCtx.globalCompositeOperation='source-over';
  }

  function renderClifford(c,time) {
    const drift=state.animate?Math.sin(time*0.2)*0.05:0;
    trajectory(c,p=>[Math.sin((state.a+drift)*p[1])+state.c*Math.cos(state.a*p[0]),Math.sin(state.b*p[0])+state.d*Math.cos(state.b*p[1])],()=>[0.1,0.1],time);
  }

  function renderDeJong(c,time) {
    const drift=state.animate?Math.sin(time*0.18)*0.06:0;
    trajectory(c,p=>[Math.sin((state.a+drift)*p[1])-Math.cos(state.b*p[0]),Math.sin(state.c*p[0])-Math.cos(state.d*p[1])],()=>[0.1,0.1],time);
  }

  function renderHenon(c,time) {
    const a=state.a+(state.animate?Math.sin(time*0.2)*0.015:0), b=state.b;
    trajectory(c,p=>[1-a*p[0]*p[0]+p[1],b*p[0]],()=>[0.1,0.1],time);
  }

  function renderLorenz(c,time) {
    const sigma=state.a||10, rho=state.b||28, beta=state.c||2.667, dt=clamp(Math.abs(state.d)||0.006,0.001,0.02);
    trajectory(c,p=>{const[x,y,z]=p;return[x+sigma*(y-x)*dt,z+(x*y-beta*z)*dt,y+(x*(rho-z)-y)*dt];},()=>[0.1,0,0.1],time);
  }

  function curve(c, points) {
    clear(c);
    const palette=paletteFor({...c,mode:'pixel'});
    sourceCtx.lineWidth=state.line;
    sourceCtx.globalCompositeOperation='lighter';
    for (let copy=0; copy<state.symmetry; copy++) {
      sourceCtx.save();
      sourceCtx.translate(c.w/2,c.h/2);
      sourceCtx.rotate(copy*2*Math.PI/state.symmetry);
      for (let band=0; band<palette.length; band++) {
        sourceCtx.strokeStyle=palette[band];
        sourceCtx.globalAlpha=0.25+0.5*band/palette.length;
        sourceCtx.beginPath();
        let first=true;
        for (let i=band; i<points.length; i+=palette.length) {
          const p=points[i], x=p[0]*c.w*0.42/state.zoom, y=p[1]*c.h*0.42/state.zoom;
          if (first) { sourceCtx.moveTo(x,y); first=false; } else sourceCtx.lineTo(x,y);
        }
        sourceCtx.stroke();
      }
      sourceCtx.restore();
    }
    sourceCtx.globalAlpha=1;
    sourceCtx.globalCompositeOperation='source-over';
  }

  function renderLissajous(c,time) {
    const n=clamp(Math.round(state.density),1000,40000), points=[], phase=state.c+(state.animate?time*0.25:0);
    for(let i=0;i<n;i++){const t=i/n*2*Math.PI;points.push([Math.sin(state.a*t+phase),Math.sin(state.b*t)]);}
    curve(c,points);
  }

  function renderHarmonograph(c,time) {
    const n=clamp(Math.round(state.density),1000,50000), points=[], phase=state.animate?time*0.3:0;
    for(let i=0;i<n;i++){const t=i/n*24,decay=0.035+state.detail*0.002,x=(Math.sin(state.a*t+phase)*Math.exp(-decay*t)+0.7*Math.sin(state.c*t+1.1)*Math.exp(-decay*0.7*t))/1.7,y=(Math.sin(state.b*t+0.6)*Math.exp(-decay*0.9*t)+0.7*Math.sin(state.d*t+phase)*Math.exp(-decay*0.6*t))/1.7;points.push([x,y]);}
    curve(c,points);
  }

  function renderSuperformula(c,time) {
    const n=clamp(Math.round(state.density),1000,30000),points=[],m=Math.max(0.1,Math.abs(state.a)),n1=Math.max(0.05,Math.abs(state.b)),n2=Math.max(0.05,Math.abs(state.c)),n3=Math.max(0.05,Math.abs(state.d)),phase=state.animate?time*0.15:0;
    for(let i=0;i<n;i++){const a=i/n*2*Math.PI+phase,r=Math.pow(Math.pow(Math.abs(Math.cos(m*a/4)),n2)+Math.pow(Math.abs(Math.sin(m*a/4)),n3),-1/n1);points.push([0.72*r*Math.cos(a),0.72*r*Math.sin(a)]);}
    curve(c,points);
  }

  function renderRose(c,time) {
    const n=clamp(Math.round(state.density),1000,30000),points=[],k=Math.abs(state.b)>1e-9?state.a/state.b:state.a,phase=state.animate?time*0.12:0;
    for(let i=0;i<n;i++){const a=i/n*2*Math.PI*Math.max(1,Math.abs(state.b))+phase,r=Math.cos(k*a);points.push([r*Math.cos(a),r*Math.sin(a)]);}
    curve(c,points);
  }

  function renderModular(c,time) {
    clear(c);
    const N=clamp(Math.round(state.density),32,1600), multiplier=state.a+(state.animate?time*0.15:0), radius=Math.min(c.w,c.h)*0.43, palette=paletteFor({...c,mode:'pixel'});
    sourceCtx.lineWidth=state.line;
    sourceCtx.globalAlpha=0.36;
    for(let i=0;i<N;i++){const a=i/N*2*Math.PI-Math.PI/2,j=((i*multiplier)%N+N)%N,b=j/N*2*Math.PI-Math.PI/2;sourceCtx.strokeStyle=palette[i%palette.length];sourceCtx.beginPath();sourceCtx.moveTo(c.w/2+Math.cos(a)*radius,c.h/2+Math.sin(a)*radius);sourceCtx.lineTo(c.w/2+Math.cos(b)*radius,c.h/2+Math.sin(b)*radius);sourceCtx.stroke();}
    sourceCtx.globalAlpha=1;
  }

  function renderPhyllotaxis(c,time) {
    clear(c);
    const N=clamp(Math.round(state.density),100,60000), angle=(state.a||137.507764)*Math.PI/180+(state.animate?Math.sin(time*0.25)*0.0008:0), radius=Math.min(c.w,c.h)*0.46/state.zoom, palette=paletteFor({...c,mode:'pixel'});
    for(let i=0;i<N;i++){const q=i/N,r=Math.sqrt(q)*radius,a=i*angle+(state.animate?time*0.08:0),x=c.w/2+Math.cos(a)*r,y=c.h/2+Math.sin(a)*r,sz=Math.max(0.6,state.line*(0.5+q*1.5));sourceCtx.fillStyle=palette[Math.min(palette.length-1,Math.floor(q*palette.length))];sourceCtx.globalAlpha=0.45+0.55*q;sourceCtx.beginPath();sourceCtx.arc(x,y,sz,0,2*Math.PI);sourceCtx.fill();}
    sourceCtx.globalAlpha=1;
  }

  function renderLogistic(c) {
    clear(c);
    const w=Math.min(c.w,900),h=Math.min(c.h,700),r0=Math.min(state.a,state.b),r1=Math.max(state.a,state.b),palette=paletteFor({...c,mode:'pixel'});
    work.width=w;work.height=h;wctx.fillStyle='#03050a';wctx.fillRect(0,0,w,h);wctx.fillStyle=palette[palette.length-1];wctx.globalAlpha=0.34;
    for(let x=0;x<w;x++){const r=r0+(r1-r0)*x/(w-1);let y=clamp(state.c||0.5,0.001,0.999);for(let i=0;i<350;i++)y=r*y*(1-y);for(let i=0;i<120;i++){y=r*y*(1-y);wctx.fillRect(x,(1-y)*(h-1),1,1);}}
    wctx.globalAlpha=1;sourceCtx.drawImage(work,0,0,w,h,0,0,c.w,c.h);
  }

  function sieve(n) {
    const prime=new Uint8Array(n+1);prime.fill(1,2);for(let i=2;i*i<=n;i++)if(prime[i])for(let j=i*i;j<=n;j+=i)prime[j]=0;return prime;
  }

  function renderUlam(c) {
    const grid=(Math.min(401,51+state.detail*34)|1), max=grid*grid, prime=sieve(max), palette=paletteFor({...c,mode:'pixel'});
    work.width=work.height=grid;wctx.fillStyle='#03050a';wctx.fillRect(0,0,grid,grid);
    let x=(grid-1)/2,y=(grid-1)/2,n=1,step=1,dir=0;const dirs=[[1,0],[0,-1],[-1,0],[0,1]];
    while(n<=max){for(let twice=0;twice<2;twice++){for(let k=0;k<step&&n<=max;k++,n++){if(prime[n]){wctx.fillStyle=palette[n%palette.length];wctx.fillRect(x,y,1,1);}x+=dirs[dir][0];y+=dirs[dir][1];}dir=(dir+1)%4;}step++;}
    clear(c);sourceCtx.drawImage(work,0,0,grid,grid,0,0,c.w,c.h);
  }

  function renderHilbert(c,time) {
    const order=clamp(Math.round(state.detail),1,8),n=1<<order,total=n*n,points=[];
    function rotate(s,x,y,rx,ry){if(ry===0){if(rx===1){x=s-1-x;y=s-1-y;}const t=x;x=y;y=t;}return[x,y];}
    function point(d){let x=0,y=0,t=d;for(let s=1;s<n;s*=2){const rx=1&(t>>1),ry=1&(t^rx);[x,y]=rotate(s,x,y,rx,ry);x+=s*rx;y+=s*ry;t>>=2;}return[x/(n-1)-0.5,y/(n-1)-0.5];}
    for(let i=0;i<total;i++){let[x,y]=point(i);if(state.animate){const a=Math.sin(time*0.2)*0.2,rx=x*Math.cos(a)-y*Math.sin(a),ry=x*Math.sin(a)+y*Math.cos(a);x=rx;y=ry;}points.push([x*1.9,y*1.9]);}
    curve(c,points);
  }

  function renderSierpinski(c) {
    clear(c);
    const N=clamp(Math.round(state.density),1000,POINT_CAP),palette=paletteFor({...c,mode:'pixel'}),rand=mulberry32(hash32(`${seedEl.value}|sierpinski`)),vertices=[[c.w*0.5,c.h*0.06],[c.w*0.06,c.h*0.92],[c.w*0.94,c.h*0.92]];
    let x=c.w*0.5,y=c.h*0.5;
    for(let i=0;i<N;i++){const k=Math.floor(rand()*3);x=(x+vertices[k][0])*0.5;y=(y+vertices[k][1])*0.5;if(i>20){sourceCtx.fillStyle=palette[(k+i)%palette.length];sourceCtx.globalAlpha=0.25+0.65*i/N;sourceCtx.fillRect(x,y,state.line,state.line);}}
    sourceCtx.globalAlpha=1;
  }

  function drawOverlay(c) {
    if (!byId('overlayEnabled')?.checked || inputMedia === 'none') return;
    const [rw,rh]=refSize();if(!rw||!rh)return;const ref=refSource(),fit=byId('overlayFit')?.value||'cover',opacity=clamp(+(byId('overlayOpacity')?.value||0.5),0,1),scale=+(byId('overlayScale')?.value||1),rotation=+(byId('overlayRotate')?.value||0)*Math.PI/180,panX=+(byId('overlayX')?.value||0),panY=+(byId('overlayY')?.value||0);let dw=c.w,dh=c.h;if(fit!=='stretch'){const k=fit==='contain'?Math.min(c.w/rw,c.h/rh):fit==='native'?1:Math.max(c.w/rw,c.h/rh);dw=rw*k;dh=rh*k;}sourceCtx.save();sourceCtx.globalAlpha=opacity;sourceCtx.globalCompositeOperation=byId('overlayBlend')?.value||'source-over';sourceCtx.translate(c.w/2+panX,c.h/2+panY);sourceCtx.rotate(rotation);sourceCtx.scale(scale,scale);sourceCtx.drawImage(ref,-dw/2,-dh/2,dw,dh);sourceCtx.restore();sourceCtx.globalAlpha=1;sourceCtx.globalCompositeOperation='source-over';
  }

  const glyphSets={classic:' .:-=+*#%@',dense:' .,:;irsXA253hMHGS#9B&@',blocks:' ░▒▓█',binary:' 01',technical:' .+*xX#@',braille:' ⡀⡄⡆⣆⣧⣿'};
  const bayer4=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];

  function postProcess(c) {
    const mode=genMode.value;
    if(mode==='pixel' && +cellSize.value<=2)return;
    let cell=Math.max(2,+cellSize.value||8),aspect=mode==='pixel'?1:clamp(+(byId('glyphAspect')?.value||1),0.5,2),limit=mode==='pixel'?180000:90000,cols=Math.ceil(c.w/cell),rows=Math.ceil(c.h/(cell*aspect));
    if(cols*rows>limit){cell=Math.ceil(cell*Math.sqrt(cols*rows/limit));cols=Math.ceil(c.w/cell);rows=Math.ceil(c.h/(cell*aspect));}
    const cellH=cell*aspect;work.width=cols;work.height=rows;wctx.imageSmoothingEnabled=true;wctx.drawImage(sourceCanvas,0,0,cols,rows);const data=wctx.getImageData(0,0,cols,rows).data,palette=paletteFor({...c,mode:'pixel'}),steps=clamp(+(byId('toneSteps')?.value||8),2,32),dither=byId('artDither')?.value||'none',shape=byId('pixelShape')?.value||'square',gap=clamp(+(byId('pixelGap')?.value||0),0,8),set=byId('glyphSet')?.value||'dense',charsRaw=set==='custom'?(byId('glyphChars')?.value||glyphSets.dense):(glyphSets[set]||glyphSets.dense),chars=byId('glyphInvert')?.checked?[...charsRaw].reverse().join(''):charsRaw,bg=byId('asciiBg')?.value||'#03050a';sourceCtx.clearRect(0,0,c.w,c.h);if(mode!=='pixel'){sourceCtx.fillStyle=bg;sourceCtx.fillRect(0,0,c.w,c.h);sourceCtx.font=`${Math.max(5,cell*0.9)}px ui-monospace,SFMono-Regular,Consolas,monospace`;sourceCtx.textBaseline='top';}
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const i=(y*cols+x)*4,r=data[i],g=data[i+1],b=data[i+2],raw=(r+g+b)/765,offset=dither==='bayer4'?((bayer4[y%4][x%4]+0.5)/16-0.5)*0.18:dither==='noise'?(mulberry32(hash32(`${seedEl.value}|math-dither|${x}|${y}`))()-0.5)*0.12:0,br=clamp(Math.round(clamp(raw+offset,0,1)*(steps-1))/(steps-1),0,1),px=x*cell,py=y*cellH;if(mode==='pixel'){sourceCtx.fillStyle=steps<=4?palette[Math.min(palette.length-1,Math.floor(br*palette.length))]:`rgb(${r},${g},${b})`;const gp=Math.min(gap,Math.max(0,Math.min(cell,cellH)/2-1)),xx=px+gp,yy=py+gp,w=Math.max(1,cell-2*gp),h=Math.max(1,cellH-2*gp);if(shape==='circle'){sourceCtx.beginPath();sourceCtx.ellipse(xx+w/2,yy+h/2,w/2,h/2,0,0,2*Math.PI);sourceCtx.fill();}else if(shape==='diamond'){sourceCtx.beginPath();sourceCtx.moveTo(xx+w/2,yy);sourceCtx.lineTo(xx+w,yy+h/2);sourceCtx.lineTo(xx+w/2,yy+h);sourceCtx.lineTo(xx,yy+h/2);sourceCtx.closePath();sourceCtx.fill();}else if(shape==='cross'){sourceCtx.fillRect(xx,yy+h*0.38,w,Math.max(1,h*0.24));sourceCtx.fillRect(xx+w*0.38,yy,Math.max(1,w*0.24),h);}else sourceCtx.fillRect(xx,yy,w,h);}else{const ch=chars[Math.min(chars.length-1,Math.floor(br*(chars.length-1)))]||' ',colorMode=byId('glyphColor')?.value||'source';if(mode==='hybrid'){sourceCtx.fillStyle=palette[Math.min(palette.length-1,Math.floor(br*palette.length))];sourceCtx.fillRect(px,py,cell,cellH);sourceCtx.fillStyle=br>0.5?'#fff':'#05070a';}else if(mode==='ansi'||colorMode==='source')sourceCtx.fillStyle=`rgb(${r},${g},${b})`;else if(colorMode==='palette')sourceCtx.fillStyle=palette[Math.min(palette.length-1,Math.floor(br*palette.length))];else if(colorMode==='green')sourceCtx.fillStyle='#5cff79';else if(colorMode==='amber')sourceCtx.fillStyle='#ffbf4a';else if(colorMode==='cyan')sourceCtx.fillStyle='#62e6ff';else sourceCtx.fillStyle='#f3f4f6';sourceCtx.fillText(ch,px,py);}}
    if(byId('mathReadout'))byId('mathReadout').textContent=`${concepts[state.engine].name} · ${cols}×${rows} ${mode} cells · field cap ${(FIELD_BUDGET/1000)|0}k`;
  }

  const renderers={
    mandelbrot:(c,t)=>renderEscape(c,t,'mandelbrot'),
    julia:(c,t)=>renderEscape(c,t,'julia'),
    burningship:(c,t)=>renderEscape(c,t,'burningship'),
    newton:renderNewton,
    domain:renderDomain,
    chladni:renderChladni,
    clifford:renderClifford,
    dejong:renderDeJong,
    henon:renderHenon,
    lorenz:renderLorenz,
    lissajous:renderLissajous,
    harmonograph:renderHarmonograph,
    superformula:renderSuperformula,
    rose:renderRose,
    modular:renderModular,
    phyllotaxis:renderPhyllotaxis,
    logistic:renderLogistic,
    ulam:renderUlam,
    hilbert:renderHilbert,
    sierpinski:renderSierpinski
  };

  function renderMath(time=0) {
    const c=generatorConfig(),fn=renderers[c.engine];
    if(!fn)return false;
    state.engine=c.engine;
    const t=state.animate?motionTime(c,time):0;
    try {
      fn(c,t);
      drawOverlay(c);
      postProcess(c);
      return true;
    } catch (error) {
      console.error('Math Lab renderer failed; using prior generator',error);
      return false;
    }
  }

  generateSource=function(time=0){if(!renderMath(time))priorGenerateSource(time);};

  function bind() {
    byId('mathConcept')?.addEventListener('change',e=>{const engine=e.target.value;if(!concepts[engine])return;Object.assign(state,defaultsFor(engine));writeUI();activate();});
    byId('mathRecipe')?.addEventListener('change',e=>{if(e.target.value)applyRecipe(e.target.value);});
    for(const id of ['mathA','mathB','mathC','mathD','mathDetail','mathZoom','mathCX','mathCY','mathDensity','mathSymmetry','mathLine','mathColor','mathAnimate'])byId(id)?.addEventListener('input',()=>{readUI();genEngine.value=state.engine;renderStaticIfNeeded();});
    byId('mathExplore')?.addEventListener('click',explore);
    byId('mathReset')?.addEventListener('click',()=>{Object.assign(state,defaultsFor(state.engine));writeUI();activate();});
    genEngine.addEventListener('change',()=>{if(concepts[genEngine.value]){Object.assign(state,defaultsFor(genEngine.value));writeUI();saveLocal();}});
  }

  function exportState(){readUI();return JSON.parse(JSON.stringify(state));}
  function importState(value){if(!value||!concepts[value.engine])return;Object.assign(state,defaultsFor(value.engine),value);writeUI();genEngine.value=state.engine;saveLocal();}

  addEngineOptions();
  injectUI();
  loadLocal();
  writeUI();
  bind();
  if(concepts[genEngine.value]){state.engine=genEngine.value;writeUI();}
  window.circuitbendMath={exportState,importState,applyRecipe,concepts:Object.keys(concepts)};
})();
