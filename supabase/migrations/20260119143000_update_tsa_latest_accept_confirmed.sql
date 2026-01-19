CREATE OR REPLACE FUNCTION public.update_tsa_latest()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  last_tsa jsonb;
BEGIN
  SELECT event INTO last_tsa
  FROM jsonb_array_elements(NEW.events) AS event
  WHERE event->>'kind' IN ('tsa', 'tsa.confirmed')
  ORDER BY event->>'at' DESC
  LIMIT 1;

  NEW.tsa_latest := last_tsa;

  RETURN NEW;
END;
$function$;
