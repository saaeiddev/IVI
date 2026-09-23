import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Detailed, original V8-style under-hood assembly.
 *
 * The licensed CarConcept GLB has a single, unarticulated low-detail "Engine"
 * mesh. This replacement keeps the original body and its PBR textures intact
 * while adding recognizable external mechanical components. It does not claim
 * to model internal combustion or a specific manufacturer's powertrain.
 *
 * CarConcept's BodyUnderside uses authoring coordinates: +Z is up and -Y
 * points toward the car's nose. Its root already maps this to Three.js Y-up.
 */
export function createDetailedEngine(): THREE.Group {
  const engine = new THREE.Group();
  engine.name = 'IVI_DetailedEngine';
  engine.position.set(0, -1.93, .245);

  const alloy = new THREE.MeshStandardMaterial({ color: '#7a858e', metalness: .88, roughness: .34 });
  const machined = new THREE.MeshStandardMaterial({ color: '#b4c0c8', metalness: .93, roughness: .23 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: '#272d32', metalness: .78, roughness: .42 });
  const carbon = new THREE.MeshStandardMaterial({ color: '#111923', metalness: .31, roughness: .44 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#111418', roughness: .92 });
  const copper = new THREE.MeshStandardMaterial({ color: '#b67d46', metalness: .8, roughness: .32 });
  const red = new THREE.MeshStandardMaterial({ color: '#b52732', metalness: .55, roughness: .31 });
  const gold = new THREE.MeshStandardMaterial({ color: '#d1a653', metalness: .75, roughness: .31 });
  const translucent = new THREE.MeshPhysicalMaterial({ color: '#dce3cb', metalness: .05, roughness: .26, transparent: true, opacity: .85 });

  function mount<T extends THREE.Object3D>(parent: THREE.Object3D, object: T, name: string, position: [number, number, number]): T {
    object.name = name;
    object.position.set(...position);
    parent.add(object);
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
    return object;
  }
  function rounded(parent: THREE.Object3D, name: string, position: [number,number,number], size: [number,number,number], material: THREE.Material, radius = .025): THREE.Mesh {
    const geometry = new RoundedBoxGeometry(...size, 3, Math.min(radius, ...size.map(v => v / 3)));
    return mount(parent, new THREE.Mesh(geometry, material), name, position);
  }
  function cylinder(parent: THREE.Object3D, name: string, position: [number,number,number], radius: number, height: number, material: THREE.Material, segments = 24): THREE.Mesh {
    return mount(parent, new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material), name, position);
  }
  function pipe(parent: THREE.Object3D, name: string, coords: [number,number,number][], radius: number, material: THREE.Material): THREE.Mesh {
    const curve = new THREE.CatmullRomCurve3(coords.map(p => new THREE.Vector3(...p)), false, 'centripetal', .5);
    return mount(parent, new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(18, coords.length * 7), radius, 8, false), material), name, [0,0,0]);
  }
  function torus(parent: THREE.Object3D, name: string, position: [number,number,number], radius: number, tube: number, material: THREE.Material): THREE.Mesh {
    const mesh = mount(parent, new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 30), material), name, position);
    mesh.rotation.x = Math.PI / 2; // Torus normal points along the crankshaft (+/- Y).
    return mesh;
  }

  // Real V layout: two canted banks of four cylinders meeting at the crankcase.
  rounded(engine, 'EngineCastCrankcase', [0, .01, .055], [.66,.73,.34], alloy, .07);
  rounded(engine, 'EngineOilSump', [0,.02,-.139], [.57,.62,.105], darkMetal, .026);
  for (let i=0; i<7; i++) {
    const y = -.29 + i*.095;
    rounded(engine, 'EngineCrankcaseRib', [0,y,-.055], [.64,.012,.055], machined, .005);
  }
  const bankVector = (side: number) => new THREE.Vector3(side*.55, 0, .835).normalize();
  for (const side of [-1,1]) {
    const bank = mount(engine, new THREE.Group(), side<0?'EngineLeftBank':'EngineRightBank', [side*.27,.025,.325]);
    bank.rotation.y = side * -.37;
    rounded(bank, 'EngineAluminiumValveCover', [0,0,.055], [.276,.665,.126], darkMetal, .046);
    rounded(bank, 'EngineValveCoverInlay', [0,0,.125], [.18,.56,.013], machined, .007);
    for (let k=0; k<6; k++) {
      const y = -.245 + k*.098;
      rounded(bank, 'EngineValveCoverFin', [0,y,.137], [.184,.012,.01], alloy, .004);
    }
    for (const x of [-.105,.105]) {
      for (const y of [-.272,-.092,.092,.272]) {
        const head = cylinder(bank, 'EngineValveCoverBolt', [x,y,.128], .013,.017, machined, 12);
        head.rotation.x = Math.PI / 2;
        cylinder(bank, 'EngineBoltHead', [x,y,.138], .006,.004, darkMetal, 6).rotation.x=Math.PI/2;
      }
    }
    rounded(bank,'EngineAccentStrip',[side*.084,0,.14],[.021,.53,.009],red,.004);
    for (let i=0; i<4; i++) {
      const y = -.252 + i*.17;
      const bore = cylinder(engine,'EngineCylinderBarrel',[side*.185,y,.142],.107,.275,alloy,18);
      bore.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), bankVector(side));
      // Four individual ignition-coil packs make each V8 bank legible at a glance.
      rounded(bank,'EngineIgnitionCoil',[side*.072,y,.166],[.068,.089,.050],carbon,.011);
      cylinder(bank,'EngineIgnitionConnector',[side*.075,y,.195],.022,.033,rubber,12).rotation.x=Math.PI/2;
      pipe(engine,'EngineIgnitionHarness',[
        [side*.36,y,.505],[side*.46,y,.50],[side*.475,y+.055,.395],[side*.43,.33,.34]
      ],.009,rubber);
      // Four separate, curved stainless exhaust primaries per bank.
      pipe(engine,'EngineExhaustHeader',[
        [side*.37,y,.207],[side*.48,y-.025,.174],[side*.565,y-.016,.048],
        [side*.572,y+.105,-.005],[side*.53,.31,-.008]
      ],.023,machined);
      // Eight visible tubular intake runners feed the central plenum.
      pipe(engine,'EngineIndividualIntakeRunner',[
        [side*.22,y,.40],[side*.19,y,.49],[side*.13,y+.015,.515],
        [side*.095,y+.025,.51]
      ],.032,alloy);
    }
  }

  // Low-profile intake rather than an opaque full-width "suitcase" cover.
  rounded(engine,'EngineIntakeManifold',[0,.015,.454],[.235,.62,.115],darkMetal,.052);
  rounded(engine,'EngineIntakePlenum',[0,.018,.515],[.21,.53,.083],carbon,.03);
  for (let i=0;i<5;i++) {
    rounded(engine,'EngineIntakePlenumRib',[0,-.195+i*.1,.563],[.19,.017,.011],alloy,.005);
  }
  cylinder(engine,'EngineThrottleBody',[0,.324,.477],.094,.14,machined,32).rotation.x=Math.PI/2;
  pipe(engine,'EngineAirIntakeDuct',[[0,.34,.47],[.115,.40,.49],[.36,.43,.44],[.5,.35,.38]],.072,rubber);
  for(let i=0;i<4;i++) torus(engine,'EngineIntakeHoseClamp',[.18+i*.075,.406,.464],.066,.004,machined);
  rounded(engine,'EngineFilterHousing',[.565,.29,.33],[.185,.22,.15],carbon,.032);
  for(let i=0;i<6;i++) rounded(engine,'EngineAirFilterFin',[.665,.205+i*.032,.345],[.01,.012,.142],alloy,.004);

  // Front accessory drive: machined pulleys, belt, ventilated alternator and fan.
  const front = mount(engine,new THREE.Group(),'EngineFrontAccessoryAssembly',[0,-.39,.025]);
  for(const [i,x,z,r] of [[0,0,-.027,.118],[1,-.28,.145,.076],[2,.265,.155,.075],[3,.02,.275,.063]] as number[][]) {
    const rotor = mount(front,new THREE.Group(),'EngineAccessoryRotor',[x,0,z]);
    const wheel = cylinder(rotor,'EngineMachinedPulley',[0,-.018,0],r,.038,darkMetal,38);
    wheel.rotation.x=0;
    torus(rotor,'EnginePulleyRim',[0,-.043,0],r*.87,.013,machined);
    torus(rotor,'EnginePulleyInset',[0,-.047,0],r*.52,.009,alloy);
    cylinder(rotor,'EnginePulleyHub',[0,-.053,0],r*.20,.048,machined,16);
    if(i===1) {
      // Ribbed alternator stator and copper windings behind its pulley.
      cylinder(front,'EngineAlternatorBody',[x,.07,z],.093,.15,alloy,28);
      for(let j=0;j<13;j++){
        const a=j*2*Math.PI/13;
        rounded(front,'EngineAlternatorCoolingVane',[x+Math.cos(a)*.088,.067,z+Math.sin(a)*.088],[.018,.13,.017],machined,.005);
      }
      torus(front,'EngineAlternatorCopperCoil',[x,.088,z],.066,.014,copper);
    }
  }
  pipe(front,'EngineSerpentineBelt',[
    [-.289,-.067,.225],[-.350,-.067,.155],[-.325,-.067,.062],[-.11,-.067,-.155],
    [.09,-.067,-.145],[.312,-.067,.075],[.337,-.067,.17],
    [.20,-.067,.245],[.032,-.067,.338],[-.135,-.067,.303],[-.289,-.067,.225]
  ],.014,rubber);
  const fan = mount(front,new THREE.Group(),'EngineCoolingFan',[0,-.097,.033]);
  cylinder(fan,'EngineFanHub',[0,0,0],.049,.027,darkMetal,22);
  for(let i=0;i<7;i++){
    const a=i*2*Math.PI/7;
    const blade=rounded(fan,'EngineFanBlade',[Math.cos(a)*.124,0,Math.sin(a)*.124],[.17,.012,.059],darkMetal,.018);
    blade.rotation.y=-a;
  }
  torus(front,'EngineFanShroud',[0,-.065,.033],.242,.011,carbon);

  // Distinct coolant hardware, hoses, fuel rail and line clamps.
  for(const side of [-1,1]) {
    pipe(engine,'EngineFuelRail',[[side*.39,-.31,.51],[side*.43,-.15,.51],[side*.43,.13,.51],[side*.43,.29,.51]],.018,machined);
    for(let i=0;i<4;i++) {
      const y=-.255+i*.17;
      cylinder(engine,'EngineInjector',[side*.40,y,.50],.015,.055,gold,12).rotation.x=Math.PI/2;
    }
    pipe(engine,'EngineCoolantHose',[
      [side*.19,-.32,.35],[side*.44,-.38,.37],[side*.57,-.29,.30],
      [side*.60,-.32,.13]
    ],.035,rubber);
    cylinder(engine,'EngineCoolantHoseClamp',[side*.44,-.38,.37],.04,.014,machined,24).rotation.z=Math.PI/2;
  }
  const expansion = rounded(engine,'EngineExpansionTank',[-.65,.21,.235],[.157,.22,.175],translucent,.032);
  expansion.castShadow=false;
  cylinder(engine,'EngineExpansionTankCap',[-.65,.21,.345],.055,.031,carbon,24).rotation.x=Math.PI/2;
  cylinder(engine,'EngineOilFillerCap',[.34,.235,.51],.051,.03,carbon,24).rotation.x=Math.PI/2;
  torus(engine,'EngineOilFillerRing',[.34,.235,.531],.041,.007,gold);

  // Fasteners and brackets interrupt large featureless surfaces at close zoom.
  for(const side of [-1,1]){
    rounded(engine,'EngineMountBracket',[side*.43,.17,-.078],[.18,.14,.055],alloy,.014);
    for(let i=0;i<3;i++){
      const bolt=cylinder(engine,'EngineMountBolt',[side*.46,.105+i*.06,-.046],.014,.021,machined,12);
      bolt.rotation.x=Math.PI/2;
    }
  }
  engine.traverse(o=>{
    if(o instanceof THREE.Mesh){
      o.castShadow=true;
      o.receiveShadow=true;
    }
  });
  return engine;
}

