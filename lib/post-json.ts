/** POST a JSON body to one of the app's own API routes. Callers read the Response as before. */
export function postJson(path:string,body:unknown,init:Omit<RequestInit,'method'|'headers'|'body'>={}):Promise<Response>{
 return fetch(path,{...init,method:'POST',headers:{'Content-Type':'application/json'},body:typeof body==='string'?body:JSON.stringify(body)});
}
