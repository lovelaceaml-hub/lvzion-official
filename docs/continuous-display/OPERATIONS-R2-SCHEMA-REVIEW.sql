-- LV Zion Official Continuous Display R2 — additive operating rules and safe screen operations.
-- No application activation, pair codes, private media, or real content is seeded.
-- Execute after 20261014223341_continuous_display_live_schema.sql.
BEGIN;

CREATE OR REPLACE FUNCTION display_private.valid_operating_hours(p_hours jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE row_value jsonb; days integer[] := '{}'; d integer; start_min integer; end_min integer; key text;
BEGIN
 IF jsonb_typeof(p_hours)<>'array' OR jsonb_array_length(p_hours) NOT IN(0,7) THEN RETURN false; END IF;
 FOR row_value IN SELECT value FROM jsonb_array_elements(p_hours) LOOP
  IF jsonb_typeof(row_value)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(row_value))<>4 THEN RETURN false; END IF;
  FOR key IN SELECT jsonb_object_keys(row_value) LOOP
   IF key NOT IN ('day','enabled','start','end') THEN RETURN false; END IF;
  END LOOP;
  IF jsonb_typeof(row_value->'day')<>'number' OR jsonb_typeof(row_value->'enabled')<>'boolean'
    OR jsonb_typeof(row_value->'start')<>'number' OR jsonb_typeof(row_value->'end')<>'number' THEN RETURN false; END IF;
  d := (row_value->>'day')::integer;
  start_min := (row_value->>'start')::integer;
  end_min := (row_value->>'end')::integer;
  IF d<0 OR d>6 OR d=ANY(days) OR (row_value->>'day')<>d::text
     OR start_min<0 OR start_min>1439 OR (row_value->>'start')<>start_min::text
     OR end_min<1 OR end_min>1440 OR end_min<=start_min OR (row_value->>'end')<>end_min::text
  THEN RETURN false; END IF;
  days:=array_append(days,d);
 END LOOP;
 RETURN jsonb_array_length(p_hours)=0 OR cardinality(days)=7;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

ALTER TABLE display_private.screens
 ADD COLUMN operating_hours jsonb NOT NULL DEFAULT '[]'::jsonb,
 ADD COLUMN config_version bigint NOT NULL DEFAULT 0 CHECK(config_version>=0),
 ADD CONSTRAINT display_operating_hours_valid CHECK (display_private.valid_operating_hours(operating_hours));

-- The optional per-slide eligibility interval is always subordinate to the approved overall window.
CREATE FUNCTION display_private.items_within_window(p_items jsonb,p_from timestamptz,p_until timestamptz)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE item jsonb;
BEGIN
 IF NOT display_private.valid_items(p_items) THEN RETURN false; END IF;
 IF p_from IS NULL AND p_until IS NULL THEN RETURN jsonb_array_length(p_items)=0; END IF;
 IF p_from IS NULL OR p_until IS NULL OR p_until<=p_from THEN RETURN false; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  IF item ? 'startsAt' AND (
    (item->>'startsAt')::timestamptz < p_from OR
    (item->>'endsAt')::timestamptz > p_until
  ) THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
ALTER TABLE display_private.screens
 ADD CONSTRAINT display_draft_window_check CHECK(
  (draft_from IS NULL AND draft_until IS NULL AND jsonb_array_length(draft_items)=0) OR
  (draft_from IS NOT NULL AND draft_until IS NOT NULL AND display_private.items_within_window(draft_items,draft_from,draft_until))
 );
ALTER TABLE display_private.approvals
 ADD CONSTRAINT display_approval_window_check CHECK(display_private.items_within_window(items,valid_from,valid_until));
ALTER TABLE display_private.publications
 ADD CONSTRAINT display_publication_window_check CHECK(display_private.items_within_window(items,valid_from,valid_until));

CREATE TABLE display_private.current_overrides(
 screen_id uuid PRIMARY KEY REFERENCES display_private.screens(id) ON DELETE RESTRICT,
 publication_id uuid NOT NULL REFERENCES display_private.publications(id) ON DELETE RESTRICT,
 slide_id text NOT NULL CHECK(slide_id ~ '^[a-z0-9][a-z0-9-]{2,49}$'),
 starts_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 created_by uuid NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
 CHECK (expires_at>starts_at AND expires_at<=starts_at+interval '30 minutes')
);
ALTER TABLE display_private.current_overrides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON display_private.current_overrides FROM public,anon,authenticated,service_role;

ALTER TABLE display_private.audit_events DROP CONSTRAINT audit_events_action_check;
ALTER TABLE display_private.audit_events ADD CONSTRAINT audit_events_action_check
 CHECK(action IN ('draft_saved','approved','published','pairing_created','paired','device_revoked',
 'screen_created','hours_updated','restored','override_started','override_cancelled'));

