UPDATE public.user_roles SET role = 'admin'
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin2@demo.edu');
UPDATE public.user_roles SET role = 'teacher'
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'teacher@demo.edu');