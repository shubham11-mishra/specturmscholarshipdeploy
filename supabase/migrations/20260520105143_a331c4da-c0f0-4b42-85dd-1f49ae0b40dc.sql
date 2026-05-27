
-- Sections
CREATE TABLE public.assessment_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL CHECK (subject IN ('english','maths')),
  year_band text NOT NULL,
  section_name text NOT NULL,
  section_order int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assessment_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sections public read" ON public.assessment_sections FOR SELECT USING (true);

-- Questions
CREATE TABLE public.assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.assessment_sections(id) ON DELETE CASCADE,
  question_number int NOT NULL,
  level int NOT NULL DEFAULT 1,
  question_text text NOT NULL,
  passage_text text,
  question_image_url text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer text NOT NULL,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_questions_section ON public.assessment_questions(section_id, question_number);
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions public read" ON public.assessment_questions FOR SELECT USING (true);

-- Attempts
CREATE TABLE public.assessment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  subject text NOT NULL,
  year_band text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned')),
  current_question int NOT NULL DEFAULT 1,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  flagged_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_score numeric,
  section_scores jsonb DEFAULT '{}'::jsonb,
  level_scores jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_attempts_student ON public.assessment_attempts(student_id, status);
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own attempts" ON public.assessment_attempts FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "users insert own attempts" ON public.assessment_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "users update own attempts" ON public.assessment_attempts FOR UPDATE TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "users delete own attempts" ON public.assessment_attempts FOR DELETE TO authenticated USING (auth.uid() = student_id);

