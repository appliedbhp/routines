alter table public.routine_ads
 add column image text not null default '' check(length(image)<=700000 and (image='' or (length(image)<=2000 and image ~ '^https://[^[:space:]]+$') or image ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$')),
 add column image_alt text not null default '' check(length(image_alt)<=200);
