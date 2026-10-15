-- Additive independent per-screen ambient-motion configuration for the real Church Display.
-- Generated using Supabase CLI: 20261015004620_continuous_display_motion_r4.sql
-- No content, member grants, pairing, publication, device or original display changes.
BEGIN;
ALTER TABLE display_private.screens
 ADD COLUMN motion_mode text NOT NULL DEFAULT 'standard'
 CONSTRAINT display_motion_mode_valid CHECK(motion_mode IN ('standard','calm','lively','still'));
ALTER TABLE display_private.audit_events DROP CONSTRAINT audit_events_action_check;
ALTER TABLE display_private.audit_events ADD CONSTRAINT audit_events_action_check
 CHECK(action IN('draft_saved','approved','published','pairing_created','paired','device_revoked',
 'screen_created','hours_updated','restored','override_started','override_cancelled','motion_updated'));

CREATE FUNCTION public.display_set_motion(p_screen uuid,p_expected_version bigint,p_mode text)
 RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=display_private.require_permission(p_screen,'device');next_version bigint;
BEGIN
 IF p_mode IS NULL OR p_mode NOT IN ('standard','calm','lively','still') THEN
  RAISE EXCEPTION 'Invalid motion mode' USING errcode='22023';END IF;
 UPDATE display_private.screens
  SET motion_mode=p_mode,config_version=config_version+1
  WHERE id=p_screen AND config_version=p_expected_version
  RETURNING config_version INTO next_version;
 IF NOT FOUND THEN RAISE EXCEPTION 'Screen settings changed' USING errcode='40001';END IF;
 INSERT INTO display_private.audit_events(screen_id,actor_id,action) VALUES(p_screen,actor,'motion_updated');
 RETURN next_version;
END $$;
-- Re-project only this screen's motion setting to previously authorized managers.
CREATE OR REPLACE FUNCTION public.display_management_state_r2()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE base jsonb:=public.display_management_state(); item jsonb; results jsonb:='[]'::jsonb;
 sid uuid; screen_rec display_private.screens; published jsonb; override_id text; override_end timestamptz;
BEGIN
 FOR item IN SELECT value FROM jsonb_array_elements(base->'screens') LOOP
  sid:=(item->>'id')::uuid;
  SELECT * INTO STRICT screen_rec FROM display_private.screens WHERE id=sid;
  SELECT p.items INTO published FROM display_private.publications p WHERE p.id=screen_rec.current_publication;
  SELECT o.slide_id,o.expires_at INTO override_id,override_end
  FROM display_private.current_overrides o
  WHERE o.screen_id=sid AND o.publication_id=screen_rec.current_publication AND o.expires_at>now();
  results:=results||jsonb_build_array(item||jsonb_build_object(
   'operatingHours',screen_rec.operating_hours,
   'motionMode',screen_rec.motion_mode,
   'configVersion',screen_rec.config_version,
   'publishedItems',coalesce(published,'[]'::jsonb),
   'overrideSlideId',override_id,
   'overrideUntil',override_end
  ));
 END LOOP;
 RETURN jsonb_build_object('screens',results);
END $$;
-- TV identity remains independently verified by R2 before this presentation setting is appended.
CREATE OR REPLACE FUNCTION public.display_device_snapshot_r2(p_token_digest text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE base jsonb:=public.display_device_snapshot(p_token_digest);
 screen_rec display_private.screens; override_id text; override_end timestamptz;
BEGIN
 IF base IS NULL THEN RETURN NULL; END IF;
 SELECT s.* INTO STRICT screen_rec FROM display_private.devices d
 JOIN display_private.screens s ON s.id=d.screen_id
 WHERE d.token_digest=p_token_digest AND d.revoked_at IS NULL AND s.enabled;
 SELECT o.slide_id,o.expires_at INTO override_id,override_end
 FROM display_private.current_overrides o WHERE o.screen_id=screen_rec.id
 AND o.publication_id=screen_rec.current_publication AND o.starts_at<=now() AND o.expires_at>now()
 AND EXISTS(SELECT 1 FROM jsonb_array_elements(base->'slides') row_value(value)
  WHERE row_value.value->>'id'=o.slide_id);
 RETURN base||jsonb_build_object(
  'operatingHours',screen_rec.operating_hours,
  'motionMode',screen_rec.motion_mode,
  'overrideSlideId',override_id,'overrideUntil',override_end
 );
END $$;
REVOKE EXECUTE ON FUNCTION public.display_set_motion(uuid,bigint,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.display_set_motion(uuid,bigint,text) TO authenticated;
-- Preserve previous narrowly scoped RPC grants, without opening unrelated functions.
REVOKE EXECUTE ON FUNCTION public.display_management_state_r2() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.display_management_state_r2() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.display_device_snapshot_r2(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.display_device_snapshot_r2(text) TO service_role;
COMMIT;
