DROP TABLE IF EXISTS public.scholarships CASCADE;

CREATE TABLE public.scholarships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  acara_id text,
  school_name text NOT NULL,
  suburb text,
  postcode text,
  state text,
  sector text,
  school_sector text,
  school_type text,
  gender text,
  lat text,
  lng text,
  geolocation text,
  website_url text,
  school_phone text,
  school_email text,
  scholarship_url text,
  scholarship_confidence text DEFAULT 'not_found',
  url_status text,
  program_name text,
  program_type text,
  category text,
  sub_type text,
  gender_eligibility text,
  overview text,
  description text,
  eligibility_criteria text,
  year_levels text,
  application_open_date text,
  application_close_date text,
  closing_label text,
  days_left text,
  value_aud text,
  value_num text,
  value_type text,
  number_awarded text,
  test_provider text,
  test_month text,
  application_fee text,
  special_conditions text,
  contact_phone text,
  contact_email text,
  is_active text,
  extraction_confidence_score text,
  last_verified_at text,
  link_status_code text,
  link_status text,
  page_type text,
  schol_hits text,
  enrol_hits text,
  page_snippet text,
  tuition_fee_aud text,
  tuition_fee_num text,
  closing_label_display text,
  prep_product text,
  prep_product_type text,
  prep_product_url text,
  prep_description text,
  match_year_levels text,
  match_gender text,
  win_probability_base text,
  win_probability_label text,
  search_tags text,
  nlp_keywords text,
  dataset_type text NOT NULL DEFAULT 'scholarship'
);

ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scholarships"
ON public.scholarships
FOR SELECT
TO anon, authenticated
USING (true);

CREATE INDEX idx_scholarships_state ON public.scholarships(state);
CREATE INDEX idx_scholarships_confidence ON public.scholarships(scholarship_confidence);
CREATE INDEX idx_scholarships_close_date ON public.scholarships(application_close_date);