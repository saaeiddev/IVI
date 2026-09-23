import {describe,it,expect} from 'vitest';
import {computeTelemetry,initial,simulateStep} from './simulation';
import {diagnose,severityOf} from './diagnostics';
describe('deterministic vehicle simulation',()=>{
 it('starts with zero RPM and zero speed',()=>{const t=computeTelemetry(initial);expect(t.rpm).toBe(0);expect(t.speed).toBe(0);});
 it('throttle advances speed, RPM and odometer together',()=>{const s={...initial,engineOn:true,throttle:.65};const next=Array.from({length:100}).reduce<typeof s>(p=>simulateStep(p,.1),s);const t=computeTelemetry(next);expect(t.speed).toBeGreaterThan(0);expect(t.rpm).toBeGreaterThan(820);expect(t.odometer).toBeGreaterThan(initial.distance);});
 it('braking slows a moving car and heats brake discs',()=>{const s={...initial,engineOn:true,speed:110,brake:1};const next=Array.from({length:20}).reduce<typeof s>(p=>simulateStep(p,.1),s);expect(next.speed).toBeLessThan(110);expect(next.brakeTemp).toBeGreaterThan(s.brakeTemp);});
 it('detects low tire pressure only when below threshold',()=>{expect(diagnose({...initial,tirePressure:[1.5,2.4,2.4,2.4]}).some(x=>x.id==='tire')).toBe(true);expect(diagnose(initial)[0].id).toBe('clear');});
 it('scenario warnings and actual readings agree',()=>{const s={...initial,scenario:'cooling' as const,coolantTemp:116};const t=computeTelemetry(s);expect(t.fanOn).toBe(false);expect(severityOf(diagnose(s,t))).toBe('critical');});
 it('weak battery never reports charging',()=>{const t=computeTelemetry({...initial,scenario:'weakBattery',engineOn:true});expect(t.batteryHealth).toBeLessThan(50);expect(t.charging).toBe(false);});
});
