export function getJSON<T>(k:string,d:T):T{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}}
export function setJSON(k:string,v:any){localStorage.setItem(k,JSON.stringify(v))}
