import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
execFileSync(process.execPath,['scripts/build-guide.mjs','--check'],{cwd:root,stdio:'inherit'});
const docs=['README.md','docs/README.md','docs/GUIDE.md','docs/DEVELOPMENT.md'];
let links=0;
for(const name of docs){
  const content=fs.readFileSync(path.join(root,name),'utf8');
  for(const [,ref] of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)){
    if(/^(?:https?:|mailto:|#)/.test(ref))continue;
    const file=path.resolve(root,path.dirname(name),ref.split('#')[0]);
    assert.ok(file.startsWith(root+path.sep),`Path escapes repo: ${ref}`);
    assert.ok(fs.existsSync(file),`Missing documentation link in ${name}: ${ref}`);links++;
  }
}
const home=fs.readFileSync(path.join(root,'README.md'),'utf8');
assert.ok(home.split(/\s+/).length<=400,'README should remain a short start page.');
assert.ok(!home.includes('npm install'),'Keep test setup in the development guide.');
const js=fs.readFileSync(path.join(root,'workbench.js'),'utf8');new Function(js);
assert.ok(fs.readFileSync(path.join(root,'streamlined.js'),'utf8').includes("loadSupport('workbench.js')"),'Missing relative guide loader');
assert.ok(js.includes('showModal()'),'Guide must retain native dialog behavior.');
for(const file of ['streamlined.css','workbench.js'])assert.ok(!/fonts\.google|@font-face/.test(fs.readFileSync(path.join(root,file),'utf8')),'UI must not depend on a remote font.');
console.log(`Docs OK: ${links} local links, concise start page, one synchronized guide and relative workbench loader.`);
