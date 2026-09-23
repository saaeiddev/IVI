import { computeTelemetry, type SimState, type Telemetry } from './simulation';
export type Severity='critical'|'warning'|'ok';
export interface Finding {id:string; code:string;severity:Severity; title:string;description:string;action:string;component:string}
export function diagnose(state:SimState,telemetry:Telemetry=computeTelemetry(state)):Finding[] {
 const findings:Finding[]=[];
 if(telemetry.coolantTemp>=110||state.scenario==='overheat') findings.push({id:'overheat',code:'SIM-P0217',severity:'critical',title:'diagOverheat',description:'diagOverheatDesc',action:'diagOverheatAction',component:'engine'});
 if(state.scenario==='cooling') findings.push({id:'cooling',code:'SIM-P0480',severity:'critical',title:'diagCooling',description:'diagCoolingDesc',action:'diagCoolingAction',component:'cooling'});
 if(telemetry.padWear>=80) findings.push({id:'brakes',code:'SIM-MAINT-01',severity:telemetry.padWear>=90?'critical':'warning',title:'diagBrakes',description:'diagBrakesDesc',action:'diagBrakesAction',component:'brakes'});
 if(telemetry.tirePressure.some(x=>x<1.9)) findings.push({id:'tire',code:'SIM-TPMS-01',severity:'warning',title:'diagTire',description:'diagTireDesc',action:'diagTireAction',component:'tires'});
 if(telemetry.batteryVoltage<12||telemetry.batteryHealth<50) findings.push({id:'battery',code:'SIM-P0562',severity:'warning',title:'diagBattery',description:'diagBatteryDesc',action:'diagBatteryAction',component:'battery'});
 if(telemetry.sensorFault) findings.push({id:'sensor',code:'SIM-P0101',severity:'warning',title:'diagSensor',description:'diagSensorDesc',action:'diagSensorAction',component:'engine'});
 return findings.length?findings:[{id:'clear',code:'SIM-OK',severity:'ok',title:'diagClear',description:'diagClearDesc',action:'diagClearAction',component:'overview'}];
}
export function severityOf(findings:Finding[]):Severity {
 return findings.some(f=>f.severity==='critical')?'critical':findings.some(f=>f.severity==='warning')?'warning':'ok';
}
