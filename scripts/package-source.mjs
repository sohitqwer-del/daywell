import fs from 'node:fs';
import path from 'node:path';
const destination=path.resolve('artifacts/source-package-1.2/Daywell');
fs.mkdirSync(destination,{recursive:true});
const roots=['src','public','tests','scripts','android','package.json','package-lock.json','index.html','tsconfig.json','vite.config.ts','capacitor.config.ts','playwright.config.ts','vitest.config.ts','.gitignore','LICENSE','README.md','CHANGELOG.md','VALIDATION.md','VALIDATION-1.1.md','VALIDATION-1.2.md','SECURITY.md','CONTRIBUTING.md','.github','.gitattributes','THIRD_PARTY_NOTICES.md'];
const omitted=new Set(['node_modules','build','.gradle','.idea','local.properties','.DS_Store']);
for(const root of roots){fs.cpSync(root,path.join(destination,root),{recursive:true,filter:source=>{
 const relative=path.relative(process.cwd(),source).split(path.sep);
 return !relative.some(part=>omitted.has(part))&&!relative.join('/').startsWith('android/app/src/main/assets/public')&&!/\.(jks|keystore)$/.test(source);
}});}
console.log('Source staged without caches, credentials, build outputs, or local SDK paths.');
