import { create } from 'zustand';

export type Scenario = 'normal' | 'overheat' | 'wornBrakes' | 'lowTire' | 'weakBattery' | 'sensor' | 'cooling';
export type Panel = 'overview' | 'engine' | 'brakes' | 'tires' | 'battery' | 'diagnostics' | 'settings' | 'cooling' | 'doors' | 'suspension' | 'lighting';
export type View = 'exterior' | 'interior' | 'engine' | 'brakes';
export type DriveMode = 'comfort' | 'sport' | 'eco';
export type Door = 'left' | 'right' | 'hood' | 'hatch';
export type Light = 'headlights' | 'hazards' | 'leftSignal' | 'rightSignal';
export type Language = 'en' | 'fa';

export interface SimState {
  language: Language; panel: Panel; view: View; wheel: number;
  scenario: Scenario; engineOn: boolean; throttle: number; brake: number; steering: number;
  mode: DriveMode; speed: number; distance: number; fuel: number;
  coolantTemp: number; brakeTemp: number; padWear: number;
  tirePressure: [number,number,number,number]; wheelAngle: number;
  doors: Record<Door,boolean>; lights: Record<Light,boolean>;
  scanCount: number; showHotspots: boolean; graphics: 'auto'|'high'|'balanced';
}

export const initial:SimState={
  language:'en',panel:'overview',view:'exterior',wheel:0,scenario:'normal',engineOn:false,
  throttle:0,brake:0,steering:0,mode:'comfort',speed:0,distance:12843.6,fuel:74,
  coolantTemp:37,brakeTemp:35,padWear:24,tirePressure:[2.4,2.4,2.4,2.4],wheelAngle:0,
  doors:{left:false,right:false,hood:false,hatch:false},
  lights:{headlights:false,hazards:false,leftSignal:false,rightSignal:false},
  scanCount:0,showHotspots:true,graphics:'auto'
};

