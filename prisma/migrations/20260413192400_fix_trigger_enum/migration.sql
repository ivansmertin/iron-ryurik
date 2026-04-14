-- Fix: qualify "UserRole" enum with public schema (search_path is empty)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public."User" (
    id,
    email,
    "fullName",
    role,
    "createdAt",
    "updatedAt"
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public."UserRole", 'client'::public."UserRole"),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;
