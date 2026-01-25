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
Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


def _item_to_response(item):
    return {
        "id": item.id,
        "title": item.title,
        "finish_time": item.finish_time.isoformat(),
        "notes": item.notes,
        "category_id": item.category_id,
        "category_name": item.category.name,
        "created_at": item.created_at.isoformat(),
        "images": [{"id": i.id, "image_url": i.image_url, "upload_time": i.upload_time.isoformat()} for i in item.images],
    }


@router.post("/")
async def create_item(
    title: str = Form(...),
    finish_time: str = Form(...),
    category_id: int = Form(...),
    notes: Optional[str] = Form(None),
    files: List[UploadFile] = File([]),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    cat = db.query(Category).filter(Category.id == category_id, Category.user_id == user_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="分类不存在")
    try:
        finish_datetime = datetime.strptime(finish_time, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="完成日期请用 YYYY-MM-DD")
    item = Item(title=title, finish_time=finish_datetime, category_id=category_id, notes=notes, user_id=user_id)
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
            img = ItemImage(item_id=item.id, image_url=f"/static/uploads/{fn}")
            db.add(img)
    db.commit()
    db.refresh(item)
    return _item_to_response(item)


@router.get("/years")
def get_years(db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    from sqlalchemy import distinct
    rows = db.query(distinct(extract("year", Item.finish_time))).filter(Item.user_id == user_id).order_by(extract("year", Item.finish_time).desc()).all()
    return {"years": [int(r[0]) for r in rows if r[0] is not None]}


@router.get("/")
def get_items(
    category_id: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    q = db.query(Item).filter(Item.user_id == user_id)
    if category_id:
        q = q.filter(Item.category_id == category_id)
    if year:
        q = q.filter(extract("year", Item.finish_time) == year)
    items = q.order_by(Item.finish_time.desc()).all()
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
        fp = img.image_url.replace("/static/uploads/", UPLOAD_DIR + "/")
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
            img = ItemImage(item_id=item.id, image_url=f"/static/uploads/{fn}")
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
    items = db.query(Item).filter(Item.user_id == user_id, extract("year", Item.finish_time) == year).all()
    by_cat = {}
    by_month = {str(i): 0 for i in range(1, 13)}
    for i in items:
        by_cat[i.category.name] = by_cat.get(i.category.name, 0) + 1
        by_month[str(i.finish_time.month)] = by_month.get(str(i.finish_time.month), 0) + 1
    return {"total": len(items), "by_category": by_cat, "by_month": by_month}
