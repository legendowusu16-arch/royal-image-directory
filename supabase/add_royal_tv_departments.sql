insert into public.departments (name, position_type, sort_order)
values
    ('HEAD OF IT', 'tv_right', 40),
    ('DIGITAL MARKETER AND BLOGGER', 'tv_left', 40),
    ('ROYAL TV ACCRA MANAGER', 'tv_left', 50)
on conflict (name) do nothing;
