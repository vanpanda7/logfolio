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
from config import UPLOAD_DIR
from deps import get_user_id

router = APIRouter(prefix="/api/items", tags=["items"])
# UPLOAD_DIR 在 config.py 中已经确保创建


def _item_to_response(item):
    return {
        "id": item.id,
        "title": item.title,
        "finish_time": item.finish_time.isoformat() if item.finish_time else None,
        "due_time": item.due_time.isoformat() if item.due_time else None,
        "is_completed": item.is_completed,
        "notes": item.notes,
        "category_id": item.category_id,
        "category_name": item.category.name,
        "created_at": item.created_at.isoformat(),
        "images": [{"id": i.id, "image_url": i.image_url, "upload_time": i.upload_time.isoformat()} for i in item.images],
    }


@router.post("/")
async def create_item(
    title: str = Form(...),
    finish_time: Optional[str] = Form(None),  # 改为可选，用于已完成记录
    due_time: Optional[str] = Form(None),      # 新增：预计完成时间，用于待办
    category_id: int = Form(...),
    notes: Optional[str] = Form(None),
    is_completed: Optional[bool] = Form(False),  # 新增：是否已完成
    files: List[UploadFile] = File([]),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    cat = db.query(Category).filter(Category.id == category_id, Category.user_id == user_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="分类不存在")
    
    # 解析时间
    finish_datetime = None
    if finish_time:
        try:
            finish_datetime = datetime.strptime(finish_time, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="完成日期请用 YYYY-MM-DD")
    
    due_datetime = None
    if due_time:
        try:
            due_datetime = datetime.strptime(due_time, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="预计完成日期请用 YYYY-MM-DD")
    
    # 如果标记为已完成但没有 finish_time，使用当前时间
    if is_completed and not finish_datetime:
        finish_datetime = datetime.utcnow()
    
    item = Item(
        title=title,
        finish_time=finish_datetime,
        due_time=due_datetime,
        category_id=category_id,
        notes=notes,
        is_completed=is_completed,
        user_id=user_id
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    
    for f in files:
        if f.filename:
            ext = Path(f.filename).suffix
            fn = f"{uuid.uuid4()}{ext}"
            path = os.path.join(UPLOAD_DIR, fn)
            with open(path, "wb") as buf:
                buf.write(await f.read())
            img = ItemImage(item_id=item.id, image_url=f"/api/uploads/{fn}")
            db.add(img)
    db.commit()
    db.refresh(item)
    return _item_to_response(item)


@router.get("/todos")
def get_todos(db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    """获取待办列表"""
    # 有截止日期的在前，按时间升序；没有截止日期的按创建时间降序
    # 使用两个查询合并：先查有截止日期的，再查没有截止日期的
    items_with_due = db.query(Item).filter(
        Item.user_id == user_id,
        Item.is_completed == False,
        Item.due_time.isnot(None)
    ).order_by(Item.due_time.asc()).all()
    
    items_without_due = db.query(Item).filter(
        Item.user_id == user_id,
        Item.is_completed == False,
        Item.due_time.is_(None)
    ).order_by(Item.created_at.desc()).all()
    
    # 合并结果：有截止日期的在前，没有截止日期的在后
    return [_item_to_response(i) for i in items_with_due + items_without_due]


@router.put("/{item_id}")
async def update_item(
    item_id: int,
    title: Optional[str] = Form(None),
    finish_time: Optional[str] = Form(None),
    due_time: Optional[str] = Form(None),
    clear_due_time: Optional[str] = Form(None),  # 前端传 "1" 表示清除预计完成时间（FastAPI 会把空表单值转为 None，无法区分「未传」和「传空」）
    category_id: Optional[int] = Form(None),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    """更新记录（支持待办和已完成记录）"""
    item = db.query(Item).filter(Item.id == item_id, Item.user_id == user_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    
    # 更新字段
    if title is not None:
        item.title = title
    if notes is not None:
        item.notes = notes
    if category_id is not None:
        cat = db.query(Category).filter(Category.id == category_id, Category.user_id == user_id).first()
        if not cat:
            raise HTTPException(status_code=404, detail="分类不存在")
        item.category_id = category_id
    
    # 更新时间字段
    if finish_time is not None:
        if finish_time:
            try:
                item.finish_time = datetime.strptime(finish_time, "%Y-%m-%d")
            except ValueError:
                raise HTTPException(status_code=400, detail="完成日期请用 YYYY-MM-DD")
        else:
            item.finish_time = None
    
    # 预计完成时间：显式清除（clear_due_time=1）或传了有效日期才更新（FastAPI 会把空字符串转成 None，无法用 due_time='' 表示清除）
    if clear_due_time in ("1", "true", "yes"):
        item.due_time = None
    elif due_time and due_time.strip():
        try:
            item.due_time = datetime.strptime(due_time.strip(), "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="预计完成日期请用 YYYY-MM-DD")
    
    db.commit()
    db.refresh(item)
    return _item_to_response(item)


@router.put("/{item_id}/complete")
def complete_todo(
    item_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    """完成待办：将待办转为正式记录"""
    item = db.query(Item).filter(Item.id == item_id, Item.user_id == user_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    if item.is_completed:
        raise HTTPException(status_code=400, detail="该任务已完成")
    
    # 标记为已完成，并记录完成时间（使用当前时间）
    item.is_completed = True
    item.finish_time = datetime.utcnow()
    
    db.commit()
    db.refresh(item)
    return _item_to_response(item)


@router.get("/years")
def get_years(db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    from sqlalchemy import distinct
    rows = db.query(distinct(extract("year", Item.finish_time))).filter(
        Item.user_id == user_id,
        Item.is_completed == True,  # 只统计已完成的记录
        Item.finish_time.isnot(None)
    ).order_by(extract("year", Item.finish_time).desc()).all()
    return {"years": [int(r[0]) for r in rows if r[0] is not None]}


@router.get("/")
def get_items(
    category_id: Optional[int] = None,
    year: Optional[int] = None,
    is_completed: Optional[bool] = None,  # 新增：筛选已完成或待办
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    q = db.query(Item).filter(Item.user_id == user_id)
    
    # 默认只返回已完成的记录（保持向后兼容）
    if is_completed is None:
        is_completed = True
    
    q = q.filter(Item.is_completed == is_completed)
    
    if category_id:
        q = q.filter(Item.category_id == category_id)
    if year:
        # 对于已完成的记录，按 finish_time 筛选；对于待办，按 due_time 筛选
        if is_completed:
            q = q.filter(extract("year", Item.finish_time) == year)
        else:
            q = q.filter(extract("year", Item.due_time) == year)
    
    # 按创建时间降序排序，新添加的记录在最上面
    items = q.order_by(Item.created_at.desc()).all()
    return [_item_to_response(i) for i in items]


@router.get("/{item_id}")
def get_item(item_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    item = db.query(Item).filter(Item.id == item_id, Item.user_id == user_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return _item_to_response(item)


@router.delete("/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    item = db.query(Item).filter(Item.id == item_id, Item.user_id == user_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    for img in item.images:
        # 兼容旧路径和新路径
        fp = img.image_url.replace("/api/uploads/", UPLOAD_DIR + "/").replace("/static/uploads/", UPLOAD_DIR + "/")
        if os.path.exists(fp):
            try:
                os.remove(fp)
            except Exception:
                pass
    db.delete(item)
    db.commit()
    return {"message": "记录删除成功"}


@router.post("/{item_id}/images")
async def add_images(
    item_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    item = db.query(Item).filter(Item.id == item_id, Item.user_id == user_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    out = []
    for f in files:
        if f.filename:
            ext = Path(f.filename).suffix
            fn = f"{uuid.uuid4()}{ext}"
            path = os.path.join(UPLOAD_DIR, fn)
            with open(path, "wb") as buf:
                buf.write(await f.read())
            img = ItemImage(item_id=item.id, image_url=f"/api/uploads/{fn}")
            db.add(img)
            out.append(img)
    db.commit()
    for i in out:
        db.refresh(i)
    return [{"id": i.id, "image_url": i.image_url, "upload_time": i.upload_time.isoformat()} for i in out]


@router.delete("/images/{image_id}")
def delete_image(image_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    img = db.query(ItemImage).join(Item).filter(ItemImage.id == image_id, Item.user_id == user_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="图片不存在")
    fp = img.image_url.replace("/static/uploads/", UPLOAD_DIR + "/")
    if os.path.exists(fp):
        try:
            os.remove(fp)
        except Exception:
            pass
    db.delete(img)
    db.commit()
    return {"message": "图片删除成功"}


@router.get("/statistics/year/{year}")
def get_year_statistics(year: int, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    # 只统计已完成的记录
    items = db.query(Item).filter(
        Item.user_id == user_id,
        Item.is_completed == True,
        Item.finish_time.isnot(None),
        extract("year", Item.finish_time) == year
    ).all()
    by_cat = {}
    by_month = {str(i): 0 for i in range(1, 13)}
    for i in items:
        by_cat[i.category.name] = by_cat.get(i.category.name, 0) + 1
        by_month[str(i.finish_time.month)] = by_month.get(str(i.finish_time.month), 0) + 1
    return {"total": len(items), "by_category": by_cat, "by_month": by_month}

@router.get("/annual-gallery/{year}")
def get_annual_gallery(year: int, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    """获取指定年份的所有带图记录，用于酷炫展示"""
    # 联表查询：只选出有图片的记录，并去重（一个item可能有多张图片）
    # 只返回已完成的记录
    items = db.query(Item).join(ItemImage).filter(
        Item.user_id == user_id,
        Item.is_completed == True,
        Item.finish_time.isnot(None),
        extract('year', Item.finish_time) == year
    ).order_by(Item.finish_time.asc()).all() # 按时间正序，像放电影一样展示一年
    
    # 去重并返回（每个item只返回一次，使用第一张图片）
    seen_ids = set()
    result = []
    for item in items:
        if item.id not in seen_ids and item.images:
            seen_ids.add(item.id)
            result.append({
                "id": item.id,
                "title": item.title,
                "image": item.images[0].image_url if item.images else None,
                "date": item.finish_time.strftime("%m-%d"),
                "category": item.category.name,
                "notes": item.notes
            })
    
    return result