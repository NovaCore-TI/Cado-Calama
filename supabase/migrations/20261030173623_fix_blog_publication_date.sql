-- published_at records the first publication, not draft creation.
-- Existing published dates are preserved: the real historical date cannot be inferred.
BEGIN;
ALTER TABLE public.articulos_blog ALTER COLUMN published_at DROP NOT NULL;
ALTER TABLE public.articulos_blog ALTER COLUMN published_at DROP DEFAULT;
UPDATE public.articulos_blog SET published_at = NULL
WHERE NOT publicado AND NOT EXISTS (
  SELECT 1 FROM pg_catalog.pg_trigger
  WHERE tgrelid = 'public.articulos_blog'::regclass
    AND tgname = 'article_publication_date'
);

CREATE OR REPLACE FUNCTION public.set_article_publication_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.published_at := CASE WHEN NEW.publicado THEN statement_timestamp() ELSE NULL END;
  ELSE
    -- Preserve first publication across edits, withdrawal and republication.
    NEW.published_at := OLD.published_at;
    IF NEW.publicado AND NEW.published_at IS NULL THEN
      NEW.published_at := statement_timestamp();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.set_article_publication_date() FROM PUBLIC;
DROP TRIGGER IF EXISTS article_publication_date ON public.articulos_blog;
CREATE TRIGGER article_publication_date
BEFORE INSERT OR UPDATE ON public.articulos_blog
FOR EACH ROW EXECUTE FUNCTION public.set_article_publication_date();
COMMIT;
