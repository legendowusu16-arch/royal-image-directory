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
