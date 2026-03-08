UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"is_admin": true}'
WHERE id = 'user uuid here';   