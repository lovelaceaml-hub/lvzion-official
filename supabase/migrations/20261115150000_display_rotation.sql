-- Church Display: slides that take turns, and room for more slides (Anthony, 2026-11-15: the 11 Healing Concert
-- promos, "All 11 but in a rotation").
-- Additive: valid_items accepts up to 32 slides (was 16) and an optional "rotate": true on any slide. Neighbouring
-- rotating slides form a group; each loop of the TV plays the next two of the group in order.
-- Rollback: re-run valid_items from 20261113235000_display_mothers_love.sql (only while no stored playlist has more
-- than 16 slides or a rotate field).
BEGIN;

CREATE OR REPLACE FUNCTION display_private.valid_items(p_items jsonb) RETURNS boolean
 LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE item jsonb; row_value jsonb; id_value text; known text[] := '{}'; key text;
 kind text; text_kind boolean; min_seconds numeric; max_seconds numeric;
BEGIN
 IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)>32 THEN RETURN false; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  IF jsonb_typeof(item)<>'object' THEN RETURN false; END IF;
  FOR key IN SELECT jsonb_object_keys(item) LOOP
   IF key NOT IN ('id','kind','style','title','body','date','time','location','rows','duration','startsAt','endsAt','media','fit','rotate') THEN RETURN false; END IF;
  END LOOP;
  id_value:=item->>'id';
  IF id_value IS NULL OR id_value !~ '^[a-z0-9][a-z0-9-]{2,49}$' OR id_value=ANY(known) THEN RETURN false; END IF;
  known:=array_append(known,id_value);
  kind:=item->>'kind';
  IF kind IS NULL OR kind NOT IN ('announcement','schedule','event','campaign','image','video','rooms','mothers-love')
    OR (item->>'style') NOT IN ('editorial','schedule','event','campaign') THEN RETURN false; END IF;
  text_kind:=kind IN ('announcement','schedule','event','campaign');
  IF jsonb_typeof(item->'title') IS DISTINCT FROM 'string' OR length(btrim(item->>'title')) NOT BETWEEN 1 AND 74
     OR (item->>'title') ~ '[[:cntrl:]]' THEN RETURN false; END IF;
  -- Text slides need a message; picture, video and rooms slides may carry an optional caption.
  IF text_kind OR item ? 'body' THEN
   IF jsonb_typeof(item->'body') IS DISTINCT FROM 'string' OR length(btrim(item->>'body')) NOT BETWEEN 1 AND 160
      OR (item->>'body') ~ '[[:cntrl:]]' THEN RETURN false; END IF;
  END IF;
  min_seconds:=CASE kind WHEN 'image' THEN 5 WHEN 'video' THEN 5 WHEN 'mothers-love' THEN 20 ELSE 8 END;
  max_seconds:=CASE kind WHEN 'image' THEN 300 WHEN 'video' THEN 900 WHEN 'rooms' THEN 120 WHEN 'mothers-love' THEN 900 ELSE 60 END;
  IF jsonb_typeof(item->'duration') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
  IF (item->>'duration')::numeric NOT BETWEEN min_seconds AND max_seconds
     OR (item->>'duration')::numeric<>trunc((item->>'duration')::numeric) THEN RETURN false; END IF;
  IF kind IN ('image','video') THEN
   IF jsonb_typeof(item->'media') IS DISTINCT FROM 'string' OR (item->>'media') !~ '^[a-f0-9]{32}\.(jpg|png|webp|mp4|webm)$'
      OR (kind='video')<>((item->>'media') ~ '\.(mp4|webm)$') THEN RETURN false; END IF;
   IF item ? 'fit' AND (item->>'fit') NOT IN ('cover','contain') THEN RETURN false; END IF;
  ELSIF item ? 'media' OR item ? 'fit' THEN RETURN false;
  END IF;
  IF NOT text_kind AND (item ? 'date' OR item ? 'time' OR item ? 'location' OR item ? 'rows') THEN RETURN false; END IF;
  FOR key IN SELECT unnest(array['date','time','location']) LOOP
   IF item ? key AND (jsonb_typeof(item->key)<>'string' OR length(btrim(item->>key)) NOT BETWEEN 1 AND 72) THEN RETURN false; END IF;
  END LOOP;
  IF kind='event' AND (NOT item?'date' OR NOT item?'time' OR NOT item?'location') THEN RETURN false; END IF;
  IF kind='schedule' AND (NOT item?'date' OR NOT item?'rows') THEN RETURN false; END IF;
  IF item ? 'rows' THEN
   IF jsonb_typeof(item->'rows')<>'array' OR jsonb_array_length(item->'rows')>3 THEN RETURN false; END IF;
   FOR row_value IN SELECT value FROM jsonb_array_elements(item->'rows') LOOP
    IF jsonb_typeof(row_value)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(row_value))<>2
       OR NOT row_value?'time' OR NOT row_value?'label'
       OR jsonb_typeof(row_value->'time')<>'string'
       OR jsonb_typeof(row_value->'label')<>'string'
       OR length(btrim(row_value->>'time')) NOT BETWEEN 1 AND 28
       OR length(btrim(row_value->>'label')) NOT BETWEEN 1 AND 80 THEN RETURN false; END IF;
   END LOOP;
  END IF;
  -- 'rotate': true marks a slide that takes turns with the rotating slides next to it.
  IF item ? 'rotate' AND item->'rotate' IS DISTINCT FROM 'true'::jsonb THEN RETURN false; END IF;
  IF (item ? 'startsAt')<>(item ? 'endsAt') THEN RETURN false; END IF;
  IF item ? 'startsAt' THEN
   IF jsonb_typeof(item->'startsAt')<>'string' OR jsonb_typeof(item->'endsAt')<>'string'
     OR length(item->>'startsAt')>40 OR length(item->>'endsAt')>40
     OR (item->>'startsAt')::timestamptz >= (item->>'endsAt')::timestamptz THEN RETURN false; END IF;
  END IF;
 END LOOP;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

COMMIT;
