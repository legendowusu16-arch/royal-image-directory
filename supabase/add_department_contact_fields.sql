alter table public.departments
    add column if not exists contact_email text not null default '',
    add column if not exists contact_phone text not null default '';

alter table public.departments
    drop constraint if exists departments_contact_email_length_check,
    drop constraint if exists departments_contact_phone_length_check,
    add constraint departments_contact_email_length_check
        check (char_length(contact_email) <= 254),
    add constraint departments_contact_phone_length_check
        check (char_length(contact_phone) <= 40);
