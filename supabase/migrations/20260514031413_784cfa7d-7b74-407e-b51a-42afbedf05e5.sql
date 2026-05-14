
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists parent_email text;
alter table public.profiles add column if not exists current_school_name text;
alter table public.profiles add column if not exists current_school_type text;
alter table public.profiles add column if not exists is_indigenous boolean default false;
alter table public.profiles add column if not exists is_rural boolean default false;
alter table public.profiles add column if not exists faith_background text;
alter table public.profiles add column if not exists preferred_sectors text[] default '{}';
alter table public.profiles add column if not exists willing_to_board text;
alter table public.profiles add column if not exists max_travel_km int default 999;
alter table public.profiles add column if not exists has_sibling_enrolled boolean default false;
alter table public.profiles add column if not exists target_start_year int;
alter table public.profiles add column if not exists applying_year_level int;
alter table public.profiles add column if not exists dream_schools text;
alter table public.profiles add column if not exists onboarding_completed boolean default false;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_gender_chk') then
    alter table public.profiles add constraint profiles_gender_chk
      check (gender is null or gender in ('male','female','non_binary','prefer_not_to_say'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_school_type_chk') then
    alter table public.profiles add constraint profiles_school_type_chk
      check (current_school_type is null or current_school_type in ('government','catholic','independent','other'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_board_chk') then
    alter table public.profiles add constraint profiles_board_chk
      check (willing_to_board is null or willing_to_board in ('day_only','boarding_only','either'));
  end if;
end $$;
