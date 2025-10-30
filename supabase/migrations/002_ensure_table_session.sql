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
  v_new_token text := uuid_generate_v4()::text;
  v_duration interval := make_interval(secs => p_duration_ms / 1000.0);
  v_threshold interval := make_interval(secs => p_threshold_ms / 1000.0);
begin
  return query
  update public.tables
  set session_token = case
        when session_token is null or session_expires_at is null or session_expires_at < (now() + v_threshold)
          then v_new_token
          else session_token
      end,
      session_expires_at = case
        when session_expires_at is null or session_expires_at < (now() + v_threshold)
          then now() + v_duration
          else session_expires_at
      end
  where id = p_table_id
    and restaurant_id = p_restaurant_id
  returning session_token, session_expires_at;
end;
$$;