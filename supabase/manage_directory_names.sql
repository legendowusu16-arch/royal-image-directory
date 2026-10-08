grant delete on public.departments, public.staff, public.department_members to authenticated;

drop policy if exists "Admins can delete departments" on public.departments;
create policy "Admins can delete departments"
    on public.departments for delete to authenticated
    using ((select public.is_admin()));

drop policy if exists "Admins can update staff" on public.staff;
create policy "Admins can update staff"
    on public.staff for update to authenticated
    using ((select public.is_admin()))
    with check ((select public.is_admin()));

drop policy if exists "Admins can delete staff" on public.staff;
create policy "Admins can delete staff"
    on public.staff for delete to authenticated
    using ((select public.is_admin()));

drop policy if exists "Admins can delete department members" on public.department_members;
create policy "Admins can delete department members"
    on public.department_members for delete to authenticated
    using ((select public.is_admin()));

create or replace function public.set_department_manager(
    p_department_id bigint,
    p_manager_name text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
    manager_member_id bigint;
begin
    if not (select public.is_admin()) then
        raise exception 'Administrator access required';
    end if;

    if p_manager_name is null or char_length(trim(p_manager_name)) > 150 then
        raise exception 'Manager name must not exceed 150 characters';
    end if;

    update public.departments
    set manager_name = trim(p_manager_name)
    where id = p_department_id;

    if not found then
        raise exception 'Department not found';
    end if;

    select id
    into manager_member_id
    from public.department_members
    where department_id = p_department_id and role = 'Manager'
    order by id
    limit 1;

    if manager_member_id is null then
        if trim(p_manager_name) <> '' then
            insert into public.department_members (department_id, name, role)
            values (p_department_id, trim(p_manager_name), 'Manager');
        end if;
    elsif trim(p_manager_name) = '' then
        delete from public.department_members
        where department_id = p_department_id and role = 'Manager';
    else
        update public.department_members
        set name = trim(p_manager_name)
        where id = manager_member_id;
    end if;
end;
$$;

revoke all on function public.set_department_manager(bigint, text) from public, anon;
grant execute on function public.set_department_manager(bigint, text) to authenticated;