export interface Telemetry {
  speed:number; rpm:number; oilPressure:number; coolantTemp:number; engineTemp:number;
  brakeTemp:number; brakeForce:number; padWear:number; tirePressure:SimState['tirePressure'];
  tireTemp:number[]; batteryVoltage:number; batteryHealth:number; fanOn:boolean;
  fuel:number; range:number; odometer:number; wheelAngle:number; charging:boolean; sensorFault:boolean;
}
export const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
export function computeTelemetry(s:SimState):Telemetry {
  const rpm=s.engineOn?clamp(820+s.throttle*(s.mode==='sport'?6400:s.mode==='eco'?4300:5300)+s.speed*10,820,7300):0;
  const coolant=s.coolantTemp;
  return {
    speed:s.speed,rpm,oilPressure:s.engineOn?clamp(1.1+rpm/2400,1.1,4.8):0,
    coolantTemp:coolant,engineTemp:coolant+(s.engineOn?10:3),
    brakeTemp:s.brakeTemp,brakeForce:s.brake*100,padWear:s.padWear,
    tirePressure:s.tirePressure,
    tireTemp:s.tirePressure.map((pressure)=>Math.round(24+s.speed*.09+(pressure<1.9?9:0))),
    batteryVoltage:s.scenario==='weakBattery'?(s.engineOn?12.1:11.5):(s.engineOn?14.2:12.6),
    batteryHealth:s.scenario==='weakBattery'?37:94,
    fanOn:s.engineOn&&coolant>=94&&s.scenario!=='cooling',
    fuel:s.fuel,range:Math.round(s.fuel/100*(s.mode==='eco'?660:s.mode==='sport'?440:555)),
    odometer:s.distance,wheelAngle:s.wheelAngle,charging:s.engineOn&&s.scenario!=='weakBattery',
    sensorFault:s.scenario==='sensor'
  };
}
export function simulateStep(s:SimState,seconds:number):SimState {
  const dt=clamp(seconds,0,.2);
  if(!dt) return s;
  const acceleration=s.engineOn?s.throttle*(s.mode==='sport'?37:s.mode==='eco'?21:28):0;
  const braking=s.brake*60;
  const speed=clamp(s.speed+(acceleration-braking-2.3-s.speed*.075)*dt,0,245);
  const t=computeTelemetry({...s,speed});
  const target=s.engineOn?(s.scenario==='overheat'?130:s.scenario==='cooling'?124:86+t.rpm/950):24;
  const coolantTemp=clamp(s.coolantTemp+(target-s.coolantTemp)*dt*(s.scenario==='overheat'||s.scenario==='cooling'?.23:.085),20,150);
  const brakeTemp=clamp(s.brakeTemp+(s.brake*speed*.31-(s.brakeTemp-32)*.075)*dt,25,650);
  return {...s,speed,coolantTemp,brakeTemp,
    distance:s.distance+speed*dt/3600,
    fuel:clamp(s.fuel-(s.engineOn?(0.00025+t.rpm/4_000_000)*dt:0),0,100),
    wheelAngle:(s.wheelAngle+speed/3.6/.34*dt)%(Math.PI*2)};
}
export interface SimActions {
  setLanguage:(x:Language)=>void; setPanel:(x:Panel)=>void; setView:(x:View)=>void;
  setWheel:(x:number)=>void; setScenario:(x:Scenario)=>void; setThrottle:(x:number)=>void;
  setBrake:(x:number)=>void; setSteering:(x:number)=>void; setMode:(x:DriveMode)=>void;
  setEngine:(x:boolean)=>void; toggleDoor:(x:Door)=>void; toggleLight:(x:Light)=>void;
  setPadWear:(x:number)=>void; setTirePressure:(wheel:number,value:number)=>void;
  scan:()=>void; tick:(seconds:number)=>void; reset:()=>void;
  setShowHotspots:(x:boolean)=>void; setGraphics:(x:SimState['graphics'])=>void;
}
export type SimStore=SimState & SimActions;
export const useSim=create<SimStore>()((set,get)=>({
  ...initial,
  setLanguage:language=>set({language}),
  setPanel:panel=>set({panel,view:panel==='engine'?'engine':panel==='brakes'?'brakes':get().view}),
  setView:view=>set({view}),
  setWheel:wheel=>set({wheel:clamp(Math.round(wheel),0,3),panel:'brakes',view:'brakes'}),
  setScenario:scenario=>set(s=>({...s,scenario,
    coolantTemp:scenario==='overheat'||scenario==='cooling'?105:scenario==='normal'?Math.min(s.coolantTemp,90):s.coolantTemp,
    padWear:scenario==='wornBrakes'?92:24,
    tirePressure:scenario==='lowTire'?[1.5,2.4,2.4,2.4]:[2.4,2.4,2.4,2.4],
    scanCount:0})),
  setThrottle:throttle=>set({throttle:clamp(throttle,0,1)}),
  setBrake:brake=>set({brake:clamp(brake,0,1)}),
  setSteering:steering=>set({steering:clamp(steering,-1,1)}),
  setMode:mode=>set({mode}),
  setEngine:engineOn=>set({engineOn,throttle:engineOn?get().throttle:0}),
  toggleDoor:name=>set(s=>({doors:{...s.doors,[name]:!s.doors[name]}})),
  toggleLight:name=>set(s=>({lights:{...s.lights,[name]:!s.lights[name]}})),
  setPadWear:padWear=>set({padWear:clamp(padWear,0,100)}),
  setTirePressure:(wheel,value)=>set(s=>({tirePressure:s.tirePressure.map((p,i)=>i===wheel?clamp(value,1,3.2):p) as SimState['tirePressure']})),
  scan:()=>set(s=>({scanCount:s.scanCount+1,panel:'diagnostics'})),
  tick:seconds=>set(s=>simulateStep(s,seconds)),
  reset:()=>set(s=>({...initial,language:s.language,graphics:s.graphics,showHotspots:s.showHotspots})),
  setShowHotspots:showHotspots=>set({showHotspots}),
  setGraphics:graphics=>set({graphics})
}));
