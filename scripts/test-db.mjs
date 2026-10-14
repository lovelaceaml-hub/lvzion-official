import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
let passes=0;
const db=new PGlite();
try {
 for(const file of ['supabase/tests/bootstrap.sql','supabase/migrations/20261014020617_member_system_foundation.sql','supabase/migrations/20261014043055_member_command_hardening.sql','supabase/seed/fictional_members.sql','supabase/tests/member_foundation.sql']) await db.exec(await readFile(file,'utf8'),{onNotice:notice=>{if(notice.message?.startsWith('PASS:'))passes++;}});
 if(passes<53) throw new Error(`Expected at least 53 assertions; got ${passes}`);
 console.log(`PASS: ${passes} PostgreSQL permission assertions. Disposable PGlite database only.`);
} finally {await db.close();}
