import type {CargoItem,Vehicle,LoadingPosition,LoadingResult} from '../types';
const EPS=1e-7;
export const calculateCargoVolume=(c:CargoItem)=>c.length*c.width*c.height*c.quantity;
export const calculateCargoWeight=(c:CargoItem)=>c.weight*c.quantity;
export const calculateFloorArea=(c:CargoItem)=>c.length*c.width*c.quantity;
export const calculateStacking=(c:CargoItem,v:Vehicle,h=c.height)=>c.stackable&&!c.fragile&&!/не (ставить сверху|штабелировать)/i.test(c.notes)?Math.max(1,Math.min(c.maxLayers,Math.floor((v.height+EPS)/h))):1;
export function validateCargo(c:CargoItem):string[] {const errors:string[]=[];if(!c.name.trim())errors.push('Укажите наименование ТМЗ');for(const k of ['length','width','height','weight','quantity','maxLayers'] as const)if(!Number.isFinite(c[k])||c[k]<=0)errors.push(`${c.name}: ${k} должно быть положительным числом`);if(!Number.isInteger(c.quantity)||!Number.isInteger(c.maxLayers))errors.push(`${c.name}: количество и ярусы должны быть целыми`);return errors;}
export function validateVehicle(v:Vehicle):string[]{return ['length','width','height','capacity','maxFloorLoad'].some(k=>!Number.isFinite(v[k as keyof Vehicle])||Number(v[k as keyof Vehicle])<=0)?['Габариты, грузоподъёмность и нагрузка на пол должны быть положительными']:[];}
export function orientations(c:CargoItem):number[][] {let a=[[c.length,c.width,c.height]];if(c.tiltable&&!c.upright&&!/не кантовать/i.test(c.notes))a.push([c.length,c.height,c.width],[c.height,c.width,c.length]);if(c.rotatable)a=a.flatMap(([l,w,h])=>[[l,w,h],[w,l,h]]);return a.filter((x,i)=>a.findIndex(y=>y.every((v,j)=>v===x[j]))===i);}
export const overlaps=(a:LoadingPosition,b:LoadingPosition)=>a.x<b.x+b.length-EPS&&a.x+a.length>b.x+EPS&&a.y<b.y+b.width-EPS&&a.y+a.width>b.y+EPS;
export const isValidPosition=(p:LoadingPosition,all:LoadingPosition[],v:Vehicle)=>p.x>=-EPS&&p.y>=-EPS&&p.x+p.length<=v.length+EPS&&p.y+p.width<=v.width+EPS&&p.layers*p.height<=v.height+EPS&&p.weight/(p.length*p.width)<=v.maxFloorLoad+EPS&&!all.some(q=>q.id!==p.id&&overlaps(p,q));
type Rect={x:number;y:number;l:number;w:number};
function pack(cargo:CargoItem[],v:Vehicle,mode:number):LoadingPosition[]{let free:Rect[]=[{x:0,y:0,l:v.length,w:v.width}];const placed:LoadingPosition[]=[];
 const sorted=[...cargo].sort((a,b)=>mode===0?Number(a.tiltable)-Number(b.tiltable)||Number(a.stackable)-Number(b.stackable)||b.weight-a.weight||b.length*b.width-a.length*a.width:mode===1?b.length*b.width-a.length*a.width:b.length*b.width*b.height-a.length*a.width*a.height);
 for(const c of sorted){let done=0;while(done<c.quantity){let best:{r:Rect;l:number;w:number;h:number;layers:number;score:number}|undefined;
 for(const [l,w,h] of orientations(c)){if(h>v.height+EPS)continue;const floorLayers=Math.floor((v.maxFloorLoad*l*w+EPS)/c.weight);const layers=Math.min(c.quantity-done,calculateStacking(c,v,h),floorLayers);if(layers<1)continue;
 for(const r of free)if(l<=r.l+EPS&&w<=r.w+EPS){const score=(r.l*r.w-l*w)/layers+Math.min(r.l-l,r.w-w)*0.01;if(!best||score<best.score)best={r,l,w,h,layers,score};}}
 if(!best)break;const {r,l,w,h,layers}=best;const nearDoor=/возле дверей/i.test(c.notes);const p:LoadingPosition={id:`${c.id}:${done}`,cargoId:c.id,x:nearDoor?r.x+r.l-l:r.x,y:r.y,length:l,width:w,height:h,layers,first:done+1,weight:c.weight*layers,tilted:Math.abs(h-c.height)>EPS};placed.push(p);done+=layers;
 const next:Rect[]=[];for(const f of free){if(p.x>=f.x+f.l-EPS||p.x+l<=f.x+EPS||p.y>=f.y+f.w-EPS||p.y+w<=f.y+EPS){next.push(f);continue;}if(p.x>f.x+EPS)next.push({...f,l:p.x-f.x});if(p.x+l<f.x+f.l-EPS)next.push({...f,x:p.x+l,l:f.x+f.l-p.x-l});if(p.y>f.y+EPS)next.push({...f,w:p.y-f.y});if(p.y+w<f.y+f.w-EPS)next.push({...f,y:p.y+w,w:f.y+f.w-p.y-w});}
 free=next.filter((a,i)=>!next.some((b,j)=>j!==i&&a.x>=b.x-EPS&&a.y>=b.y-EPS&&a.x+a.l<=b.x+b.l+EPS&&a.y+a.w<=b.y+b.w+EPS&&(j<i||a.x!==b.x||a.y!==b.y||a.l!==b.l||a.w!==b.w)));}}
 return placed;
}
export function generateLoadingPlan(cargo:CargoItem[],v:Vehicle):LoadingPosition[]{if(cargo.some(c=>validateCargo(c).length)||validateVehicle(v).length)return [];return [0,1,2].map(m=>pack(cargo,v,m)).sort((a,b)=>b.reduce((s,p)=>s+p.layers,0)-a.reduce((s,p)=>s+p.layers,0)||a.reduce((s,p)=>s+p.length*p.width,0)-b.reduce((s,p)=>s+p.length*p.width,0))[0];}
export function calculateVehicleUtilization(cargo:CargoItem[],v:Vehicle,manual?:LoadingPosition[]|null):LoadingResult {
 const reasons=[...validateVehicle(v),...cargo.flatMap(validateCargo)];const positions=manual??generateLoadingPlan(cargo,v);const count=cargo.reduce((s,c)=>s+c.quantity,0),volume=cargo.reduce((s,c)=>s+calculateCargoVolume(c),0),weight=cargo.reduce((s,c)=>s+calculateCargoWeight(c),0),rawFloor=cargo.reduce((s,c)=>s+calculateFloorArea(c),0);
 const effectiveFloor=cargo.reduce((s,c)=>s+Math.min(...orientations(c).filter(([l,w,h])=>l<=v.length+EPS&&w<=v.width+EPS&&h<=v.height+EPS).map(([l,w,h])=>Math.ceil(c.quantity/Math.max(1,Math.min(calculateStacking(c,v,h),Math.floor(v.maxFloorLoad*l*w/c.weight))))*l*w),c.length*c.width*c.quantity),0);
 const floor=positions.reduce((s,p)=>s+p.length*p.width,0);const unplaced=count-positions.reduce((s,p)=>s+p.layers,0);
 if(weight>v.capacity+EPS)reasons.push(`Превышена грузоподъёмность на ${Math.round(weight-v.capacity)} кг`);if(volume>v.length*v.width*v.height+EPS)reasons.push('Недостаточно объёма кузова');if(effectiveFloor>v.length*v.width+EPS)reasons.push('Недостаточно площади пола');
 for(const c of cargo){if(!orientations(c).some(([l,w,h])=>l<=v.length+EPS&&w<=v.width+EPS&&h<=v.height+EPS)){const dims=[['длины',0,v.length],['ширины',1,v.width],['высоты',2,v.height]] as const;const specific=dims.filter(([,i,n])=>orientations(c).every(o=>o[i]>n+EPS)).map(([label])=>`недостаточно ${label} кузова`);reasons.push(`${c.name}: ${specific.join(', ')||'габариты не проходят при разрешённых ориентациях'}${!c.tiltable?' (кантование запрещено)':''}`);}if(orientations(c).every(([l,w])=>c.weight/(l*w)>v.maxFloorLoad+EPS))reasons.push(`${c.name}: превышена допустимая нагрузка на пол`);}
 if(unplaced>0)reasons.push(`Не размещено ${unplaced} из ${count} мест. Эвристика не нашла схему для всего груза`);
 if(positions.some(p=>!isValidPosition(p,positions,v)))reasons.push('Схема содержит пересечение или превышение ограничений');
 const volumePercent=volume/(v.length*v.width*v.height)*100,weightPercent=weight/v.capacity*100,floorPercent=(unplaced?Math.max(floor,effectiveFloor):floor)/(v.length*v.width)*100,utilization=Math.max(volumePercent,weightPercent,floorPercent),fits=count>0&&!reasons.length;
 const [status,tone]=!count?['Нет данных','neutral']:!fits?['НЕ ВЛЕЗАЕТ','danger']:utilization>90?['Высокая загрузка','warning']:utilization>=70?['Оптимально','success']:utilization>=50?['Допустимо, есть резерв','reserve']:['Рекомендуется консолидация','low'];
 return {positions,unplaced,reasons,fits,volume,weight,floor,rawFloor,effectiveFloor,count,volumePercent,weightPercent,floorPercent,utilization,status,tone};
}
export const checkCargoFits=(cargo:CargoItem[],v:Vehicle)=>calculateVehicleUtilization(cargo,v).fits;