/** A lid anchored at its windshield edge raises its leading (negative-Y) edge. */
export const HOOD_HINGE_POSITION = new THREE.Vector3(0,-1.155,.58);
export const HOOD_OPEN_ANGLE = -1.12;

export function attachRearHoodHinge(scene: THREE.Object3D): THREE.Group | null {
  const existing = scene.getObjectByName('IVI_HoodWindshieldHinge');
  if(existing instanceof THREE.Group){
    existing.rotation.x=0;
    return existing;
  }
  const hood = scene.getObjectByName('BodyHood');
  if(!hood?.parent) return null;
  const hinge = new THREE.Group();
  hinge.name = 'IVI_HoodWindshieldHinge';
  hinge.position.copy(HOOD_HINGE_POSITION);
  hood.parent.add(hinge);
  // attach() preserves the authored, textured hood's closed-pose world matrix,
  // including its interior, grill and underside children.
  hood.updateWorldMatrix(true,true);
  hinge.updateWorldMatrix(true,false);
  hinge.attach(hood);
  return hinge;
}


/**
 * Telescoping gas struts couple the inner fenders to the moving hood.
 * Both ends update from the authored hood transform, so they cannot float
 * disconnected when the lid swings open.
 */
export function installHoodStruts(scene: THREE.Object3D): void {
  const chassis=scene.getObjectByName('BodyUnderside');
  if(!chassis||chassis.getObjectByName('IVI_HoodStrut_L'))return;
  const matte=new THREE.MeshStandardMaterial({color:'#1c242b',metalness:.53,roughness:.57});
  const chrome=new THREE.MeshStandardMaterial({color:'#c5ccd4',metalness:.94,roughness:.19});
  const bolt=new THREE.MeshStandardMaterial({color:'#5e6a73',metalness:.83,roughness:.31});
  for(const [side,name] of [[-1,'L'],[1,'R']] as const){
    const strut=new THREE.Group();
    strut.name='IVI_HoodStrut_'+name;
    strut.userData.side=side;
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.022,.025,1,12),matte);
    body.name='HoodStrutCylinder';
    const rod=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,1,12),chrome);
    rod.name='HoodStrutRod';
    const base=new THREE.Mesh(new THREE.SphereGeometry(.034,12,8),bolt);
    base.name='HoodStrutBase';
    const top=new THREE.Mesh(new THREE.SphereGeometry(.029,12,8),bolt);
    top.name='HoodStrutTip';
    for(const part of [body,rod,base,top]){
      part.castShadow=true;
      strut.add(part);
    }
    chassis.add(strut);
  }
}

