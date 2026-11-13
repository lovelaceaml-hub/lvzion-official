-- Church Display: open link (Anthony, 2026-11-13: "just have the link able to show this and be able to be full
-- screen mode"). lvz.app/display plays the published playlist of the main screen without pairing.
-- Additive: one read-only function for the server (service_role only). It returns exactly what a paired TV of the
-- main screen would receive (published, in-window slides, operating hours, motion, a current featured slide),
-- never drafts, devices, permissions or history. The main screen is the oldest screen; its enabled flag (set by
-- pairing) is not required.
-- Rollback: DROP FUNCTION public.display_public_snapshot(); the app then falls back to its quiet welcome.
BEGIN;

CREATE FUNCTION public.display_public_snapshot() RETURNS jsonb
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s display_private.screens; p display_private.publications; rows_json jsonb:='[]'::jsonb;
 version bigint; lease timestamptz:=now()+interval '30 seconds'; override_id text; override_end timestamptz;
BEGIN
 SELECT * INTO s FROM display_private.screens ORDER BY created_at, id LIMIT 1;
 IF NOT FOUND THEN RETURN NULL; END IF;
 version:=s.generation;
 IF s.current_publication IS NOT NULL THEN
  SELECT * INTO p FROM display_private.publications WHERE id=s.current_publication AND screen_id=s.id;
  IF FOUND AND p.valid_from<=now() AND p.valid_until>now() THEN
   SELECT coalesce(jsonb_agg(i.value ORDER BY i.ordinality),'[]'::jsonb) INTO rows_json
   FROM jsonb_array_elements(p.items) WITH ORDINALITY i(value,ordinality)
   WHERE (NOT (i.value ? 'startsAt') OR (i.value->>'startsAt')::timestamptz<=now())
    AND (NOT (i.value ? 'endsAt') OR (i.value->>'endsAt')::timestamptz>now());
   version:=p.generation;
   lease:=least(lease,p.valid_until);
   SELECT o.slide_id,o.expires_at INTO override_id,override_end
   FROM display_private.current_overrides o
   WHERE o.screen_id=s.id AND o.publication_id=s.current_publication AND o.starts_at<=now() AND o.expires_at>now()
    AND EXISTS(SELECT 1 FROM jsonb_array_elements(rows_json) r(value) WHERE r.value->>'id'=o.slide_id);
  END IF;
 END IF;
 RETURN jsonb_build_object('paired',true,'screen',s.label,'version',version,'serverTime',now(),'leaseUntil',lease,
  'slides',rows_json,'operatingHours',s.operating_hours,'motionMode',s.motion_mode,
  'overrideSlideId',override_id,'overrideUntil',override_end);
END $$;
REVOKE EXECUTE ON FUNCTION public.display_public_snapshot() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.display_public_snapshot() TO service_role;

COMMIT;
