alter table public.routine_ads
 add column video text not null default ''
 check (length(video) <= 2000 and (video = '' or video ~ '^https://[^[:space:]]+$'));
