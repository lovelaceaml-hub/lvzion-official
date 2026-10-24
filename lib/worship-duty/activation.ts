/** Outside production the module runs only when its switch is explicitly on. */
export function reviewEnabled(env:Record<string,string|undefined>):boolean{return env.LVZ_WORSHIP_DUTY_ENABLED==='true'&&env.VERCEL_ENV!=='production';}
/** Production can only use the verified main-app origin/project and explicit module switch. */
export function worshipOperationalEnabled(env:Record<string,string|undefined>):boolean{
 if(env.VERCEL_ENV==='production')return env.VERCEL==='1'&&env.LVZ_PRODUCTION_ACTIVATED==='true'&&env.LVZ_WORSHIP_DUTY_ENABLED==='true'&&env.LVZ_DATABASE_ENV==='production'&&env.LVZ_APP_ORIGIN==='https://lvz.app'&&env.LVZ_SUPABASE_EXPECTED_REF==='otecqlkqirncotytbfns';
 return reviewEnabled(env);
}
