import { readFile,readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
let passes=0;
const db=new PGlite();
try {
 const migrations=(await readdir('supabase/migrations')).filter(p=>p.endsWith('.sql')).sort().map(p=>'supabase/migrations/'+p);
 for(const file of ['supabase/tests/bootstrap.sql',...migrations,'supabase/tests/production_owner.sql','supabase/tests/signup_tickets.sql','supabase/tests/onboarding_bootstrap.sql','supabase/seed/fictional_members.sql','supabase/tests/member_foundation.sql','supabase/tests/onboarding_permissions.sql','supabase/tests/module_runtime.sql','supabase/tests/self_service_enrollment.sql']) await db.exec(await readFile(file,'utf8'),{onNotice:notice=>{if(notice.message?.startsWith('PASS:'))passes++;}});
 if(passes<108) throw new Error(`Expected at least 108 assertions; got ${passes}`);
 console.log(`PASS: ${passes} PostgreSQL permission assertions. Disposable PGlite database only.`);
} finally {await db.close();}
