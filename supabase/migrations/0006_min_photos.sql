-- New jobs need at least 3 photos so companies can quote accurately. Safe to re-run. Run after 0005.
-- Existing jobs are not checked (NOT VALID), only jobs posted from now on.
alter table public.jobs drop constraint if exists jobs_min_3_photos;
alter table public.jobs add constraint jobs_min_3_photos check (cardinality(photos) >= 3) not valid;
notify pgrst, 'reload schema';
