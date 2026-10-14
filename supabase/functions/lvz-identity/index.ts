// Retired hosted experiment. Deployed with verify_jwt=true; no privileged operations.
Deno.serve(()=>new Response(JSON.stringify({error:'Hosted identity setup is not activated.'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}}));
