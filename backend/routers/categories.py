from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from database import get_db
from models import Category
from deps import get_user_id

router = APIRouter(prefix="/api/categories", tags=["categories"])


class CategoryCreate(BaseModel):
    name: str


class CategoryResponse(BaseModel):
    id: int
    name: str
    user_defined: bool
    created_at: str

    class Config:
        from_attributes = True


@router.get("/", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    cats = db.query(Category).filter(Category.user_id == user_id).order_by(Category.created_at).all()
    return [{"id": c.id, "name": c.name, "user_defined": c.user_defined, "created_at": (c.created_at or "").isoformat()} for c in cats]


@router.post("/", response_model=CategoryResponse)
def create_category(category: CategoryCreate, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    existing = db.query(Category).filter(Category.name == category.name, Category.user_id == user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"分类 '{category.name}' 已存在")
    c = Category(name=category.name, user_defined=True, user_id=user_id)
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "name": c.name, "user_defined": c.user_defined, "created_at": (c.created_at or "").isoformat()}


@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    cat = db.query(Category).filter(Category.id == category_id, Category.user_id == user_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="分类不存在")
    if not cat.user_defined:
        raise HTTPException(status_code=403, detail="不能删除系统默认分类")
    if cat.items:
        raise HTTPException(status_code=400, detail="该分类下还有记录，无法删除")
    db.delete(cat)
    db.commit()
    return {"message": "分类删除成功"}
