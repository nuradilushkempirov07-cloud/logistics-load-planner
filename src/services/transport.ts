import type {CargoItem,Vehicle,Tariff,Settings,TransportRequest,ConsolidationOption,LoadingCalculation,KPI} from '../types';
import {calculateVehicleUtilization} from './packing';
const norm=(s:string)=>s.trim().toLocaleLowerCase('ru');
export const calculateSavings=(separate:number,combined:number)=>({savings:separate-combined,savingsPercent:separate>0?(separate-combined)/separate*100:0});
export function calculateTransportCost(v:Vehicle,distance:number,tariffs:Tariff[]=[],origin='',destination='',date='9999-12-31'):number {
 const matching=tariffs.filter(t=>t.vehicleId===v.id&&norm(t.origin)===norm(origin)&&norm(t.destination)===norm(destination)&&t.validFrom<=date);
 const latest=matching.filter(t=>!matching.some(o=>o.carrier===t.carrier&&o.validFrom>t.validFrom));
 return latest.length?Math.min(...latest.map(t=>Math.max(t.minimum,t.fixed+t.perKm*distance))):Math.max(v.minimum,v.tripCost+v.perKm*distance);
}
export function findOptimalVehicle(cargo:CargoItem[],vehicles:Vehicle[],tariffs:Tariff[]=[],distance=0,mode:'cost'|'size'='cost') {
 const first=cargo[0];return vehicles.map(vehicle=>({vehicle,result:calculateVehicleUtilization(cargo,vehicle),cost:calculateTransportCost(vehicle,distance,tariffs,first?.origin,first?.destination,first?.date)})).sort((a,b)=>Number(b.result.fits)-Number(a.result.fits)||(mode==='size'?a.vehicle.length*a.vehicle.width*a.vehicle.height-b.vehicle.length*b.vehicle.width*b.vehicle.height:a.cost-b.cost)||Math.abs(a.result.utilization-80)-Math.abs(b.result.utilization-80));
}
export function requestsFromCargo(cargo:CargoItem[]):TransportRequest[]{const groups=new Map<string,CargoItem[]>();for(const c of cargo){const rows=groups.get(c.requestId)??[];rows.push(c);groups.set(c.requestId,rows);}return [...groups].map(([id,items])=>({id,origin:items[0].origin,destination:items[0].destination,date:items[0].date,cargo:items}));}
export function calculateConsolidation(cargo:CargoItem[],vehicles:Vehicle[],tariffs:Tariff[],settings:Settings):ConsolidationOption[]{
 const requests=requestsFromCargo(cargo).filter(r=>r.cargo.every(c=>norm(c.origin)===norm(r.origin)&&norm(c.destination)===norm(r.destination)&&c.date===r.date)&&r.origin.trim()&&r.destination.trim()&&Number.isFinite(Date.parse(r.date)));
 const options:ConsolidationOption[]=[];const standalone=new Map(requests.map(r=>[r.id,findOptimalVehicle(r.cargo,vehicles,tariffs,settings.distance).find(x=>x.result.fits)]));
 // Rank pairs and compatible triples; options are alternatives, never summed as a schedule.
 const combos:TransportRequest[][]=[];for(let i=0;i<requests.length;i++)for(let j=i+1;j<requests.length;j++){combos.push([requests[i],requests[j]]);for(let k=j+1;k<requests.length;k++)combos.push([requests[i],requests[j],requests[k]]);}
 for(const group of combos){if(group.some(r=>!standalone.get(r.id)))continue;const first=group[0];if(group.some(r=>norm(r.origin)!==norm(first.origin)))continue;const dates=group.map(r=>Date.parse(r.date));if((Math.max(...dates)-Math.min(...dates))/86400000>settings.dateTolerance)continue;
 const destinations=[...new Set(group.map(r=>norm(r.destination)))];let deviation=0;let valid=true;
 if(destinations.length>2)continue;if(destinations.length===2){const route=settings.nearbyRoutes.find(r=>(norm(r.from)===destinations[0]&&norm(r.to)===destinations[1])||(norm(r.to)===destinations[0]&&norm(r.from)===destinations[1]));if(!route)valid=false;else deviation=route.extraKm;}
 if(!valid||deviation>settings.maxDeviation)continue;const combined=group.flatMap(r=>r.cargo);const date=new Date(Math.max(...dates)).toISOString().slice(0,10);const separate=group.reduce((s,r)=>s+standalone.get(r.id)!.cost,0);
 const choices=vehicles.map(vehicle=>{const result=calculateVehicleUtilization(combined,vehicle);const base=Math.max(...group.map(r=>calculateTransportCost(vehicle,settings.distance,tariffs,r.origin,r.destination,date)));const extraRate=Math.max(vehicle.perKm,...tariffs.filter(t=>t.vehicleId===vehicle.id&&t.validFrom<=date&&group.some(r=>norm(t.origin)===norm(r.origin)&&norm(t.destination)===norm(r.destination))).map(t=>t.perKm));return {vehicle,result,cost:base+deviation*extraRate};}).filter(x=>x.result.fits).sort((a,b)=>a.cost-b.cost||Math.abs(a.result.utilization-80)-Math.abs(b.result.utilization-80));
 const best=choices[0];if(!best||best.cost>=separate)continue;options.push({id:group.map(r=>r.id).join('+'),requests:group.map(r=>r.id),cargo:combined,...best,separate,...calculateSavings(separate,best.cost),distance:settings.distance+deviation,route:`${first.origin} → ${[...new Set(group.map(r=>r.destination))].join(' → ')}`});}
 return options.sort((a,b)=>b.savings-a.savings||a.cost-b.cost);
}
export function calculateKPI(history:LoadingCalculation[]):KPI {const flights=history.filter(h=>h.result.fits);const n=flights.length;const cost=flights.reduce((s,h)=>s+h.cost,0),baseline=flights.reduce((s,h)=>s+h.baseline,0);return {averageLoad:n?flights.reduce((s,h)=>s+h.result.utilization,0)/n:0,underloaded:n?flights.filter(h=>h.result.utilization<50).length/n*100:0,optimal:n?flights.filter(h=>h.result.utilization>=70&&h.result.utilization<=90).length/n*100:0,cost,baseline,savings:baseline-cost,weight:flights.reduce((s,h)=>s+h.result.weight,0),volume:flights.reduce((s,h)=>s+h.result.volume,0),requestsPerVehicle:n?flights.reduce((s,h)=>s+new Set(h.cargo.map(c=>c.requestId)).size,0)/n:0};}
