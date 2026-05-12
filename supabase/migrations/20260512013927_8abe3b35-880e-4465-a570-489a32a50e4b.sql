-- Ensure (user_id, scholarship_id) is unique on applications so upsert works
ALTER TABLE public.applications
  ADD CONSTRAINT applications_user_scholarship_unique UNIQUE (user_id, scholarship_id);