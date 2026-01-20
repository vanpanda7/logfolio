from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import extract
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import os
import uuid
from pathlib import Path

from database import get_db
from models import Item, ItemImage, Category

router = APIRouter(prefix="/api/items", tags=["items"])

# 确保上传目录存在
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "static/uploads")
Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


class ItemImageResponse(BaseModel):
    id: int
    image_url: str
    upload_time: str
    
    class Config:
        from_attributes = True


class ItemResponse(BaseModel):
    id: int
    title: str
    finish_time: str
    notes: Optional[str]
    category_id: int
    category_name: str
    created_at: str
    images: List[ItemImageResponse]
    
    class Config:
        from_attributes = True


class ItemStatistics(BaseModel):
    total: int
    by_category: dict
    by_month: dict


@router.post("/", response_model=ItemResponse)
async def create_item(
    title: str = Form(...),
    finish_time: str = Form(...),
    category_id: int = Form(...),
    notes: Optional[str] = Form(None),
    files: List[UploadFile] = File([]),
    db: Session = Depends(get_db)
):
    """创建记录（含图片上传）"""
    # 验证分类是否存在
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="分类不存在")
    
    # 解析完成时间（datetime-local 格式：YYYY-MM-DDTHH:MM）
    try:
        # 如果包含时区信息，使用 fromisoformat；否则直接解析
        if 'T' in finish_time:
            if finish_time.endswith('Z'):
                finish_datetime = datetime.fromisoformat(finish_time.replace('Z', '+00:00'))
            elif '+' in finish_time or finish_time.count('-') > 2:
                finish_datetime = datetime.fromisoformat(finish_time)
            else:
                # 本地时间格式，直接解析
                finish_datetime = datetime.fromisoformat(finish_time)
        else:
            raise ValueError("时间格式不正确")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"完成时间格式错误: {str(e)}")
    
    # 创建记录
    db_item = Item(
        title=title,
        finish_time=finish_datetime,
        category_id=category_id,
        notes=notes
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    # 处理图片上传
    saved_images = []
    for file in files:
        if file.filename:
            # 生成唯一文件名
            file_ext = Path(file.filename).suffix
            unique_filename = f"{uuid.uuid4()}{file_ext}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)
            
            # 保存文件
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            # 保存图片记录（使用相对路径，便于前端访问）
            image_url = f"/static/uploads/{unique_filename}"
            db_image = ItemImage(item_id=db_item.id, image_url=image_url)
            db.add(db_image)
            saved_images.append(db_image)
    
    db.commit()
    
    # 返回完整记录
    db.refresh(db_item)
    return {
        "id": db_item.id,
        "title": db_item.title,
        "finish_time": db_item.finish_time.isoformat(),
        "notes": db_item.notes,
        "category_id": db_item.category_id,
        "category_name": category.name,
        "created_at": db_item.created_at.isoformat(),
        "images": [
            {
                "id": img.id,
                "image_url": img.image_url,
                "upload_time": img.upload_time.isoformat()
            }
            for img in saved_images
        ]
    }


@router.get("/", response_model=List[ItemResponse])
def get_items(
    category_id: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """获取所有记录（支持按分类、年份筛选，按完成时间排序）"""
    query = db.query(Item)
    
    # 筛选条件
    if category_id:
        query = query.filter(Item.category_id == category_id)
    
    if year:
        query = query.filter(extract('year', Item.finish_time) == year)
    
    # 按完成时间倒序排列
    items = query.order_by(Item.finish_time.desc()).all()
    
    # 构建响应
    result = []
    for item in items:
        result.append({
            "id": item.id,
            "title": item.title,
            "finish_time": item.finish_time.isoformat(),
            "notes": item.notes,
            "category_id": item.category_id,
            "category_name": item.category.name,
            "created_at": item.created_at.isoformat(),
            "images": [
                {
                    "id": img.id,
                    "image_url": img.image_url,
                    "upload_time": img.upload_time.isoformat()
                }
                for img in item.images
            ]
        })
    
    return result


@router.get("/{item_id}", response_model=ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    """获取单条记录详情"""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    
    return {
        "id": item.id,
        "title": item.title,
        "finish_time": item.finish_time.isoformat(),
        "notes": item.notes,
        "category_id": item.category_id,
        "category_name": item.category.name,
        "created_at": item.created_at.isoformat(),
        "images": [
            {
                "id": img.id,
                "image_url": img.image_url,
                "upload_time": img.upload_time.isoformat()
            }
            for img in item.images
        ]
    }


@router.delete("/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    """删除记录（同步删除服务器上的图片文件）"""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    
    # 删除图片文件
    for image in item.images:
        file_path = image.image_url.replace("/static/uploads/", UPLOAD_DIR + "/")
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"删除图片文件失败: {e}")
    
    # 删除记录（级联删除图片记录）
    db.delete(item)
    db.commit()
    return {"message": "记录删除成功"}


@router.get("/statistics/year/{year}", response_model=ItemStatistics)
def get_year_statistics(year: int, db: Session = Depends(get_db)):
    """获取指定年份的统计数据"""
    items = db.query(Item).filter(extract('year', Item.finish_time) == year).all()
    
    # 按分类统计
    by_category = {}
    # 按月份统计
    by_month = {str(i): 0 for i in range(1, 13)}
    
    for item in items:
        # 分类统计
        cat_name = item.category.name
        by_category[cat_name] = by_category.get(cat_name, 0) + 1
        
        # 月份统计
        month = item.finish_time.month
        by_month[str(month)] = by_month.get(str(month), 0) + 1
    
    return {
        "total": len(items),
        "by_category": by_category,
        "by_month": by_month
    }