const STRUT_AXIS=new THREE.Vector3(0,1,0);
export function updateHoodStruts(scene: THREE.Object3D, hoodOpen: boolean): void {
  const hood=scene.getObjectByName('BodyHood');
  const chassis=scene.getObjectByName('BodyUnderside');
  if(!hood||!chassis)return;
  // Called after the damped hinge transform, before the Three.js scene render.
  hood.updateWorldMatrix(true,true);
  chassis.updateWorldMatrix(true,false);
  for(const [side,name] of [[-1,'L'],[1,'R']] as const){
    const strut=chassis.getObjectByName('IVI_HoodStrut_'+name);
    if(!strut)continue;
    strut.visible=hoodOpen;
    if(!hoodOpen)continue;
    const from=new THREE.Vector3(side*.78,-1.49,.45);
    const to=chassis.worldToLocal(hood.localToWorld(new THREE.Vector3(side*.76,.72,.30)));
    const delta=to.clone().sub(from);
    const length=delta.length();
    if(length<.05)continue;
    strut.position.copy(from);
    strut.quaternion.setFromUnitVectors(STRUT_AXIS,delta.normalize());
    const body=strut.getObjectByName('HoodStrutCylinder') as THREE.Mesh;
    const rod=strut.getObjectByName('HoodStrutRod') as THREE.Mesh;
    const tip=strut.getObjectByName('HoodStrutTip') as THREE.Mesh;
    body.position.y=length*.30;
    body.scale.y=length*.60;
    rod.position.y=length*.76;
    rod.scale.y=length*.48;
    tip.position.y=length;
  }
}
