import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  attachRearHoodHinge, createDetailedEngine, HOOD_OPEN_ANGLE,
  installHoodStruts, updateHoodStruts
} from './DetailedEngine';

function makeFixture() {
  const scene=new THREE.Group();
  const chassis=new THREE.Group();
  chassis.name='BodyUnderside';
  chassis.rotation.x=-Math.PI/2; // CarConcept's real z-up to y-up conversion.
  scene.add(chassis);
  const hood=new THREE.Group();
  hood.name='BodyHood';
  hood.position.set(0,-2.37938857,.1760146);
  chassis.add(hood);
  scene.updateMatrixWorld(true);
  return {scene,chassis,hood};
}

describe('CarConcept windshield-side hood rig',()=>{
  it('does not move or rotate the original textured hood when initially attached',()=>{
    const {scene,hood}=makeFixture();
    const before=hood.localToWorld(new THREE.Vector3(0,0,0)).clone();
    const hinge=attachRearHoodHinge(scene);
    expect(hinge).not.toBeNull();
    hood.updateWorldMatrix(true,false);
    const after=hood.localToWorld(new THREE.Vector3(0,0,0));
    expect(after.distanceTo(before)).toBeLessThan(.00001);
  });

  it('lifts the leading edge upward instead of rotating it into the ground',()=>{
    const {scene,hood}=makeFixture();
    const hinge=attachRearHoodHinge(scene)!;
    const closedNose=hood.localToWorld(new THREE.Vector3(0,0,0)).clone();
    hinge.rotation.x=HOOD_OPEN_ANGLE;
    hood.updateWorldMatrix(true,false);
    const openNose=hood.localToWorld(new THREE.Vector3(0,0,0));
    expect(openNose.y).toBeGreaterThan(closedNose.y+.8);
    hinge.rotation.x=0;
    hood.updateWorldMatrix(true,false);
    expect(hood.localToWorld(new THREE.Vector3()).distanceTo(closedNose)).toBeLessThan(.00001);
  });

  it('retains actual V8 banks, eight runners, eight exhaust headers and moving accessories',()=>{
    const engine=createDetailedEngine();
    const names: string[]=[];
    engine.traverse(o=>names.push(o.name));
    expect(names.filter(n=>n==='EngineAluminiumValveCover')).toHaveLength(2);
    expect(names.filter(n=>n==='EngineIndividualIntakeRunner')).toHaveLength(8);
    expect(names.filter(n=>n==='EngineExhaustHeader')).toHaveLength(8);
    expect(names.filter(n=>n==='EngineAccessoryRotor')).toHaveLength(4);
    expect(engine.getObjectByName('EngineCoolingFan')).toBeDefined();
  });

  it('keeps both hood gas struts attached to the moving lid',()=>{
    const {scene,hood}=makeFixture();
    const hinge=attachRearHoodHinge(scene)!;
    installHoodStruts(scene);
    hinge.rotation.x=HOOD_OPEN_ANGLE;
    hood.updateWorldMatrix(true,false);
    updateHoodStruts(scene,true);
    for(const side of ['L','R']){
      const strut=scene.getObjectByName('IVI_HoodStrut_'+side)!;
      expect(strut.visible).toBe(true);
      expect((strut.getObjectByName('HoodStrutCylinder') as THREE.Mesh).scale.y).toBeGreaterThan(.1);
    }
  });
});
