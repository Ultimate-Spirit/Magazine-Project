import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

url: str = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
# Prioritize service role key for backend operations if available
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")

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

def get_supabase():
    return supabase
