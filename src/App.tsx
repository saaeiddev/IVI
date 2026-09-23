import {useCallback,useEffect,useMemo,useState} from 'react';
import {
 Activity, AlertTriangle, ArrowLeftRight, BatteryCharging, CarFront, CheckCircle2, ChevronRight,
 CircleDot, Disc3, ExternalLink, Gauge, Globe2, Lightbulb, Menu, Power, Radar,
 RotateCcw, ScanLine, Settings2, ShieldCheck, SlidersHorizontal, Thermometer, Wrench, X, Zap
} from 'lucide-react';
import VehicleScene from './VehicleScene';
import {diagnose,severityOf, type Severity} from './diagnostics';
import {computeTelemetry,useSim,type Door,type Light,type Panel,type Scenario,type View} from './simulation';
import {translate} from './translations';

const sections:Panel[]=['overview','engine','brakes','tires','battery','diagnostics','settings'];
const scenarioChoices:Scenario[]=['normal','overheat','wornBrakes','lowTire','weakBattery','sensor','cooling'];
const wheelNames=['frontLeft','frontRight','rearLeft','rearRight'];
const fmt=(value:number,digits=0)=>value.toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits});
function SectionIcon({id,size=19}:{id:Panel;size?:number}){
 const common={size,strokeWidth:1.8};
 switch(id){
  case 'engine':return <Gauge {...common}/>;
  case 'brakes':return <Disc3 {...common}/>;
  case 'tires':return <CircleDot {...common}/>;
  case 'battery':return <BatteryCharging {...common}/>;
  case 'diagnostics':return <ScanLine {...common}/>;
  case 'settings':return <Settings2 {...common}/>;
  case 'cooling':return <Thermometer {...common}/>;
  case 'doors':return <CarFront {...common}/>;
  case 'lighting':return <Lightbulb {...common}/>;
  case 'suspension':return <SlidersHorizontal {...common}/>;
  default:return <CarFront {...common}/>;
 }
}
function StatusTag({severity,children}:{severity:Severity;children:React.ReactNode}){
 return <span className={`status-tag ${severity}`}>{severity==='ok'?<CheckCircle2 size={13}/>:<AlertTriangle size={13}/>} {children}</span>;
}
function Stat({label,value,unit,flag}:{label:string;value:string|number;unit?:string;flag?:Severity}){
 return <div className="stat"><div className="stat-label">{label}</div><div className={`stat-value ${flag&&flag!=='ok'?flag:''}`}>{value}<small>{unit}</small></div></div>;
}
function Meter({label,value,max=100,danger=false,unit='%',onChange,min=0,step=1}:{label:string;value:number;max?:number;danger?:boolean;unit?:string;onChange?:(n:number)=>void;min?:number;step?:number}){
 return <div className="meter"><div className="meter-heading"><span>{label}</span><strong className={danger?'danger-text':''}>{fmt(value,step<1?1:0)} {unit}</strong></div>
  {onChange?<input aria-label={label} className="range" type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/>:<div className="meter-track"><div style={{width:`${Math.min(100,Math.max(0,(value-min)/(max-min)*100))}%`}} className={danger?'danger-fill':'meter-fill'}/></div>}
 </div>;
}
function Dial({value,max,label,unit,accent='#61e9ec',fault=false}:{value:number;max:number;label:string;unit:string;accent?:string;fault?:boolean}){
 const bounded=Math.min(value/max,1);
 return <div className="dial">
  <svg viewBox="0 0 208 136" role="img" aria-label={`${label} ${fault?'sensor fault':fmt(value)} ${unit}`}>
   <path d="M 22 117 A 83 83 0 1 1 186 117" fill="none" stroke="#2d3c52" strokeWidth="9" strokeLinecap="round"/>
   <path d="M 22 117 A 83 83 0 1 1 186 117" fill="none" stroke={fault?'#ff9f64':accent} strokeWidth="9" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.max(.2,bounded*100)} 100`} className="dial-progress"/>
   <path d="M 22 117 A 83 83 0 1 1 186 117" fill="none" stroke="#ffffff" strokeOpacity=".06" strokeWidth="19" strokeDasharray="1 5" pathLength="100"/>
  </svg>
  <div className="dial-number">{fault?'—':fmt(value)}<small>{unit}</small></div>
  <span className="dial-label">{label}</span>
 </div>;
}
function Toggle({label,on,change,icon}:{label:string;on:boolean;change:()=>void;icon?:React.ReactNode}){
 return <button type="button" aria-pressed={on} className={`toggle-action ${on?'selected':''}`} onClick={change}>{icon}<span>{label}</span><span className={`mini-switch ${on?'enabled':''}`}/></button>;
}
function Inspector(){
 const s=useSim();
 const t=(key:string)=>translate(s.language,key);
 const telemetry=computeTelemetry(s);
 const findings=diagnose(s,telemetry);
 const severity=severityOf(findings);
 const [draft,setDraft]=useState<Scenario>(s.scenario);
 useEffect(()=>setDraft(s.scenario),[s.scenario]);
 const selectedWheel=wheelNames[s.wheel];
 const coolingError=s.scenario==='cooling'||telemetry.coolantTemp>=110;
 const brakeError=telemetry.padWear>=80;
 const content=()=>{
  switch(s.panel){
   case 'engine':return <>
    <p className="inspector-description">{t('engineDesc')}</p>
    <div className="stat-grid"><Stat label={t('rpm')} value={telemetry.sensorFault?'—':fmt(telemetry.rpm)} unit="RPM" flag={telemetry.sensorFault?'warning':'ok'}/>
     <Stat label={t('engineTemp')} value={fmt(telemetry.engineTemp)} unit="°C" flag={coolingError?'critical':'ok'}/>
     <Stat label={t('oilPressure')} value={fmt(telemetry.oilPressure,1)} unit="bar"/><Stat label={t('coolantTemp')} value={fmt(telemetry.coolantTemp)} unit="°C"/></div>
    <div className="section-subtitle">{t('visualization')}</div><div className="capability"><CheckCircle2 size={16}/>{t('engineMesh')}</div>
    <div className="notice"><AlertTriangle size={17}/><span>{t('explodedUnavailable')}</span></div>
    <button className="outline-button full" onClick={()=>s.toggleDoor('hood')}>{s.doors.hood?t('close'):t('open')} {t('hood')}</button>
    <button className="outline-button full" onClick={()=>s.setView('engine')}>{t('engineView')} <ChevronRight size={16}/></button>
   </>;
   case 'brakes':return <>
    <p className="inspector-description">{t('brakesDesc')}</p><div className="wheel-picker">{wheelNames.map((w,i)=><button aria-pressed={s.wheel===i} className={s.wheel===i?'active':''} key={w} onClick={()=>s.setWheel(i)}>{t(w)}</button>)}</div>
    <div className="stat-grid"><Stat label={t('brakeTemp')} value={fmt(telemetry.brakeTemp)} unit="°C"/><Stat label={t('brakeForce')} value={fmt(telemetry.brakeForce)} unit="%"/>
    <Stat label={t('padWear')} value={fmt(telemetry.padWear)} unit="%" flag={brakeError?'critical':'ok'}/><Stat label={t('brakeStatus')} value={brakeError?t('warning'):t('nominal')}/></div>
    <Meter label={t('brakeWearControl')} value={s.padWear} max={100} danger={brakeError} onChange={s.setPadWear}/><div className="capability"><CheckCircle2 size={16}/>{t('brakeMesh')}</div>
    <div className="notice"><Activity size={17}/><span>{t('unitDemo')}</span></div>
   </>;
   case 'tires':return <>
    <p className="inspector-description">{t('tiresDesc')}</p><div className="wheel-picker">{wheelNames.map((w,i)=><button key={w} aria-pressed={s.wheel===i} className={s.wheel===i?'active':''} onClick={()=>{s.setWheel(i);s.setPanel('tires')}}>{t(w)}</button>)}</div>
    <Stat label={t(selectedWheel)} value={fmt(s.tirePressure[s.wheel],2)} unit="bar" flag={s.tirePressure[s.wheel]<1.9?'warning':'ok'}/>
    <Meter label={t('pressureControl')} min={1} max={3.2} step={.05} unit="bar" value={s.tirePressure[s.wheel]} onChange={n=>s.setTirePressure(s.wheel,n)} danger={s.tirePressure[s.wheel]<1.9}/>
    <div className="section-subtitle">{t('tirePressure')}</div>
    <div className="tyre-table">{wheelNames.map((name,i)=><button key={name} className={`tire-item ${s.wheel===i?'chosen':''}`} onClick={()=>{s.setWheel(i);s.setPanel('tires')}}><span>{t(name)}</span><strong className={s.tirePressure[i]<1.9?'danger-text':''}>{fmt(s.tirePressure[i],2)} bar</strong></button>)}</div>
    <Stat label={t('tireTemp')} value={fmt(telemetry.tireTemp[s.wheel])} unit="°C"/>
   </>;
   case 'battery':return <>
    <p className="inspector-description">{t('batteryDesc')}</p><div className="stat-grid"><Stat label={t('batteryVoltage')} value={fmt(telemetry.batteryVoltage,1)} unit="V" flag={telemetry.batteryVoltage<12?'warning':'ok'}/><Stat label={t('health')} value={fmt(telemetry.batteryHealth)} unit="%"/><Stat label={t('charging')} value={t(telemetry.charging?'on':'off')}/></div><Meter label={t('health')} value={telemetry.batteryHealth} danger={telemetry.batteryHealth<50}/>
   </>;
   case 'cooling':return <><p className="inspector-description">{t('coolingDesc')}</p><div className="stat-grid"><Stat label={t('coolantTemp')} value={fmt(telemetry.coolantTemp)} unit="°C" flag={coolingError?'critical':'ok'}/><Stat label={t('fan')} value={t(telemetry.fanOn?'fanOn':'fanOff')}/></div><Meter label={t('coolantTemp')} max={150} value={telemetry.coolantTemp} danger={coolingError}/><button className="outline-button full" onClick={()=>s.setScenario('cooling')}>{t('coolingFault')}</button></>;
   case 'doors':return <><p className="inspector-description">{t('doorMesh')}</p><div className="section-subtitle">{t('bodyControls')}</div><div className="toggle-grid">{(['left','right','hood','hatch'] as Door[]).map(d=><Toggle key={d} label={t(d==='left'?'leftDoor':d==='right'?'rightDoor':d)} on={s.doors[d]} change={()=>s.toggleDoor(d)} icon={<CarFront size={16}/>}/>)}</div><div className="capability"><CheckCircle2 size={16}/>{t('doorMesh')}</div></>;
   case 'lighting':return <><div className="section-subtitle">{t('lightControls')}</div><div className="toggle-grid">{(['headlights','hazards','leftSignal','rightSignal'] as Light[]).map(l=><Toggle key={l} label={t(l)} on={s.lights[l]} change={()=>s.toggleLight(l)} icon={<Lightbulb size={16}/>}/>)}</div></>;
   case 'suspension':return <><p className="inspector-description">{t('suspensionDesc')}</p><div className="notice"><AlertTriangle size={16}/>{t('unsupported')}</div><Meter label={t('steering')} value={s.steering*100} min={-100} max={100} onChange={x=>s.setSteering(x/100)}/></>;
   case 'diagnostics':return <>
    <p className="inspector-description">{t('diagnosticDisclaimer')}</p><label className="field-label" htmlFor="scenario-select">{t('chooseScenario')}</label>
    <select id="scenario-select" className="select-input" value={draft} onChange={e=>setDraft(e.target.value as Scenario)}>{scenarioChoices.map(name=><option value={name} key={name}>{t(name==='cooling'?'coolingFault':name)}</option>)}</select>
    <div className="two-buttons"><button className="outline-button" onClick={()=>s.setScenario(draft)}>{t('applyScenario')}</button><button className="button-main" onClick={()=>{s.setScenario(draft);s.scan()}}><ScanLine size={16}/>{t(s.scanCount?'scanAgain':'runScan')}</button></div>
    {s.scanCount>0?<><div className="scan-banner"><Radar size={18}/>{t('scanComplete')}<StatusTag severity={severity}>{t(severity)}</StatusTag></div>
    <div className="findings">{findings.map(f=><article className={`finding ${f.severity}`} key={f.id}><div className="finding-top"><StatusTag severity={f.severity}>{t(f.title)}</StatusTag><code>{f.code}</code></div><p>{t(f.description)}</p><div className="recommendation"><strong>{t('suggestion')}</strong><span>{t(f.action)}</span></div>
    <button className="link-button" onClick={()=>s.setPanel(f.component as Panel)}>{t('selectToExplore')}<ChevronRight size={15}/></button></article>)}</div></>:<div className="empty-scan"><ScanLine size={28}/><p>{t('noScan')}</p></div>}
    </>;
   case 'settings':return <><div className="section-subtitle">{t('graphics')}</div><div className="segmented">{(['auto','high','balanced'] as const).map(q=><button aria-pressed={s.graphics===q} className={s.graphics===q?'active':''} key={q} onClick={()=>s.setGraphics(q)}>{t(q)}</button>)}</div><Toggle label={t('hotspots')} on={s.showHotspots} change={()=>s.setShowHotspots(!s.showHotspots)}/><div className="section-subtitle">{t('language')}</div><div className="segmented"><button className={s.language==='en'?'active':''} onClick={()=>s.setLanguage('en')}>English</button><button className={s.language==='fa'?'active':''} onClick={()=>s.setLanguage('fa')}>فارسی</button></div>
    <div className="notice">{t('resetHint')}</div><button className="outline-button full" onClick={s.reset}><RotateCcw size={16}/>{t('reset')}</button><div className="section-subtitle">{t('credits')}</div><p className="legal-text">{t('license')}</p><a className="credit-link" href="https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept" target="_blank" rel="noopener noreferrer">Khronos glTF Sample Assets <ExternalLink size={13}/></a></>;
   default:return <><p className="inspector-description">{t('modelSub')}</p><div className="stat-grid"><Stat label={t('speed')} value={fmt(telemetry.speed)} unit="km/h"/><Stat label={t('range')} value={fmt(telemetry.range)} unit="km"/><Stat label={t('fuel')} value={fmt(telemetry.fuel)} unit="%"/><Stat label={t('batteryVoltage')} value={fmt(telemetry.batteryVoltage,1)} unit="V"/></div>
    <div className="section-subtitle">{t('panelDetails')}</div>
    {(['engine','brakes','tires','cooling','lighting','doors'] as Panel[]).map(panel=><button key={panel} className="inspector-link" onClick={()=>s.setPanel(panel)}><SectionIcon id={panel} size={17}/><span>{t(panel)}</span><ChevronRight size={15}/></button>)}</>;
  }
 };
 return <aside className="inspector"><div className="inspector-header"><div><div className="eyebrow">{t('detail')}</div><h2><SectionIcon id={s.panel} size={22}/>{t(s.panel)}</h2></div><span className="tiny-indicator"/></div>
 <div className="inspector-content">{content()}</div><div className="inspector-footer"><ShieldCheck size={15}/>{t('panelNote')}</div></aside>;
}
function SimulationControls(){
 const s=useSim();
 const t=(x:string)=>translate(s.language,x);
 const [expanded,setExpanded]=useState(false);
 return <section className="controls-section"><div className="section-row"><div className="eyebrow"><SlidersHorizontal size={15}/>{t('simControls')}</div><button className="text-button" type="button" onClick={()=>setExpanded(v=>!v)}><span>{expanded?t('close'):t('explore')}</span><ChevronRight className={expanded?'rotate-down':''} size={15}/></button></div>
 <div className="drive-controls">
  <button className={`engine-power ${s.engineOn?'running':''}`} onClick={()=>s.setEngine(!s.engineOn)}><Power size={21}/><span>{t(s.engineOn?'engineStop':'engineStart')}</span></button>
  <div className="pedal-control"><Meter label={t('throttle')} value={Math.round(s.throttle*100)} onChange={n=>s.setThrottle(n/100)}/></div>
  <div className="pedal-control"><Meter label={t('brakePedal')} value={Math.round(s.brake*100)} onChange={n=>s.setBrake(n/100)}/></div>
  <div className="pedal-control"><Meter label={t('steering')} value={Math.round(s.steering*100)} min={-100} max={100} onChange={n=>s.setSteering(n/100)}/></div>
 </div>
 <div className="control-bottom"><span className="field-label">{t('mode')}</span><div className="segmented drive-modes">{(['comfort','sport','eco'] as const).map(m=><button className={s.mode===m?'active':''} onClick={()=>s.setMode(m)} key={m}>{t(m)}</button>)}</div></div>
 {expanded&&<div className="expanded-controls"><div className="section-subtitle">{t('bodyControls')}</div><div className="toggle-grid">{(['left','right','hood','hatch'] as Door[]).map(d=><Toggle key={d} label={t(d==='left'?'leftDoor':d==='right'?'rightDoor':d)} on={s.doors[d]} change={()=>s.toggleDoor(d)}/>)}</div><div className="section-subtitle">{t('lightControls')}</div><div className="toggle-grid">{(['headlights','hazards','leftSignal','rightSignal'] as Light[]).map(l=><Toggle key={l} label={t(l)} on={s.lights[l]} change={()=>s.toggleLight(l)}/>)}</div></div>}
 </section>;
}
function Dashboard(){
 const s=useSim();
 const t=(x:string)=>translate(s.language,x);
 const data=computeTelemetry(s);
 const findings=diagnose(s,data);
 const severity=severityOf(findings);
 return <section className="dashboard"><div className="dashboard-heading"><div className="eyebrow"><Activity size={15}/>{t('live')}</div><StatusTag severity={severity}>{t(severity)}</StatusTag></div>
 <div className="dials"><Dial value={data.speed} max={245} label={t('speed')} unit="km/h"/><Dial value={data.rpm} max={7300} label={t('rpm')} unit="RPM" accent="#9cacf9" fault={data.sensorFault}/></div>
 <div className="data-tiles">
  <div className="data-tile"><Thermometer size={18}/><div><span>{t('coolantTemp')}</span><strong className={data.coolantTemp>=110?'critical-text':''}>{fmt(data.coolantTemp)}°C</strong></div></div>
  <div className="data-tile"><Zap size={18}/><div><span>{t('batteryVoltage')}</span><strong className={data.batteryVoltage<12?'danger-text':''}>{fmt(data.batteryVoltage,1)} V</strong></div></div>
  <div className="data-tile"><CircleDot size={18}/><div><span>{t('tirePressure')}</span><strong>{fmt(Math.min(...data.tirePressure),2)} bar</strong></div></div>
  <div className="data-tile"><Disc3 size={18}/><div><span>{t('padWear')}</span><strong className={data.padWear>=80?'danger-text':''}>{fmt(data.padWear)}%</strong></div></div>
 </div>
 <div className="distance-row"><span>{t('odometer')} <strong>{fmt(data.odometer,1)} km</strong></span><span>{t('range')} <strong>{data.range} km</strong></span><span>{t('fuel')} <strong>{fmt(data.fuel)}%</strong></span></div>
 </section>;
}
export default function App(){
 const s=useSim(),t=(x:string)=>translate(s.language,x);
 const [resetNonce,setResetNonce]=useState(0),[menuOpen,setMenuOpen]=useState(false),[modelReady,setModelReady]=useState(false);
 const info=computeTelemetry(s);
 const findings=useMemo(()=>diagnose(s,info),[s,info.rpm,info.coolantTemp,info.padWear,info.batteryVoltage]);
 const severity=severityOf(findings);
 useEffect(()=>{
  let last=performance.now();
  const id=window.setInterval(()=>{const now=performance.now(),dt=(now-last)/1000;last=now;if(document.visibilityState==='visible')useSim.getState().tick(dt)},65);
  return()=>window.clearInterval(id);
 },[]);
 useEffect(()=>{document.documentElement.lang=s.language;document.documentElement.dir=s.language==='fa'?'rtl':'ltr'},[s.language]);
 const setPanel=(p:Panel)=>{s.setPanel(p);setMenuOpen(false)};
 const selectView=(v:View)=>{s.setView(v);setResetNonce(n=>n+1)};
 const resetCamera=()=>{s.setView('exterior');setResetNonce(n=>n+1)};
 return <div className="app-shell" dir={s.language==='fa'?'rtl':'ltr'}>
  <aside className={`sidebar ${menuOpen?'open':''}`}>
   <div className="brand"><span className="brand-symbol"><CarFront size={23}/></span><div><strong>IVI<span className="brand-dot">.</span></strong><span>{t('appTag')}</span></div><button className="mobile-close icon-button" aria-label="Close menu" onClick={()=>setMenuOpen(false)}><X size={19}/></button></div>
   <div className="sidebar-group-label">DIGITAL TWIN / 01</div>
   <nav aria-label="Main navigation" className="nav-list">{sections.map(item=><button key={item} className={`nav-item ${s.panel===item?'active':''}`} onClick={()=>setPanel(item)}><SectionIcon id={item}/><span>{t(item)}</span>{item==='diagnostics'&&severity!=='ok'&&<span className="nav-alert"/>}{s.panel===item&&<ChevronRight size={15} className="nav-chevron"/>}</button>)}</nav>
   <div className="sidebar-spacer"/>
   <div className="side-status"><div className="pulse-dot"/><div><b>{t('live')}</b><span>{t('unitDemo')}</span></div></div>
   <div className="side-footer"><span>IVI SYSTEM v1.0</span><span>AMIR SAEID DEHGHAN</span></div>
  </aside>
  {menuOpen&&<button className="sidebar-backdrop" aria-label="Close navigation" onClick={()=>setMenuOpen(false)}/>}
  <main className="main-area">
   <header className="topbar"><div className="header-left"><button className="hamburger icon-button" aria-label="Open navigation" onClick={()=>setMenuOpen(true)}><Menu size={21}/></button><div className="breadcrumbs"><span>{t('digitalTwin')}</span><ChevronRight size={14}/><strong>{t(s.panel)}</strong></div></div>
    <div className="header-right"><span className="header-sim-label"><span className="pulse-dot"/>{t('simulated')}</span><button className="lang-switch" onClick={()=>s.setLanguage(s.language==='en'?'fa':'en')} aria-label="Switch language"><Globe2 size={16}/>{s.language==='en'?'FA':'EN'}</button></div></header>
   <div className="content">
    <section className="hero-heading"><div><div className="eyebrow hero-eyebrow"><span className="tiny-indicator"/>{t('digitalTwin')} <span className="hero-id">/ 001</span></div><h1>{t('modelName')}</h1><p>{t('modelSub')}</p></div><div className="hero-status"><StatusTag severity={severity}>{t(severity)}</StatusTag><span>{s.engineOn?t('live'):t('offline')}</span></div></section>
    <div className="workspace">
     <div className="left-workspace">
      <section className="viewer-card"><div className="viewer-top"><div className="view-meta"><span className="live-pip"/><strong>{t('explore')}</strong><small>GLTF / PBR / 3D</small></div><div className="viewer-actions"><button type="button" title={t('hotspots')} className={`icon-button ${s.showHotspots?'is-on':''}`} onClick={()=>s.setShowHotspots(!s.showHotspots)}><Radar size={17}/></button><button type="button" title={t('resetCamera')} className="icon-button" onClick={resetCamera}><RotateCcw size={17}/></button></div></div>
       <VehicleScene onReady={useCallback(()=>setModelReady(true),[])} onSelect={setPanel} resetNonce={resetNonce}/>
       <div className="viewer-bottom"><div className="orbit-hint"><ArrowLeftRight size={15}/>{t('orbit')}<span className="hint-divider"/> {t('zoom')}</div><div className="model-status"><span className="model-status-dot"/>{modelReady?'3D READY':'3D LOADING'}</div></div>
      </section>
      <div className="camera-tabs"><div className="eyebrow">{t('view')}</div><div className="view-buttons">{(['exterior','interior','engine','brakes'] as View[]).map(v=><button aria-pressed={s.view===v} key={v} onClick={()=>selectView(v)} className={s.view===v?'active':''}><span>{t(v==='engine'?'engineView':v==='brakes'?'brakesView':v)}</span></button>)}</div></div>
      <SimulationControls/>
     </div>
     <Inspector/>
    </div>
    <Dashboard/>
    <footer className="page-footer"><span>{t('simulated')}</span><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CAR CONCEPT · CC BY 4.0 <ExternalLink size={12}/></a></footer>
   </div>
  </main>
 </div>;
}
