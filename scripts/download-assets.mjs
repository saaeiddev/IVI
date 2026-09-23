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