CREATE UNIQUE INDEX display_unique_screen_name ON display_private.screens(lower(btrim(label)));

-- New screens require the single verified bootstrap owner, module management AND independent device permission.
-- A technical-admin appointment, group leadership or another module grant alone is never sufficient.
CREATE FUNCTION public.display_create_screen(p_label text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=display_private.require_manager(); result uuid; original_count integer;
BEGIN
 IF p_label IS NULL OR length(btrim(p_label)) NOT BETWEEN 3 AND 80 OR p_label ~ '[[:cntrl:]]' THEN
  RAISE EXCEPTION 'Invalid screen name' USING errcode='22023'; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM app_private.bootstrap_receipts b JOIN app_private.account_links l
  ON l.auth_user_id=b.auth_user_id
  WHERE l.member_id=actor AND l.enabled AND l.technical_enabled
 ) OR NOT EXISTS(
  SELECT 1 FROM display_private.permissions gr
  WHERE gr.member_id=actor AND gr.permission='device' AND gr.active
 ) THEN RAISE EXCEPTION 'Not authorized' USING errcode='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('lvz-display-create-screen')::bigint);
 SELECT count(*) INTO original_count FROM display_private.screens;
 IF original_count>=8 THEN RAISE EXCEPTION 'Screen limit reached' USING errcode='54000'; END IF;
 INSERT INTO display_private.screens(label,enabled) VALUES(btrim(p_label),false) RETURNING id INTO result;
 INSERT INTO display_private.permissions(screen_id,member_id,permission)
 SELECT result,actor,p.perm FROM (VALUES('edit'),('approve'),('publish'),('device')) p(perm);
 INSERT INTO display_private.audit_events(screen_id,actor_id,action,subject_id)
 VALUES(result,actor,'screen_created',result);
 RETURN result;
END $$;

CREATE FUNCTION public.display_set_operating_hours(p_screen uuid,p_expected_version bigint,p_hours jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=display_private.require_permission(p_screen,'device'); next_version bigint;
BEGIN
 IF NOT display_private.valid_operating_hours(p_hours) THEN
  RAISE EXCEPTION 'Invalid operating schedule' USING errcode='22023'; END IF;
 UPDATE display_private.screens
  SET operating_hours=p_hours,config_version=config_version+1
  WHERE id=p_screen AND config_version=p_expected_version RETURNING config_version INTO next_version;
 IF NOT FOUND THEN RAISE EXCEPTION 'Schedule updated elsewhere' USING errcode='40001'; END IF;
 INSERT INTO display_private.audit_events(screen_id,actor_id,action) VALUES(p_screen,actor,'hours_updated');
 RETURN next_version;
END $$;

-- Restoring a previously approved, still-valid publication appends a NEW version.
-- Original approval, content and windows remain immutable and cannot be extended.
CREATE FUNCTION public.display_restore_publication(p_screen uuid,p_publication uuid,p_expected_generation bigint)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=display_private.require_permission(p_screen,'publish');
 s display_private.screens; old_pub display_private.publications; new_pub uuid; next_generation bigint;
BEGIN
 PERFORM display_private.require_permission(p_screen,'approve');
 SELECT * INTO STRICT s FROM display_private.screens WHERE id=p_screen FOR UPDATE;
 IF s.generation<>p_expected_generation THEN RAISE EXCEPTION 'Publication changed' USING errcode='40001'; END IF;
 SELECT * INTO STRICT old_pub FROM display_private.publications
  WHERE id=p_publication AND screen_id=p_screen;
 IF old_pub.valid_until<=now() OR s.current_publication=old_pub.id THEN
  RAISE EXCEPTION 'Cannot restore this publication' USING errcode='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM display_private.approvals a
  WHERE a.id=old_pub.approval_id AND a.screen_id=p_screen
    AND a.items=old_pub.items AND a.valid_from=old_pub.valid_from AND a.valid_until=old_pub.valid_until)
 THEN RAISE EXCEPTION 'Original approval is invalid' USING errcode='42501'; END IF;
 next_generation:=s.generation+1;
 INSERT INTO display_private.publications(screen_id,approval_id,generation,items,valid_from,valid_until,published_by)
 VALUES(p_screen,old_pub.approval_id,next_generation,old_pub.items,old_pub.valid_from,old_pub.valid_until,actor)
 RETURNING id INTO new_pub;
 UPDATE display_private.screens SET current_publication=new_pub,generation=next_generation WHERE id=p_screen;
 DELETE FROM display_private.current_overrides WHERE screen_id=p_screen;
 INSERT INTO display_private.audit_events(screen_id,actor_id,action,subject_id)
 VALUES(p_screen,actor,'restored',new_pub);
 RETURN next_generation;
