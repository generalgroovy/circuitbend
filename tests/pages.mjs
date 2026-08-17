import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
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
for(const required of ['style.css','main.js'])if(!local.includes(required))throw new Error(`GitHub Pages entrypoint does not reference ${required}`);
console.log(`Pages OK: ${local.length} relative asset references resolve under the repository subpath.`);
