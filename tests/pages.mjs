import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const advancedCss=fs.readFileSync(path.join(root,'advanced.css'),'utf8');
const projectJs=fs.readFileSync(path.join(root,'project.js'),'utf8');
const streamlined=fs.readFileSync(path.join(root,'streamlined.js'),'utf8');
const viewer=fs.readFileSync(path.join(root,'preview-window.js'),'utf8');
if(!/<meta\s+name=["']viewport["']/i.test(html))throw new Error('index.html needs a viewport meta tag');
if(/<base\s+[^>]*href=["']\//i.test(html))throw new Error('Absolute <base> paths break project GitHub Pages');
const refs=[...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)].map(m=>m[1]);
const local=refs.filter(ref=>! /^(?:[a-z]+:|#|\/\/)/i.test(ref));
for(const ref of local){
  const clean=ref.split(/[?#]/)[0];
  if(!clean)continue;
  if(clean.startsWith('/'))throw new Error(`Root-absolute asset path breaks /circuitbend/ Pages: ${ref}`);
  const target=path.resolve(root,clean);
  if(!target.startsWith(root+path.sep))throw new Error(`Asset escapes repository root: ${ref}`);
  if(!fs.existsSync(target))throw new Error(`Referenced asset missing: ${ref}`);
}
for(const required of ['style.css','advanced.css','main.js','project.js','advanced.js'])if(!local.includes(required))throw new Error(`GitHub Pages entrypoint does not reference ${required}`);
for(const required of ['webview.css','webview.js','mathview.css','mathlab.js','streamlined.css','streamlined.js','preview-window.css','preview-window.js'])if(!fs.existsSync(path.join(root,required)))throw new Error(`Enhanced web asset missing: ${required}`);
if(!/webview\.css/.test(advancedCss)||!/mathview\.css/.test(advancedCss)||/url\(["']?\//.test(advancedCss))throw new Error('advanced.css must import compact/math styles with relative Pages-safe URLs');
if(!/s\.src=['"]webview\.js['"]/.test(projectJs))throw new Error('project.js must load webview.js with a relative Pages-safe URL');
if(!/m\.src=['"]mathlab\.js['"]/.test(projectJs))throw new Error('project.js must load mathlab.js with a relative Pages-safe URL');
if(!/w\.src=['"]streamlined\.js['"]/.test(projectJs))throw new Error('project.js must load streamlined.js with a relative Pages-safe URL');
if(!/v\.src=['"]preview-window\.js['"]/.test(projectJs))throw new Error('project.js must load preview-window.js with a relative Pages-safe URL');
if(!/l\.href=['"]streamlined\.css['"]/.test(streamlined))throw new Error('streamlined.js must load streamlined.css with a relative Pages-safe URL');
if(!/l\.href=['"]preview-window\.css['"]/.test(viewer))throw new Error('preview-window.js must load preview-window.css with a relative Pages-safe URL');
console.log(`Pages OK: ${local.length} entry assets plus compact, Math Lab, streamlined workspace and pop-out viewer assets resolve under the repository subpath.`);
