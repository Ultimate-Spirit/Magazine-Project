import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

url: str = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")
service_role_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if url:
    # Clean the URL if it contains the rest/v1 suffix
    url = url.split("/rest/v1")[0]

if not url or not key:
    print("Warning: Supabase credentials not found in environment variables.")

supabase: Client = None
if url and key:
    try:
        supabase = create_client(url, key)
    except Exception as e:
        print(f"Error: Failed to create Supabase client: {e}")

supabase_admin: Client = None
if url and service_role_key:
    try:
        supabase_admin = create_client(url, service_role_key)
    except Exception as e:
        print(f"Error: Failed to create Supabase admin client: {e}")

def get_supabase():
    return supabase

def get_supabase_admin():
    return supabase_admin
