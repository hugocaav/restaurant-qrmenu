create extension if not exists "pgcrypto";

create or replace function public.ensure_table_session(
  p_table_id uuid,
  p_restaurant_id uuid,
  p_duration_ms bigint,
  p_threshold_ms bigint
)
returns table(session_token text, session_expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_token text := gen_random_uuid()::text;
  v_duration interval := make_interval(secs => p_duration_ms / 1000.0);
  v_threshold interval := make_interval(secs => p_threshold_ms / 1000.0);
begin
  return query
  update public.tables as t1
  set session_token = case
        when t1.session_token is null
          or t1.session_expires_at is null
          or t1.session_expires_at < (now() + v_threshold)
          then v_new_token
          else t1.session_token
      end,
      session_expires_at = case
        when t1.session_expires_at is null
          or t1.session_expires_at < (now() + v_threshold)
          then now() + v_duration
          else t1.session_expires_at
      end
  where t1.id = p_table_id
    and t1.restaurant_id = p_restaurant_id
  returning t1.session_token, t1.session_expires_at;
end;
$$;
