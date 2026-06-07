from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ArticleBase(BaseModel):
    title: str
    author: str
    content: str
    status: str = "draft"

class ArticleCreate(ArticleBase):
    pass

class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None

class Article(ArticleBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
