-- A-3 · Core production tables (spec §9.1).
-- Row-level security is enabled on every table and no policies are created here: until A-4/A-5 add them,
-- nothing is readable or writable through the API.
-- Allowed codes must equal data/majors.json, data/academic-levels.json and data/departments.json (A-8 test).
-- Codes are append-only after launch.

-- updated_at trigger ------------------------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- profiles ----------------------------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name_ar text not null check (char_length(full_name_ar) between 2 and 100),
  major_code text not null check (major_code in (
    'EE', 'ME', 'AE', 'CE', 'IE', 'CIE', 'MATE', 'CHE', 'MARE', 'CIVE', 'PHYS', 'CHEM', 'MATH',
    'STAT', 'CS', 'SWE', 'SEC', 'AIDS', 'IS', 'BA', 'SCM', 'FIN', 'ACC', 'ECON', 'HR', 'LAW', 'IRPS', 'TRANS', 'OTHER'
  )),
  major_other text,
  academic_level_code text not null check (academic_level_code in ('BACHELOR', 'MASTER', 'PHD')),
  gender text not null check (gender in ('male', 'female')),
  announcements_opt_in boolean not null default false,
  announcements_updated_at timestamptz not null default now(),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- "major_other is not null" is needed: without it, OTHER + null evaluates to null, and a null check passes.
  constraint profiles_major_other_chk check (
    (major_code = 'OTHER' and major_other is not null and char_length(trim(major_other)) between 2 and 80)
    or (major_code <> 'OTHER' and major_other is null)
  )
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- events ------------------------------------------------------------------------------------------------------

create table public.events (
  id bigint generated always as identity primary key,
  title text not null,
  description text not null,
  department_code text check (department_code in (
    'SECTOR_AWARENESS', 'CAREER_READINESS', 'SYSTEMS_INTEGRATION',
    'CYBERSECURITY', 'MANUFACTURING_DESIGN', 'DATA_ANALYSIS'
  )),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  format text not null check (format in ('in_person', 'online')),
  location text,
  presenter text,
  capacity int check (capacity > 0),
  registration_closes_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled')),
  image_url text,
  recording_url text,
  announcement_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (format <> 'in_person' or location is not null)
);

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- event_private (meeting links; admin only from A-4) ----------------------------------------------------------

create table public.event_private (
  event_id bigint primary key references public.events on delete cascade,
  meeting_url text not null
);

-- registrations -----------------------------------------------------------------------------------------------
-- registration_version goes up by 1 each time a cancelled row is reused (D2-9, D2-10); cancel links carry it.

create table public.registrations (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  status text not null check (status in ('registered', 'waitlisted', 'cancelled')),
  waitlisted_at timestamptz,
  promoted_at timestamptz,
  registration_version int not null default 1,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  unique (event_id, user_id)
);

create index registrations_event_id_status_idx on public.registrations (event_id, status);

-- signups -----------------------------------------------------------------------------------------------------

create table public.signups (
  id bigint generated always as identity primary key,
  email text not null,
  source text not null check (source in ('teaser', 'footer', 'import')),
  created_at timestamptz not null default now()
);

create unique index signups_email_normalized_key on public.signups ((lower(trim(email))));

-- email_unsubscribes ------------------------------------------------------------------------------------------
-- Every writer stores the normalized email; the check makes a raw value impossible.

create table public.email_unsubscribes (
  email text primary key check (email = lower(trim(email))),
  source text not null check (source in ('link', 'header', 'profile', 'bounce', 'complaint')),
  created_at timestamptz not null default now()
);

-- email_deliveries (outbox) -----------------------------------------------------------------------------------

create table public.email_deliveries (
  id bigint generated always as identity primary key,
  event_id bigint references public.events on delete set null,
  registration_id bigint references public.registrations on delete set null,
  kind text not null check (kind in (
    'announcement', 'confirmation', 'promoted', 'waitlist_joined',
    'cancel_confirmation', 'event_cancelled', 'event_changed'
  )),
  email text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  batch_key text,
  error text,
  created_at timestamptz not null default now(),
  attempted_at timestamptz
);

create index email_deliveries_status_created_at_idx on public.email_deliveries (status, created_at);
create index email_deliveries_event_id_kind_status_idx on public.email_deliveries (event_id, kind, status);

-- talent_submission_log (no answers; the answers live only in hisn-talent) -----------------------------------

create table public.talent_submission_log (
  user_id uuid primary key references public.profiles on delete cascade,
  submitted_at timestamptz,
  withdrawn_at timestamptz
);

-- Row-level security ------------------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_private enable row level security;
alter table public.registrations enable row level security;
alter table public.signups enable row level security;
alter table public.email_unsubscribes enable row level security;
alter table public.email_deliveries enable row level security;
alter table public.talent_submission_log enable row level security;
