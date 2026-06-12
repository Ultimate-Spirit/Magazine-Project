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
from database import get_supabase
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

@app.post("/create-user", dependencies=[Depends(get_current_user)])
async def create_user(data: dict):
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    email = data.get("email")
    password = data.get("password")
    full_name = data.get("full_name")
    role = data.get("role", "viewer")
    company_id = data.get("company_id")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    try:
        # 1. Create user in Supabase Auth
        user_response = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"full_name": full_name}
        })

        if not user_response.user:
            raise HTTPException(status_code=400, detail="Failed to create user in Auth")

        user_id = user_response.user.id

        # 2. Create profile in public.profiles
        profile_data = {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "role": role,
            "is_active": True,
            "company_id": company_id if company_id else None
        }

        profile_response = supabase.table("profiles").insert(profile_data).execute()
        
        if not profile_response.data:
            # Cleanup: if profile creation fails, we might want to delete the auth user, 
            # but for now we'll just report the error.
            raise HTTPException(status_code=400, detail="User created but profile creation failed")

        return {"message": f"User {email} created successfully", "user": user_response.user, "profile": profile_response.data[0]}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")

@app.post("/update-user", dependencies=[Depends(get_current_user)])
async def update_user(data: dict):
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    target_user_id = data.get("target_user_id")
    email = data.get("email")

    if not target_user_id or not email:
        raise HTTPException(status_code=400, detail="Target user ID and email are required")

    try:
        # Update user in Supabase Auth
        user_response = supabase.auth.admin.update_user_by_id(
            target_user_id,
            {"email": email}
        )

        if not user_response.user:
            raise HTTPException(status_code=400, detail="Failed to update user in Auth")

        return {"message": f"User {email} updated successfully", "user": user_response.user}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user: {str(e)}")

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
