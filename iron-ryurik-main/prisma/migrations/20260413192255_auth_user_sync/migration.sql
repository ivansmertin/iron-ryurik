-- Функция: при создании пользователя в auth.users → вставка в public."User"
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
    COALESCE((NEW.raw_user_meta_data->>'role')::"UserRole", 'client'),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Триггер на INSERT в auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Функция: при удалении пользователя в auth.users → soft delete в public."User"
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public."User"
  SET "deletedAt" = NOW(), "updatedAt" = NOW()
  WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

-- Триггер на DELETE из auth.users
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_delete();
