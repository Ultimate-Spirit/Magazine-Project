import asyncio
import sys
import json
import io
import os
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from playwright.sync_api import sync_playwright
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
    def _generate_sync():
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 794, "height": 1123})
            page = context.new_page()
            
            metrics_html = "".join([f"""
                <div style="background: #f9fafb; padding: 24px; border-radius: 16px; border: 1px solid #f3f4f6; margin-bottom: 24px;">
                    <div style="font-size: 10px; font-weight: 900; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 8px;">{m.get('label', '')}</div>
                    <div style="display: flex; align-items: baseline; gap: 8px;">
                        <div style="font-size: 32px; font-weight: 900; color: #111827;">{m.get('value', '0')}</div>
                        <div style="font-size: 14px; font-weight: 700; color: {'#059669' if float(m.get('percentage', 0)) >= 0 else '#dc2626'};">
                            {'+' if float(m.get('percentage', 0)) >= 0 else ''}{m.get('percentage', 0)}%
                        </div>
                    </div>
                </div>
            """ for m in data.get('metrics', [])])

            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        background: white;
                    }}
                    .page {{
                        width: 210mm;
                        min-height: 297mm;
                        padding: 20mm;
                        margin: 0 auto;
                        box-sizing: border-box;
                        position: relative;
                        display: flex;
                        flex-direction: column;
                    }}
                    .header {{
                        border-bottom: 4px solid #111827;
                        padding-bottom: 48px;
                        margin-bottom: 48px;
                    }}
                    .headline {{
                        font-size: 48px;
                        font-weight: 900;
                        color: #111827;
                        margin: 0;
                        line-height: 1.2;
                    }}
                    .subheadline {{
                        font-size: 20px;
                        font-weight: 700;
                        color: #2563eb;
                        margin: 16px 0 0 0;
                        text-transform: uppercase;
                        letter-spacing: 0.1em;
                    }}
                    .content-grid {{
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 80px;
                        margin-bottom: 48px;
                    }}
                    .section-title {{
                        font-size: 12px;
                        font-weight: 900;
                        color: #9ca3af;
                        text-transform: uppercase;
                        letter-spacing: 0.1em;
                        margin-bottom: 24px;
                    }}
                    .section-text {{
                        font-size: 14px;
                        line-height: 1.6;
                        color: #4b5563;
                        white-space: pre-wrap;
                    }}
                    .footer {{
                        margin-top: auto;
                        padding-top: 32px;
                        border-top: 1px solid #f3f4f6;
                        display: flex;
                        justify-content: space-between;
                        font-size: 10px;
                        font-weight: 700;
                        color: #d1d5db;
                        text-transform: uppercase;
                        letter-spacing: 0.1em;
                    }}
                </style>
            </head>
            <body>
                <div class="page">
                    <div class="header">
                        <div class="headline">{data.get('headline', 'Untitled Report')}</div>
                        <div class="subheadline">{data.get('subheadline', 'EXECUTIVE SUMMARY')}</div>
                    </div>

                    <div class="content-grid">
                        <div>
                            <div class="section-title">Executive Summary</div>
                            <div class="section-text">{data.get('summaryText', '')}</div>
                        </div>
                        <div>
                            <div class="section-title">Key Performance</div>
                            {metrics_html}
                        </div>
                    </div>

                    <div class="content-grid" style="margin-bottom: auto;">
                        <div>
                            <div class="section-title">Strategic Drivers</div>
                            <div class="section-text">{data.get('growthDriversText', '')}</div>
                        </div>
                        <div>
                            <div class="section-title">Future Outlook</div>
                            <div class="section-text">{data.get('outlookText', '')}</div>
                        </div>
                    </div>

                    <div class="footer">
                        <div>{data.get('footerConfidentiality', '')}</div>
                        <div>{data.get('footerDate', '')}</div>
                    </div>
                </div>
            </body>
            </html>
            """
            
            page.set_content(html_content)
            page.wait_for_timeout(500)
            
            pdf_bytes = page.pdf(
                format="A4",
                print_background=True,
                margin={"top": "0px", "right": "0px", "bottom": "0px", "left": "0px"},
                display_header_footer=False,
                scale=1.0
            )
            
            browser.close()
            return pdf_bytes

    try:
        from concurrent.futures import ThreadPoolExecutor
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as executor:
            pdf_bytes = await loop.run_in_executor(executor, _generate_sync)
            
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={data.get('title', 'report')}.pdf"}
        )
    except Exception as e:
        print(f"Error generating PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")

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