CREATE TRIGGER trg_attempts_touch BEFORE UPDATE ON public.assessment_attempts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============= SEED CONTENT =============
-- English Year 6-8
WITH s AS (
  INSERT INTO public.assessment_sections (subject, year_band, section_name, section_order) VALUES
    ('english','6-8','Grammar & Punctuation',1),
    ('english','6-8','Reading Comprehension',2),
    ('english','8-10','Grammar & Punctuation',1),
    ('english','8-10','Reading Comprehension',2),
    ('maths','6-8','Number & Algebra',1),
    ('maths','6-8','Problem Solving',2),
    ('maths','8-10','Number & Algebra',1),
    ('maths','8-10','Problem Solving',2)
  RETURNING id, subject, year_band, section_name
)
INSERT INTO public.assessment_questions (section_id, question_number, level, question_text, passage_text, options, correct_answer, explanation)
SELECT s.id, q.qn, q.lvl, q.qt, q.pt, q.opts::jsonb, q.ca, q.expl
FROM s
JOIN (VALUES
  -- English 6-8 Grammar
  ('english','6-8','Grammar & Punctuation',1,1,'Which sentence uses the apostrophe correctly?',NULL,'[{"key":"a","text":"The dogs bone is buried."},{"key":"b","text":"The dog''s bone is buried."},{"key":"c","text":"The dogs'' bone is buried."},{"key":"d","text":"The dog''s'' bone is buried."},{"key":"e","text":"The dogs bone''s buried."}]','b','Singular possessive uses '' before the s.'),
  ('english','6-8','Grammar & Punctuation',2,1,'Choose the correct verb: She ___ to school every day.',NULL,'[{"key":"a","text":"walk"},{"key":"b","text":"walking"},{"key":"c","text":"walks"},{"key":"d","text":"walked yesterday"},{"key":"e","text":"have walked"}]','c','Third-person singular present uses walks.'),
  ('english','6-8','Grammar & Punctuation',3,2,'Identify the adverb: The children ran quickly to the park.',NULL,'[{"key":"a","text":"children"},{"key":"b","text":"ran"},{"key":"c","text":"quickly"},{"key":"d","text":"park"},{"key":"e","text":"to"}]','c','Adverb modifies the verb ran.'),
  -- English 6-8 Reading (shared passage)
  ('english','6-8','Reading Comprehension',1,1,'What is the main idea of the passage?','Lena watched the rain stream down the window. She had been waiting all morning for the storm to pass so she could finally ride her new bicycle. As the clouds thinned, a thin band of sunlight cut across the wet street.','[{"key":"a","text":"Lena dislikes the rain"},{"key":"b","text":"Lena is eager to ride her bike"},{"key":"c","text":"Lena is reading a book"},{"key":"d","text":"Lena is afraid of storms"},{"key":"e","text":"Lena lives near a park"}]','b','Text emphasises waiting to ride the new bike.'),
  ('english','6-8','Reading Comprehension',2,2,'What does ''thinned'' most likely mean in context?','Lena watched the rain stream down the window. She had been waiting all morning for the storm to pass so she could finally ride her new bicycle. As the clouds thinned, a thin band of sunlight cut across the wet street.','[{"key":"a","text":"darkened"},{"key":"b","text":"became less dense"},{"key":"c","text":"disappeared completely"},{"key":"d","text":"grew larger"},{"key":"e","text":"rained harder"}]','b','Sunlight appearing implies clouds breaking up.'),
  -- English 8-10
  ('english','8-10','Grammar & Punctuation',1,1,'Choose the sentence with correct subject-verb agreement.',NULL,'[{"key":"a","text":"Neither of the boys are coming."},{"key":"b","text":"Neither of the boys is coming."},{"key":"c","text":"Neither of the boy are coming."},{"key":"d","text":"Neither the boys are coming."},{"key":"e","text":"Neither the boy is coming."}]','b','''Neither'' takes a singular verb.'),
  ('english','8-10','Grammar & Punctuation',2,2,'Which word is a conjunction?',NULL,'[{"key":"a","text":"quickly"},{"key":"b","text":"although"},{"key":"c","text":"happiness"},{"key":"d","text":"beautiful"},{"key":"e","text":"running"}]','b','''Although'' joins clauses.'),
  ('english','8-10','Reading Comprehension',1,2,'The author''s tone in the passage is best described as:','The ancient library stood silent in the afternoon haze, its shelves heavy with forgotten knowledge. No visitor had crossed its threshold in years, yet a faint scent of paper and dust suggested something — or someone — still kept watch.','[{"key":"a","text":"cheerful"},{"key":"b","text":"mysterious"},{"key":"c","text":"angry"},{"key":"d","text":"humorous"},{"key":"e","text":"factual"}]','b','Imagery of silence and watch creates mystery.'),
  ('english','8-10','Reading Comprehension',2,3,'What literary device is used in ''shelves heavy with forgotten knowledge''?','The ancient library stood silent in the afternoon haze, its shelves heavy with forgotten knowledge. No visitor had crossed its threshold in years, yet a faint scent of paper and dust suggested something — or someone — still kept watch.','[{"key":"a","text":"simile"},{"key":"b","text":"personification"},{"key":"c","text":"hyperbole"},{"key":"d","text":"onomatopoeia"},{"key":"e","text":"alliteration"}]','b','Knowledge given physical weight personifies it.'),
  -- Maths 6-8
  ('maths','6-8','Number & Algebra',1,1,'What is 3/4 of 80?',NULL,'[{"key":"a","text":"40"},{"key":"b","text":"50"},{"key":"c","text":"60"},{"key":"d","text":"70"},{"key":"e","text":"75"}]','c','80 ÷ 4 × 3 = 60.'),
  ('maths','6-8','Number & Algebra',2,2,'Solve for x: 2x + 5 = 17',NULL,'[{"key":"a","text":"5"},{"key":"b","text":"6"},{"key":"c","text":"7"},{"key":"d","text":"8"},{"key":"e","text":"11"}]','b','2x = 12, x = 6.'),
  ('maths','6-8','Problem Solving',1,2,'A train leaves at 9:15 and arrives at 11:50. Journey duration?',NULL,'[{"key":"a","text":"2h 15m"},{"key":"b","text":"2h 25m"},{"key":"c","text":"2h 35m"},{"key":"d","text":"2h 45m"},{"key":"e","text":"3h 05m"}]','c','9:15 → 11:50 = 2h 35m.'),
  ('maths','6-8','Problem Solving',2,3,'If 5 pencils cost $3.75, what do 8 pencils cost?',NULL,'[{"key":"a","text":"$5.00"},{"key":"b","text":"$5.50"},{"key":"c","text":"$6.00"},{"key":"d","text":"$6.25"},{"key":"e","text":"$6.50"}]','c','3.75/5 = 0.75 × 8 = 6.00.'),
  -- Maths 8-10
  ('maths','8-10','Number & Algebra',1,2,'Simplify: (x²)(x³)',NULL,'[{"key":"a","text":"x^5"},{"key":"b","text":"x^6"},{"key":"c","text":"2x^5"},{"key":"d","text":"x^9"},{"key":"e","text":"x^1"}]','a','Add exponents: 2+3 = 5.'),
  ('maths','8-10','Number & Algebra',2,2,'Solve: 3(x − 2) = 15',NULL,'[{"key":"a","text":"3"},{"key":"b","text":"5"},{"key":"c","text":"7"},{"key":"d","text":"9"},{"key":"e","text":"11"}]','c','x − 2 = 5, x = 7.'),
  ('maths','8-10','Problem Solving',1,3,'Area of a triangle with base 12 and height 8?',NULL,'[{"key":"a","text":"40"},{"key":"b","text":"48"},{"key":"c","text":"56"},{"key":"d","text":"96"},{"key":"e","text":"24"}]','b','½ × 12 × 8 = 48.')
) AS q(subj, yb, sec, qn, lvl, qt, pt, opts, ca, expl)
ON s.subject = q.subj AND s.year_band = q.yb AND s.section_name = q.sec;
