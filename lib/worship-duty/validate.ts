export class WorshipError extends Error {status:number;code:string;constructor(message:string,status=400,code='invalid'){super(message);this.status=status;this.code=code;}}
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Strict field readers. Each contract supplies the single message shown when its data is rejected. */
export function validators(message:string){
 const fail=():never=>{throw new WorshipError(message);};
 const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:fail();
 const text=(v:unknown,max=160):string=>typeof v==='string'&&v.length<=max?v:fail();
 /** Trimmed text of at least `min` visible characters. */
 const trimmed=(v:unknown,max:number,min=1):string=>typeof v==='string'&&v.trim().length>=min&&v.length<=max?v.trim():fail();
 const bool=(v:unknown):boolean=>typeof v==='boolean'?v:fail();
 const list=(v:unknown,max:number):unknown[]=>Array.isArray(v)&&v.length<=max?v:fail();
 const integer=(v:unknown,max=999999999,min=0):number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max?v:fail();
 const oneOf=<T extends string>(v:unknown,values:readonly T[]):T=>typeof v==='string'&&values.includes(v as T)?v as T:fail();
 const uuid=(v:unknown):string=>typeof v==='string'&&uuidPattern.test(v)?v:fail();
 const instant=(v:unknown):string=>{const s=text(v,40);if(!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(s)||!Number.isFinite(Date.parse(s)))fail();return s;};
 /** Rejects missing required fields and every field that is not explicitly allowed. */
 const keys=(o:Record<string,unknown>,required:string[],optional:string[]=[])=>{if(required.some(k=>!(k in o))||Object.keys(o).some(k=>![...required,...optional].includes(k)))fail();};
 return {fail,object,text,trimmed,bool,list,integer,oneOf,uuid,instant,keys};
}
