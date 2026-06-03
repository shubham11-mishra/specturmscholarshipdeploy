
-- Normalize subject and year_band across assessment tables
UPDATE public.assessment_sections SET subject = lower(trim(subject));
UPDATE public.assessment_sections SET subject = 'maths' WHERE subject IN ('mathematics','math');
UPDATE public.assessment_sections SET year_band = regexp_replace(year_band, '^[Yy]ear\s+', '');
UPDATE public.assessment_sections SET year_band = 'Prep-2' WHERE lower(year_band) IN ('prep-2','prep2','prep-02');
UPDATE public.assessment_sections SET year_band = '2-4' WHERE year_band IN ('2-4','02-04');
UPDATE public.assessment_sections SET year_band = '4-6' WHERE year_band IN ('4-6','04-06');
UPDATE public.assessment_sections SET year_band = '6-8' WHERE year_band IN ('6-8','06-08');
UPDATE public.assessment_sections SET year_band = '8-10' WHERE year_band IN ('8-10','08-10');
UPDATE public.assessment_sections SET year_band = 'Y11' WHERE lower(year_band) IN ('y11','year11','11');
UPDATE public.assessment_sections SET year_band = 'Y12' WHERE lower(year_band) IN ('y12','year12','12');
UPDATE public.assessment_sections SET year_band = 'Scholarship/SEALP' WHERE lower(year_band) IN ('scholarship-sealp','scholarship/sealp','sealp','scholarship');
UPDATE public.assessment_sections SET year_band = 'Selective' WHERE lower(year_band) IN ('selective','selective-entry');

UPDATE public.assessment_passages SET subject = lower(trim(subject)) WHERE subject IS NOT NULL;
UPDATE public.assessment_passages SET subject = 'maths' WHERE subject IN ('mathematics','math');
UPDATE public.assessment_passages SET year_band = regexp_replace(year_band, '^[Yy]ear\s+', '') WHERE year_band IS NOT NULL;
UPDATE public.assessment_passages SET year_band = 'Prep-2' WHERE lower(year_band) IN ('prep-2','prep2');
UPDATE public.assessment_passages SET year_band = 'Y11' WHERE lower(year_band) IN ('y11','11');
UPDATE public.assessment_passages SET year_band = 'Y12' WHERE lower(year_band) IN ('y12','12');
UPDATE public.assessment_passages SET year_band = 'Scholarship/SEALP' WHERE lower(year_band) IN ('scholarship-sealp','scholarship/sealp','sealp');
UPDATE public.assessment_passages SET year_band = 'Selective' WHERE lower(year_band) = 'selective';

UPDATE public.assessment_attempts SET subject = lower(trim(subject));
UPDATE public.assessment_attempts SET subject = 'maths' WHERE subject IN ('mathematics','math');
UPDATE public.assessment_attempts SET year_band = regexp_replace(year_band, '^[Yy]ear\s+', '');
