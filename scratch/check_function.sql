SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'handle_user_delete' 
AND routine_schema = 'public';
