export const CURRENCIES = ['TZS','USD','KES'] as const;
export function getJSON<T>(k:string,d:T):T{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}}
export function setJSON(k:string,v:any){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
export function readLocal<T>(k:string,d:T):T{return getJSON(k,d)}
export function writeLocal(k:string,v:any){setJSON(k,v)}
export function removeLocal(k:string){localStorage.removeItem(k)}
export function uid(){return Math.random().toString(36).slice(2,9)}
export function nextRun(timeStr:string,days?:number[]){const now=new Date();const [h,m]=timeStr.split(':').map(x=>+x||0);const d=new Date(now.getFullYear(),now.getMonth(),now.getDate(),h,m,0,0);let add=0;if(d<=now)add=1;if(days&&days.length){const base=new Date(d);base.setDate(base.getDate()+add);for(let i=0;i<14;i++){const dd=new Date(base);dd.setDate(dd.getDate()+i);if(days.includes(dd.getDay()))return dd.getTime()}return base.getTime()}const res=new Date(d);res.setDate(res.getDate()+add);return res.getTime()}
export function daysUntil(ts:number){const now=Date.now();const diff=ts-now;if(diff<=0)return 0;return Math.ceil(diff/(24*60*60*1000))}
export function sqliteDate(d=new Date()):string{return d.toISOString().slice(0,10)}
export function randomCode(n=6):string{return Array.from({length:n},()=>Math.floor(Math.random()*10)).join('')}
export function saveTextFile(name:string,txt:string){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/plain'}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
export function logActivity(action:string,details?:any){const a=getJSON('tk_activity',[]);a.unshift({action,details,ts:Date.now()});if(a.length>200)a.pop();setJSON('tk_activity',a)}
export function getActivity(){return getJSON('tk_activity',[])}
export function clearActivity(){setJSON('tk_activity',[])}
export function deviceInfo(){return {ua:navigator.userAgent,plat:navigator.platform,lang:navigator.language}}
