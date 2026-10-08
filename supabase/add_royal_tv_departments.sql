insert into public.departments (name, position_type, sort_order)
values
    ('HEAD OF IT', 'tv_left', 40),
    ('DIGITAL MARKETER AND BLOGGER', 'tv_left', 50),
    ('ROYAL TV ACCRA MANAGER', 'tv_left', 60)
on conflict (name) do update
set position_type = excluded.position_type,
    sort_order = excluded.sort_order;
