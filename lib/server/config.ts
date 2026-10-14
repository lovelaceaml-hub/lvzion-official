import 'server-only';
export function settings() {
 const env=process.env;
 const url=env.NEXT_PUBLIC_SUPABASE_URL;
 const key=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const ref=env.LVZ_SUPABASE_EXPECTED_REF;
 const origin=env.LVZ_APP_ORIGIN;
 if (env.LVZ_MEMBER_SYSTEM_ENABLED!=='true' || env.LVZ_DATABASE_ENV!=='isolated' || !url || !key || !ref || !origin) throw new Error('Member system is not activated.');
 const parsed=new URL(url);
 if (parsed.protocol!=='https:' || parsed.hostname!==`${ref}.supabase.co` || ref==='otecqlkqirncotytbfns' || parsed.username || parsed.password || parsed.port || parsed.pathname!=='/' || parsed.search || parsed.hash) throw new Error('Isolated database configuration required.');
 if (new URL(origin).origin!==origin || !origin.startsWith('https://')) throw new Error('Trusted HTTPS app origin required.');
 return { url,key,origin,secret:env.SUPABASE_SECRET_KEY,rateSecret:env.LVZ_RATE_LIMIT_SECRET };
}
