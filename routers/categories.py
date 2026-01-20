from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from database import get_db
from models import Category

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
def get_categories(db: Session = Depends(get_db)):
    """获取所有分类列表"""
    categories = db.query(Category).order_by(Category.created_at).all()
    # 手动转换 datetime 为字符串，与 items.py 保持一致
    return [
        {
            "id": cat.id,
            "name": cat.name,
            "user_defined": cat.user_defined,
            "created_at": cat.created_at.isoformat() if cat.created_at else ""
        }
        for cat in categories
    ]


@router.post("/", response_model=CategoryResponse)
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    """创建新的自定义分类"""
    # 检查分类名是否已存在
    existing = db.query(Category).filter(Category.name == category.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"分类 '{category.name}' 已存在")
    
    db_category = Category(name=category.name, user_defined=True)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    # 手动转换 datetime 为字符串
    return {
        "id": db_category.id,
        "name": db_category.name,
        "user_defined": db_category.user_defined,
        "created_at": db_category.created_at.isoformat() if db_category.created_at else ""
    }


@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    """删除分类（仅允许删除用户自定义的分类）"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="分类不存在")
    
    if not category.user_defined:
        raise HTTPException(status_code=403, detail="不能删除系统默认分类")
    
    # 检查是否有记录使用此分类
    if category.items:
        raise HTTPException(status_code=400, detail="该分类下还有记录，无法删除")
    
    db.delete(category)
    db.commit()
    return {"message": "分类删除成功"}
