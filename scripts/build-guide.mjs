// One source for the in-app guide and the repository guide. No runtime dependency.
import fs from 'node:fs';
const root = new URL('../',import.meta.url);
const source = fs.readFileSync(new URL('workbench.js',root),'utf8');
const match = source.match(/\/\* guide:start \*\/([\s\S]*?)\/\* guide:end \*\//);
if(!match)throw new Error('Guide data not found');
const guide = JSON.parse(match[1]);
const text = '# Circuitbend field guide\n\nUse **? Guide** in the app for the same instructions, next to your work.\n\n'
  + guide.map(item=>'## '+item.title+'\n\n'+(item.steps?item.steps.map((step,i)=>`${i+1}. ${step}`).join('\n')+'\n\n':'')+item.body.join('\n\n')).join('\n\n')
  + '\n\n---\n\n[Start page](../README.md) · [Development & limits](DEVELOPMENT.md) · [Documentation index](README.md)\n';
const target=new URL('docs/GUIDE.md',root);
if(process.argv.includes('--check')) {
  if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==text)throw new Error('Guide is out of date. Run node scripts/build-guide.mjs');
  console.log('Guide OK: in-app and Markdown instructions match.');
}else fs.writeFileSync(target,text);
