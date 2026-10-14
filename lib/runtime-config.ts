export function resolveSettings(env:Record<string,string|undefined>) {
 const url=env.NEXT_PUBLIC_SUPABASE_URL; const key=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const origin=env.LVZ_APP_ORIGIN;const ref=env.LVZ_SUPABASE_EXPECTED_REF;
 if(env.LVZ_MEMBER_SYSTEM_ENABLED!=='true'||!url||!key||!origin)throw new Error('Member system is not activated.');
 const parsed=new URL(url);const local=env.LVZ_DATABASE_ENV==='local'&&env.LVZ_LOCAL_INTEGRATION==='true'&&!env.VERCEL;
 const production=env.LVZ_DATABASE_ENV==='production';
 if(local){if(url!=='http://127.0.0.1:54321'||origin!=='http://127.0.0.1:3000')throw new Error('Local integration must use fixed loopback endpoints.');}
 else {
  if(production){
   if(env.VERCEL!=='1'||env.VERCEL_ENV!=='production'||env.LVZ_PRODUCTION_ACTIVATED!=='true'||ref!=='otecqlkqirncotytbfns'||origin!=='https://lvz.app')throw new Error('Approved production activation required.');
  }else if(env.LVZ_DATABASE_ENV!=='isolated'||!ref||ref==='otecqlkqirncotytbfns')throw new Error('Approved isolated database required.');
  if(parsed.protocol!=='https:'||parsed.hostname!==`${ref}.supabase.co`||parsed.port||parsed.username||parsed.password||parsed.pathname!=='/'||parsed.search||parsed.hash)throw new Error('Approved database endpoint required.');
  if(!origin.startsWith('https://')||new URL(origin).origin!==origin)throw new Error('Trusted HTTPS origin required.');
 }
 return {url,key,origin,local,production,secureCookies:!local,secret:env.SUPABASE_SECRET_KEY,rateSecret:env.LVZ_RATE_LIMIT_SECRET};
}
