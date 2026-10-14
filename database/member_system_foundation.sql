-- Superseded unapplied proposal: the canonical, tested migration is now
-- supabase/migrations/20261014020617_member_system_foundation.sql.
-- Do not execute this file or the alternate docs/sql proposal.
-- This guard prevents accidental success while applying an obsolete candidate.
do $$ begin raise exception 'Use the reviewed migration in supabase/migrations; this proposal is superseded.'; end $$;
