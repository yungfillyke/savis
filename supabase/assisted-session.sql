-- Secure developer assisted-session activation.
create or replace function public.activate_developer_assisted_session(p_session_id uuid)
returns public.developer_assisted_sessions language plpgsql security definer set search_path=public as $$
declare r public.developer_assisted_sessions;
begin
 if not public.is_developer_admin() then raise exception 'developer access required'; end if;
 update public.developer_assisted_sessions set status='active' where id=p_session_id and developer_id=auth.uid() and status='prepared' and expires_at>now() returning * into r;
 if not found then raise exception 'assisted session is missing, expired, or already used'; end if;
 perform public.write_developer_audit('assisted_session.activate',jsonb_build_object('session_id',r.id,'target_user_id',r.target_user_id,'target_role',r.target_role,'expires_at',r.expires_at));
 return r;
end $$;
grant execute on function public.activate_developer_assisted_session(uuid) to authenticated;

create or replace function public.expire_developer_assisted_sessions() returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if not public.is_developer_admin() then raise exception 'developer access required'; end if;
 update public.developer_assisted_sessions set status='expired',ended_at=coalesce(ended_at,now()) where developer_id=auth.uid() and status in ('prepared','active') and expires_at<=now();
 get diagnostics n = row_count; return n;
end $$;
grant execute on function public.expire_developer_assisted_sessions() to authenticated;