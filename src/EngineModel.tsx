import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useSim } from './simulation';

// Independently authored reference assembly. This is a generic two-cylinder
// demonstration engine, not the Concept GT's claimed OEM powertrain.
const SOURCE = `${import.meta.env.BASE_URL}assets/engine.glb`;
interface Props { onReady: () => void }

export default function EngineModel({onReady}:Props) {
 const {scene} = useGLTF(SOURCE);
 const onReadyRef=useRef(onReady);
 onReadyRef.current=onReady;
 const mount=useRef<THREE.Group>(null);
 const geometry=useMemo(()=>{
   // Clone transform nodes (reuse original meshes, material maps and geometry).
   // Centre and fit the actual CAD assembly rather than guessing a scale.
   const copy=scene.clone(true);
   copy.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(copy);
   const center=bounds.getCenter(new THREE.Vector3());
   const size=bounds.getSize(new THREE.Vector3());
   const factor=Math.min(1.27/Math.max(size.x,.001),.69/Math.max(size.y,.001),.76/Math.max(size.z,.001));
   return {copy, center, factor};
 },[scene]);
 useEffect(()=>{onReadyRef.current()},[geometry]);
 useFrame(({clock})=>{
   if(!mount.current)return;
   const s=useSim.getState();
   // Very light idle vibration; no fictitious piston animation.
   mount.current.position.y=.46+(s.engineOn?Math.sin(clock.elapsedTime*(24+s.throttle*45))*.0023:0);
 });
 return <group name="SupplementalEngine" ref={mount} position={[0,.46,1.85]} rotation={[0,Math.PI/2,0]} scale={geometry.factor}>
   <primitive object={geometry.copy} position={geometry.center.clone().multiplyScalar(-1)} dispose={null}/>
 </group>;
}
