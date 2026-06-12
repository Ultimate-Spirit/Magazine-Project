import asyncio
import sys
import json
import io
import os
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fpdf import FPDF
from dotenv import load_dotenv
from database import get_supabase, get_supabase_admin
import schemas
from typing import Optional

# Load environment variables
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    try:
        token = authorization.replace("Bearer ", "")
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return user_response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Hello from the Python backend!"}

@app.get("/db-check")
async def db_check():
    supabase = get_supabase()
    if not supabase:
        return {"status": "error", "message": "Supabase client not initialized. Check .env file."}
    
    try:
        return {"status": "success", "message": "Supabase client is initialized."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def safe_extract(df, row, col, default=""):
    try:
        val = df.iloc[row, col]
        return str(val) if pd.notna(val) else default
    except Exception:
        return default

@app.post("/upload-excel", dependencies=[Depends(get_current_user)])
async def upload_excel(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an Excel file.")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents), header=None)
        
        data = {
            "companyName": safe_extract(df, 1, 1, "N/A"),
            "reportType": safe_extract(df, 2, 1, "N/A"),
            "title": safe_extract(df, 3, 1, "N/A"),
            "refId": safe_extract(df, 4, 1, "N/A"),
            "summaryText": safe_extract(df, 6, 1, ""),
            "growthDriversText": safe_extract(df, 7, 1, ""),
            "outlookText": safe_extract(df, 8, 1, ""),
            "footerConfidentiality": safe_extract(df, 10, 1, ""),
            "footerDate": safe_extract(df, 11, 1, ""),
            "metrics": [
                {
                    "label": safe_extract(df, 13, 1, "Metric 1"),
                    "value": safe_extract(df, 13, 2, "0"),
                    "percentage": int(float(safe_extract(df, 13, 3, "0")))
                },
                {
                    "label": safe_extract(df, 14, 1, "Metric 2"),
                    "value": safe_extract(df, 14, 2, "0"),
                    "percentage": int(float(safe_extract(df, 14, 3, "0")))
                }
            ]
        }
        
        return {"filename": file.filename, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing Excel file: {str(e)}")

@app.post("/generate-pdf", dependencies=[Depends(get_current_user)])
async def generate_pdf(data: dict):
    try:
        print(f"PDF GENERATION START: {data.get('title', 'Untitled')}")
        pdf = FPDF(orientation="P", unit="mm", format="A4")
        pdf.add_page()
        
        # Set margin
        margin = 20
        page_width = 210 - (2 * margin)
        
        # Header
        pdf.set_font("Helvetica", "B", 24)
        pdf.set_text_color(17, 24, 39) # #111827
        pdf.cell(page_width, 15, data.get('headline', 'Untitled Report'), ln=True)
        
        pdf.set_font("Helvetica", "B", 14)
        pdf.set_text_color(37, 99, 235) # #2563EB
        pdf.cell(page_width, 10, data.get('subheadline', 'EXECUTIVE SUMMARY'), ln=True)
        
        pdf.ln(10)
        pdf.set_draw_color(17, 24, 39)
        pdf.set_line_width(1)
        pdf.line(margin, pdf.get_y(), margin + page_width, pdf.get_y())
        pdf.ln(15)
        
        # Two column layout start
        y_start = pdf.get_y()
        col_width = (page_width - 15) / 2
        
        # Left Column: Executive Summary
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(156, 163, 175) # #9CA3AF
        pdf.cell(col_width, 5, "EXECUTIVE SUMMARY", ln=True)
        pdf.ln(5)
        
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(75, 85, 99) # #4B5563
        pdf.multi_cell(col_width, 6, data.get('summaryText', ''))
        
        y_left_end = pdf.get_y()
        
        # Right Column: Key Performance
        pdf.set_xy(margin + col_width + 15, y_start)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(156, 163, 175)
        pdf.cell(col_width, 5, "KEY PERFORMANCE", ln=True)
        pdf.ln(5)
        
        current_y = pdf.get_y()
        for metric in data.get('metrics', []):
            pdf.set_xy(margin + col_width + 15, current_y)
            # Metric Box
            pdf.set_fill_color(249, 250, 251)
            pdf.set_draw_color(243, 244, 246)
            pdf.rect(margin + col_width + 15, current_y, col_width, 25, "DF")
            
            pdf.set_xy(margin + col_width + 20, current_y + 5)
            pdf.set_font("Helvetica", "B", 7)
            pdf.set_text_color(156, 163, 175)
            pdf.cell(col_width - 10, 3, metric.get('label', '').upper(), ln=True)
            
            pdf.set_xy(margin + col_width + 20, current_y + 10)
            pdf.set_font("Helvetica", "B", 18)
            pdf.set_text_color(17, 24, 39)
            pdf.cell(col_width - 10, 10, str(metric.get('value', '0')), ln=False)
            
            percentage = float(metric.get('percentage', 0))
            pdf.set_font("Helvetica", "B", 10)
            if percentage >= 0:
                pdf.set_text_color(5, 150, 105)
                perf_text = f"+{percentage}%"
            else:
                pdf.set_text_color(220, 38, 38)
                perf_text = f"{percentage}%"
            
            pdf.cell(0, 10, perf_text, align="R", ln=True)
            current_y += 30

        y_right_end = current_y
        
        # Move to next section
        final_y = max(y_left_end, y_right_end) + 15
        pdf.set_xy(margin, final_y)
        
        # Strategic Drivers & Future Outlook
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(156, 163, 175)
        pdf.cell(col_width, 5, "STRATEGIC DRIVERS")
        pdf.set_xy(margin + col_width + 15, final_y)
        pdf.cell(col_width, 5, "FUTURE OUTLOOK", ln=True)
        pdf.ln(5)
        
        y_next = pdf.get_y()
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(75, 85, 99)
        pdf.set_xy(margin, y_next)
        pdf.multi_cell(col_width, 6, data.get('growthDriversText', ''))
        
        pdf.set_xy(margin + col_width + 15, y_next)
        pdf.multi_cell(col_width, 6, data.get('outlookText', ''))
        
        # Footer
        pdf.set_y(-25)
        pdf.set_draw_color(243, 244, 246)
        pdf.line(margin, pdf.get_y(), margin + page_width, pdf.get_y())
        pdf.ln(5)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(209, 213, 219)
        pdf.cell(col_width, 5, data.get('footerConfidentiality', '').upper())
        pdf.set_xy(margin + col_width + 15, pdf.get_y())
        pdf.cell(col_width, 5, data.get('footerDate', '').upper(), align="R")
        
        pdf_bytes = bytes(pdf.output())
        print("PDF GENERATION SUCCESS")
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={data.get('title', 'report')}.pdf"}
        )
    except Exception as e:
        print(f"PDF GENERATION CRASH: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PDF Generation Error: {str(e)}")

class UserCreateRequest(schemas.BaseModel):
    email: str
    password: str
    full_name: str

@app.post("/create-user", dependencies=[Depends(get_current_user)])
async def create_user_admin(request: UserCreateRequest):
    supabase_admin = get_supabase_admin()
    if not supabase_admin:
        raise HTTPException(status_code=500, detail="Admin client not initialized for provisioning.")
    
    try:
        # Create user with auto-confirmed email via Admin API
        user_response = supabase_admin.auth.admin.create_user({
            "email": request.email,
            "password": request.password,
            "email_confirm": True,
            "user_metadata": {"full_name": request.full_name}
        })
        
        # Verify the user object exists
        user = getattr(user_response, 'user', user_response)
        
        # Inject full_name and ensure active status into profile directly using admin client (bypasses RLS)
        if user and hasattr(user, 'id'):
            # Allow trigger time to execute, then update
            import time
            time.sleep(1)
            supabase_admin.table("profiles").update({
                "full_name": request.full_name,
                "is_active": True
            }).eq("id", user.id).execute()

        return {"message": "Account provisioned successfully", "user_id": str(user.id) if hasattr(user, 'id') else None}
    except Exception as e:
        print(f"PROVISIONING ERROR: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

from datetime import datetime, timedelta, timezone

from fastapi.responses import JSONResponse

@app.get("/version")
async def get_version():
    return {"version": "1.1.0-hardened", "status": "active"}

from concurrent.futures import ThreadPoolExecutor

@app.get("/admin-stats", dependencies=[Depends(get_current_user)])
async def get_admin_stats():
    supabase_admin = get_supabase_admin()
    if not supabase_admin:
        print("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing in backend environment.")
        raise HTTPException(status_code=500, detail="Admin client not initialized for stats.")

    def fetch_count(table, filters=None):
        try:
            query = supabase_admin.table(table).select('id', count='exact', head=True)
            if filters:
                for k, v in filters.items():
                    query = query.eq(k, v)
            res = query.execute()
            return res.count if res.count is not None else 0
        except Exception as e:
            err_msg = f"ERR: {str(e)}"
            print(f"DATABASE ERROR ({table}): {err_msg}")
            return err_msg

    def fetch_recent_updates():
        try:
            last_24h = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
            res = supabase_admin.table('activity_logs').select('id', count='exact', head=True).gte('created_at', last_24h).execute()
            return res.count if res.count is not None else 0
        except Exception as e:
            err_msg = f"ERR: {str(e)}"
            print(f"DATABASE ERROR (activity_logs): {err_msg}")
            return err_msg

    def fetch_auth_stats():
        stats = {"pending": 0, "active": 0, "error": None}
        try:
            users_res = supabase_admin.auth.admin.list_users()
            auth_users = getattr(users_res, 'users', users_res) if not isinstance(users_res, list) else users_res
            last_12h = datetime.now(timezone.utc) - timedelta(hours=12)
            for u in auth_users:
                if not hasattr(u, 'last_sign_in_at') or not u.last_sign_in_at:
                    stats["pending"] += 1
                else:
                    sign_in_time = u.last_sign_in_at
                    if isinstance(sign_in_time, str):
                        try:
                            sign_in_time = datetime.fromisoformat(sign_in_time.replace('Z', '+00:00'))
                        except: continue
                    if isinstance(sign_in_time, datetime):
                        if sign_in_time.tzinfo is None:
                            sign_in_time = sign_in_time.replace(tzinfo=timezone.utc)
                        if sign_in_time >= last_12h:
                            stats["active"] += 1
        except Exception as e:
            stats["error"] = f"ERR: {str(e)}"
            print(f"AUTH ERROR: {stats['error']}")
        return stats

    # Run queries in parallel to slash loading time
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        tasks = [
            loop.run_in_executor(pool, fetch_count, 'profiles'),
            loop.run_in_executor(pool, fetch_count, 'profiles', {'is_active': True}),
            loop.run_in_executor(pool, fetch_count, 'companies'),
            loop.run_in_executor(pool, fetch_count, 'pages'),
            loop.run_in_executor(pool, fetch_recent_updates),
            loop.run_in_executor(pool, fetch_auth_stats)
        ]
        results = await asyncio.gather(*tasks)

    payload = {
        "total_users": results[0],
        "active_accounts": results[1],
        "active_workspaces": results[2],
        "published_pages": results[3],
        "recent_updates": results[4],
        "pending_invites": results[5]["error"] if results[5]["error"] else results[5]["pending"],
        "active_sessions": results[5]["error"] if results[5]["error"] else results[5]["active"]
    }

    return JSONResponse(
        content=payload,
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        }
    )



@app.get("/list-users-unified", dependencies=[Depends(get_current_user)])
async def list_users_unified():
    supabase = get_supabase()
    supabase_admin = get_supabase_admin()
    
    # 1. PRIMARY FETCH: Secure core user data first
    profiles = []
    try:
        # Try with roles join first
        profiles_res = supabase.table("profiles").select("*, roles(*)").execute()
        profiles = profiles_res.data or []
    except Exception as e:
        print(f"ROLES JOIN FAILED (Falling back to simple profiles): {str(e)}")
        try:
            # Fallback to simple profiles if roles table is missing or join fails
            profiles_res = supabase.table("profiles").select("*").execute()
            profiles = profiles_res.data or []
        except Exception as e2:
            print(f"CRITICAL FETCH ERROR (Profiles): {str(e2)}")
            raise HTTPException(status_code=500, detail="Identity registry currently unavailable")

    # 2. SECONDARY FETCH: Retrieve auth metadata (Joined dates)
    auth_map = {}
    if supabase_admin:
        try:
            users_res = supabase_admin.auth.admin.list_users()
            auth_users = getattr(users_res, 'users', users_res) if not isinstance(users_res, list) else users_res
            for u in auth_users:
                if hasattr(u, 'id') and hasattr(u, 'created_at'):
                    auth_map[str(u.id)] = u.created_at.isoformat() if hasattr(u.created_at, 'isoformat') else str(u.created_at)
        except Exception as e:
            print(f"NON-FATAL AUTH FETCH ERROR: {str(e)}")
    
    # 3. UNIFICATION
    for p in profiles:
        user_id = str(p.get("id", ""))
        p["created_at"] = auth_map.get(user_id)
        
    return profiles

# Articles Endpoints (Legacy)

@app.get("/articles", response_model=list[schemas.Article], dependencies=[Depends(get_current_user)])
async def get_articles():
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    response = supabase.table("articles").select("*").execute()
    return response.data

@app.get("/articles/{article_id}", response_model=schemas.Article, dependencies=[Depends(get_current_user)])
async def get_article(article_id: int):
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    response = supabase.table("articles").select("*").eq("id", article_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Article not found")
    return response.data[0]

@app.post("/articles", response_model=schemas.Article, dependencies=[Depends(get_current_user)])
async def create_article(article: schemas.ArticleCreate):
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    response = supabase.table("articles").insert(article.model_dump()).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create article")
    return response.data[0]

@app.put("/articles/{article_id}", response_model=schemas.Article, dependencies=[Depends(get_current_user)])
async def update_article(article_id: int, article: schemas.ArticleUpdate):
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    update_data = {k: v for k, v in article.model_dump().items() if v is not None}
    
    response = supabase.table("articles").update(update_data).eq("id", article_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Article not found or update failed")
    return response.data[0]

@app.delete("/articles/{article_id}", dependencies=[Depends(get_current_user)])
async def delete_article(article_id: int):
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    response = supabase.table("articles").delete().eq("id", article_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Article not found or delete failed")
    return {"message": "Article deleted successfully"}