END $$;

-- A temporary immediate notice can only select an item ALREADY contained in the current approved publication.
-- No new wording, private draft or fabricated content may bypass destination-specific review.
CREATE FUNCTION public.display_set_override(p_screen uuid,p_slide_id text,p_seconds integer,p_expected_generation bigint)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=display_private.require_permission(p_screen,'publish');
 s display_private.screens; p display_private.publications; selected jsonb; expires timestamptz;
BEGIN
 PERFORM display_private.require_permission(p_screen,'approve');
 IF p_slide_id IS NULL OR p_slide_id !~ '^[a-z0-9][a-z0-9-]{2,49}$'
    OR p_seconds NOT BETWEEN 30 AND 1800 THEN
  RAISE EXCEPTION 'Invalid override' USING errcode='22023'; END IF;
 SELECT * INTO STRICT s FROM display_private.screens WHERE id=p_screen FOR UPDATE;
 IF s.generation<>p_expected_generation OR s.current_publication IS NULL THEN
  RAISE EXCEPTION 'Publication changed' USING errcode='40001'; END IF;
 SELECT * INTO STRICT p FROM display_private.publications WHERE id=s.current_publication AND screen_id=p_screen;
 expires:=now()+make_interval(secs=>p_seconds);
 IF p.valid_from>now() OR p.valid_until<expires THEN
  RAISE EXCEPTION 'Approved publication is not currently eligible' USING errcode='42501'; END IF;
 SELECT e.value INTO selected FROM jsonb_array_elements(p.items) e(value)
  WHERE e.value->>'id'=p_slide_id LIMIT 1;
 IF selected IS NULL OR
    (selected ? 'startsAt' AND ((selected->>'startsAt')::timestamptz>now()
       OR (selected->>'endsAt')::timestamptz<expires))
 THEN RAISE EXCEPTION 'Approved slide is not eligible for this notice' USING errcode='42501'; END IF;
 INSERT INTO display_private.current_overrides(screen_id,publication_id,slide_id,starts_at,expires_at,created_by)
 VALUES(p_screen,p.id,p_slide_id,now(),expires,actor)
 ON CONFLICT(screen_id) DO UPDATE SET
  publication_id=excluded.publication_id,slide_id=excluded.slide_id,starts_at=excluded.starts_at,
  expires_at=excluded.expires_at,created_by=excluded.created_by;
 INSERT INTO display_private.audit_events(screen_id,actor_id,action,subject_id)
 VALUES(p_screen,actor,'override_started',p.id);
 RETURN expires;
END $$;

CREATE FUNCTION public.display_clear_override(p_screen uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=display_private.require_permission(p_screen,'publish'); affected integer;
BEGIN
 PERFORM display_private.require_permission(p_screen,'approve');
 DELETE FROM display_private.current_overrides WHERE screen_id=p_screen;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected>0 THEN
  INSERT INTO display_private.audit_events(screen_id,actor_id,action)
  VALUES(p_screen,actor,'override_cancelled');
 END IF;
 RETURN affected>0;
END $$;

-- Management R2 projects only screens already authorized by the original owner-scoped RPC.
-- A manager can compare the immutable published content against in-progress drafts.
CREATE FUNCTION public.display_management_state_r2()
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
   'configVersion',screen_rec.config_version,
   'publishedItems',coalesce(published,'[]'::jsonb),
   'overrideSlideId',override_id,
   'overrideUntil',override_end
  ));
 END LOOP;
 RETURN jsonb_build_object('screens',results);
END $$;

-- Device R2 extends only an independently verified, screen-scoped and lease-limited R1 projection.
-- There is never a management/draft/member projection on an unpaired TV.
CREATE FUNCTION public.display_device_snapshot_r2(p_token_digest text)
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
  'overrideSlideId',override_id,'overrideUntil',override_end
 );
END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA display_private FROM public,anon,authenticated,service_role;
REVOKE EXECUTE ON FUNCTION public.display_create_screen(text),
 public.display_set_operating_hours(uuid,bigint,jsonb),
 public.display_restore_publication(uuid,uuid,bigint),
 public.display_set_override(uuid,text,integer,bigint),
 public.display_clear_override(uuid),
 public.display_management_state_r2(),
 public.display_device_snapshot_r2(text)
 FROM public,anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION public.display_create_screen(text),
 public.display_set_operating_hours(uuid,bigint,jsonb),
 public.display_restore_publication(uuid,uuid,bigint),
 public.display_set_override(uuid,text,integer,bigint),
 public.display_clear_override(uuid),
 public.display_management_state_r2()
 TO authenticated;
GRANT EXECUTE ON FUNCTION public.display_device_snapshot_r2(text) TO service_role;

COMMIT;
