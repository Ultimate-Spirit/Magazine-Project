import asyncio
import sys
import json
import io
import os
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from xhtml2pdf import pisa
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
    try:
        # Create metrics HTML
        metrics_html = "".join([f"""
            <div style="background-color: #f9fafb; padding: 15px; border: 1px solid #f3f4f6; margin-bottom: 15px;">
                <div style="font-size: 8pt; font-weight: bold; color: #9ca3af; text-transform: uppercase;">{m.get('label', '')}</div>
                <div style="font-size: 20pt; font-weight: bold; color: #111827;">{m.get('value', '0')}</div>
                <div style="font-size: 10pt; font-weight: bold; color: {'#059669' if float(m.get('percentage', 0)) >= 0 else '#dc2626'};">
                    {'+' if float(m.get('percentage', 0)) >= 0 else ''}{m.get('percentage', 0)}%
                </div>
            </div>
        """ for m in data.get('metrics', [])])

        # HTML content tailored for xhtml2pdf (it prefers older CSS/HTML styles)
        html_content = f"""
        <html>
        <head>
            <style>
                @page {{
                    size: a4 portrait;
                    margin: 2cm;
                }}
                body {{
                    font-family: Helvetica, Arial, sans-serif;
                    font-size: 10pt;
                    color: #4b5563;
                }}
                .header {{
                    border-bottom: 2px solid #111827;
                    padding-bottom: 20px;
                    margin-bottom: 20px;
                }}
                .headline {{
                    font-size: 24pt;
                    font-weight: bold;
                    color: #111827;
                }}
                .subheadline {{
                    font-size: 14pt;
                    color: #2563eb;
                    margin-top: 10px;
                }}
                .content-table {{
                    width: 100%;
                }}
                .section-title {{
                    font-size: 9pt;
                    font-weight: bold;
                    color: #9ca3af;
                    text-transform: uppercase;
                    margin-bottom: 10px;
                }}
                .footer {{
                    margin-top: 20px;
                    border-top: 1px solid #d1d5db;
                    padding-top: 10px;
                    font-size: 8pt;
                    color: #d1d5db;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <div class="headline">{data.get('headline', 'Untitled Report')}</div>
                <div class="subheadline">{data.get('subheadline', 'EXECUTIVE SUMMARY')}</div>
            </div>

            <table class="content-table">
                <tr>
                    <td style="width: 50%; vertical-align: top; padding-right: 20px;">
                        <div class="section-title">Executive Summary</div>
                        <div>{data.get('summaryText', '').replace('\n', '<br/>')}</div>
                    </td>
                    <td style="width: 50%; vertical-align: top;">
                        <div class="section-title">Key Performance</div>
                        {metrics_html}
                    </td>
                </tr>
                <tr>
                    <td style="vertical-align: top; padding-right: 20px; padding-top: 20px;">
                        <div class="section-title">Strategic Drivers</div>
                        <div>{data.get('growthDriversText', '').replace('\n', '<br/>')}</div>
                    </td>
                    <td style="vertical-align: top; padding-top: 20px;">
                        <div class="section-title">Future Outlook</div>
                        <div>{data.get('outlookText', '').replace('\n', '<br/>')}</div>
                    </td>
                </tr>
            </table>

            <div class="footer">
                <table style="width: 100%;">
                    <tr>
                        <td>{data.get('footerConfidentiality', '')}</td>
                        <td style="text-align: right;">{data.get('footerDate', '')}</td>
                    </tr>
                </table>
            </div>
        </body>
        </html>
        """
        
        result = io.BytesIO()
        pisa_status = pisa.CreatePDF(html_content, dest=result)
        
        if pisa_status.err:
            raise HTTPException(status_code=500, detail="Error converting HTML to PDF")
            
        return Response(
            content=result.getvalue(),
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
