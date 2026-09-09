import type {AppData,CargoItem,Vehicle,LoadingCalculation} from '../types';
import {calculateVehicleUtilization} from '../services/packing';
import {findOptimalVehicle} from '../services/transport';
import {today} from '../utils/format';
export const vehicles:Vehicle[]=[
 {id:'v1',name:'Газель 1,5 т',description:'ГАЗ Next · тент',length:4.2,width:2,height:2.2,capacity:1500,maxFloorLoad:500,tripCost:75000,perKm:80,minimum:95000},
 {id:'v2',name:'5 тонн',description:'Isuzu Forward · фургон',length:6,width:2.4,height:2.4,capacity:5000,maxFloorLoad:1400,tripCost:105000,perKm:100,minimum:120000},
 {id:'v3',name:'10 тонн',description:'MAN TGM · тент',length:8,width:2.45,height:2.5,capacity:10000,maxFloorLoad:1800,tripCost:155000,perKm:130,minimum:180000},
 {id:'v4',name:'20 т / Еврофура',description:'Volvo FH · полуприцеп',length:13.6,width:2.45,height:2.7,capacity:20000,maxFloorLoad:2500,tripCost:200000,perKm:150,minimum:240000},
 {id:'v5',name:'Еврофура High Cube',description:'DAF XF · увеличенная высота',length:13.6,width:2.45,height:3,capacity:20000,maxFloorLoad:2500,tripCost:225000,perKm:160,minimum:270000}
];
const names=['Кабель','Паллеты с комплектующими','Телекоммуникационное оборудование','Металлические шкафы','Аккумуляторы','Коробки с крепежом','Мешки с материалом','Кабельные катушки','Строительные материалы','Серверные стойки','Электродвигатели','Пластиковые трубы','Инструменты','Изоляторы','Распределительные щиты','Арматура в упаковке','Упаковочные материалы','Светильники'];
export function blankCargo():CargoItem{return {id:crypto.randomUUID(),name:'',requestId:'',customer:'',origin:'Алматы',destination:'Астана',date:today(),quantity:1,length:1.2,width:0.8,height:1,weight:250,stackable:true,maxLayers:2,rotatable:true,tiltable:false,fragile:false,upright:true,notes:'Не кантовать'};}
export function createSeed():AppData {const cargo:CargoItem[]=names.map((name,i)=>({...blankCargo(),id:`c${i+1}`,name,requestId:String(101+(i%10)),customer:['Сеть связи','Склад снабжения','Строительный отдел'][i%3],origin:i%10>=8?'Астана':'Алматы',destination:i%10>=8?'Павлодар':i%10<6?'Астана':'Караганда',quantity:i===0?20:2+i%5,length:i===0?1.2:[1.2,1,1.6,0.8][i%4],width:i===0?.8:[.8,1,.6][i%3],height:i===0?1:[1,.7,1.4][i%3],weight:i===0?250:[180,90,320,140][i%4],stackable:i%4!==2,maxLayers:2,fragile:i===2||i===17,notes:i===2?'Хрупкий груз. Не ставить сверху груз':'Не кантовать'}));
 const tariffs=vehicles.flatMap((v,i)=>['Астана','Караганда'].map((destination,j)=>({id:`t${i}-${j}`,carrier:['TransLine KZ','Qaz Logistics'][j],origin:'Алматы',destination,vehicleId:v.id,fixed:Math.round(v.tripCost*(j?0.8:1)),perKm:v.perKm,minimum:v.minimum,validFrom:'2026-01-01'})));
 const history:LoadingCalculation[]=Array.from({length:10},(_,i)=>{const rows=cargo.filter(c=>c.requestId===String(101+i));const chosen=findOptimalVehicle(rows,vehicles,tariffs,600).find(x=>x.result.fits)!;const date=new Date();date.setMonth(date.getMonth()-i%5);return {id:`DEMO-${String(i+1).padStart(3,'0')}`,date:date.toISOString(),cargo:rows,vehicle:chosen.vehicle,result:calculateVehicleUtilization(rows,chosen.vehicle),cost:chosen.cost,savings:0,baseline:chosen.cost,distance:600,demo:true};});
 return {cargo,vehicles,tariffs,history,settings:{company:'Логистический отдел',dateTolerance:1,maxDeviation:0,distance:600,nearbyRoutes:[{from:'Астана',to:'Караганда',extraKm:220}]},selected:['c1'],vehicleId:'v4',manual:null};
}
