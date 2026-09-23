import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
const SOURCE = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/glTF-Binary/CarConcept.glb';
const BACKUP = 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/CarConcept/glTF-Binary/CarConcept.glb';
const file = join(process.cwd(), 'public/assets/vehicle.glb');
let bytes;
for (const url of [SOURCE,BACKUP]) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 5_000_000 || buffer.toString('ascii',0,4)!=='glTF') throw new Error('Unexpected or incomplete GLB');
    bytes=buffer; console.log(`Verified licensed 3D vehicle: ${(bytes.length/1048576).toFixed(1)} MiB`); break;
  } catch(error) { console.warn('Asset source unavailable:', String(error)); }
}
if (!bytes) { console.error('A premium licensed GLB is REQUIRED. Build aborted; no placeholder vehicle.'); process.exit(1); }
await mkdir(dirname(file), {recursive:true});
await writeFile(file,bytes);
console.log('Saved',file);


// Keep the reference engine as a distinct asset so the original car textures
// are untouched and the CAD assembly can be normalized and fitted at runtime.
const engineSources=[
 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/2CylinderEngine/glTF-Binary/2CylinderEngine.glb',
 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@main/2.0/2CylinderEngine/glTF-Binary/2CylinderEngine.glb'
];
let engineBytes;
for(const url of engineSources) {
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const candidate=Buffer.from(await response.arrayBuffer());
  if(candidate.length<300000||candidate.toString('ascii',0,4)!=='glTF')throw new Error('Incomplete or invalid CAD engine GLB');
  engineBytes=candidate;
  console.log(`Verified reference engine CAD asset: ${(candidate.length/1048576).toFixed(2)} MiB`);
  break;
 }catch(error){console.warn('Engine download source unavailable:',String(error));}
}
if(!engineBytes){console.error('Reference engine GLB unavailable: cannot ship an empty engine bay.');process.exit(1);}
const engineFile=join(process.cwd(),'public/assets/engine.glb');
await mkdir(dirname(engineFile),{recursive:true});
await writeFile(engineFile,engineBytes);
console.log('Saved',engineFile);
