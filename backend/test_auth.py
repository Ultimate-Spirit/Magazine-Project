from database import get_supabase_admin
import inspect

admin = get_supabase_admin()
if admin:
    print(dir(admin.auth.admin))
    print(inspect.signature(admin.auth.admin.create_user))
