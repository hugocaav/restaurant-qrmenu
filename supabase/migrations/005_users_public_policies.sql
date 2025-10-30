create policy "Users read own profile"
on public.users_public
for select
using (auth.uid() = id);

create policy "Kitchen updates own profile"
on public.users_public
for update
using (auth.uid() = id);
