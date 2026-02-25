from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import extract, update, func, case
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from urllib.parse import urlparse
import os
import uuid
from pathlib import Path
import httpx

from database import get_db
from models import Item, ItemImage, Category
from config import UPLOAD_DIR
from deps import get_user_id

router = APIRouter(prefix="/api/items", tags=["items"])

# 允许的封面图来源（防止 SSRF，只拉取动漫/漫画 CDN）
ALLOWED_COVER_HOSTS = ("cdn.myanimelist.net", "cdn.myanimelist.net.", "lain.bgm.tv", "lain.bgm.tv.")


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
    finish_time: Optional[str] = Form(None),
    due_time: Optional[str] = Form(None),
    category_id: int = Form(...),
    notes: Optional[str] = Form(None),
    is_completed: Optional[bool] = Form(False),
    cover_image_url: Optional[str] = Form(None),  # 动漫/漫画封面 URL（来自 Jikan/MAL），后端拉取并保存
    skip_finish_time: Optional[str] = Form(None),  # 传 "1" 表示不记录完成时间（如动漫模块统一 NA）
    files: List[UploadFile] = File([]),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    cat = db.query(Category).filter(Category.id == category_id, Category.user_id == user_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="分类不存在")
    
    # 解析时间
    finish_datetime = None
    if finish_time and finish_time.strip():
        try:
            finish_datetime = datetime.strptime(finish_time.strip(), "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="完成日期请用 YYYY-MM-DD")
    
    due_datetime = None
    if due_time:
        try:
            due_datetime = datetime.strptime(due_time, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="预计完成日期请用 YYYY-MM-DD")
    
    # 若明确不记录完成时间（如动漫），则保持 None；否则已完成但未填时用当前时间
    if not (skip_finish_time and str(skip_finish_time).strip().lower() in ("1", "true", "yes")):
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

    # 可选：从动漫/漫画封面 URL 拉取一张图作为首图（仅允许 MAL CDN），先于本地上传
    if cover_image_url and cover_image_url.strip():
        try:
            parsed = urlparse(cover_image_url.strip())
            if parsed.scheme not in ("https", "http") or parsed.netloc not in ALLOWED_COVER_HOSTS:
                raise HTTPException(status_code=400, detail="封面链接仅允许来自 MyAnimeList 或 Bangumi CDN")
            async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
                r = await client.get(cover_image_url.strip())
                r.raise_for_status()
                content_type = r.headers.get("content-type", "")
                if "image/" not in content_type:
                    raise HTTPException(status_code=400, detail="链接不是有效图片")
                ext = ".jpg"
                if "png" in content_type:
                    ext = ".png"
                elif "webp" in content_type:
                    ext = ".webp"
                fn = f"{uuid.uuid4()}{ext}"
                path = os.path.join(UPLOAD_DIR, fn)
                with open(path, "wb") as buf:
                    buf.write(r.content)
                cover_img = ItemImage(item_id=item.id, image_url=f"/api/uploads/{fn}")
                db.add(cover_img)
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"拉取封面失败: {str(e)}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"保存封面失败: {str(e)}")

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
    """获取待办列表：先按有无截止日期排序（无在前），再按截止日期升序，最后按创建时间降序"""
    items = (
        db.query(Item)
        .options(joinedload(Item.category), selectinload(Item.images))
        .filter(Item.user_id == user_id, Item.is_completed == False)
        .order_by(Item.due_time.is_(None), Item.due_time.asc(), Item.created_at.desc())
        .all()
    )
    return [_item_to_response(i) for i in items]


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


@router.get("/category-counts")
def get_category_counts(
    year: Optional[int] = Query(None, description="按该年份的 finish_time 统计；不传则统计全部年份"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    """按年份返回各分类数量，用于首页分类胶囊数字（不随当前选中的分类变化）"""
    q = (
        db.query(Category.name, func.count(Item.id).label("cnt"))
        .join(Item, Item.category_id == Category.id)
        .filter(Item.user_id == user_id, Item.is_completed == True)
    )
    if year is not None:
        q = q.filter(extract("year", Item.finish_time) == year)
    rows = q.group_by(Category.id, Category.name).all()
    by_category = {name: cnt for name, cnt in rows}
    total = sum(by_category.values())
    return {"total": total, "by_category": by_category}


def _escape_like(s: str) -> str:
    """转义 LIKE 中的 % 和 _，避免被当作通配符"""
    return (s or "").replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("/")
def get_items(
    category_id: Optional[int] = None,
    year: Optional[int] = None,
    is_completed: Optional[bool] = None,
    limit: Optional[int] = None,
    offset: int = 0,
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    from sqlalchemy import or_
    
    base_filters = [Item.user_id == user_id]
    if is_completed is None:
        is_completed = True
    base_filters.append(Item.is_completed == is_completed)
    if category_id:
        base_filters.append(Item.category_id == category_id)
    if year:
        if is_completed:
            base_filters.append(extract("year", Item.finish_time) == year)
        else:
            base_filters.append(extract("year", Item.due_time) == year)
    if search and search.strip():
        term = _escape_like(search.strip())
        pattern = f"%{term}%"
        base_filters.append(
            or_(
                Item.title.ilike(pattern, escape="\\"),
                Item.notes.ilike(pattern, escape="\\"),
            )
        )
    
    total = db.query(func.count(Item.id)).filter(*base_filters).scalar()
    
    q = (
        db.query(Item)
        .options(joinedload(Item.category), selectinload(Item.images))
        .filter(*base_filters)
        .order_by(Item.created_at.desc())
    )
    if limit is not None:
        q = q.offset(offset).limit(limit)
    items = q.all()
    result = [_item_to_response(i) for i in items]
    if limit is not None:
        return {"items": result, "total": total}
    return result


@router.get("/achievement-wall")
def get_achievement_wall(
    category_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    """成就墙：按分类返回已完成且带封面的记录。category_id 必传，为当前用户的分类 id（前端按用户分组展示）"""
    if category_id is None:
        return {"items": [], "total": 0}
    items = (
        db.query(Item)
        .options(joinedload(Item.category), selectinload(Item.images))
        .join(ItemImage)
        .filter(Item.user_id == user_id, Item.is_completed == True, Item.category_id == category_id)
        .order_by(Item.created_at.desc())
        .all()
    )
    seen_ids = set()
    result = []
    for item in items:
        if item.id not in seen_ids and item.images:
            seen_ids.add(item.id)
            cat_name = item.category.name if item.category else ""
            img_url = item.images[0].image_url if item.images else None
            image_webp = None
            if img_url and img_url.startswith("/api/uploads/"):
                image_webp = "/api/serve-webp/" + img_url.replace("/api/uploads/", "").lstrip("/")
            result.append({
                "id": item.id,
                "title": item.title,
                "image": img_url,
                "image_webp": image_webp,
                "date": item.finish_time.strftime("%Y-%m-%d") if item.finish_time else None,
                "category": cat_name,
                "notes": item.notes,
            })
    return {"items": result, "total": len(result)}


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


@router.post("/{item_id}/cover-from-url")
async def add_cover_from_url(
    item_id: int,
    cover_image_url: str = Form(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    """为已有记录从 MAL 封面 URL 拉取并添加一张图片"""
    item = db.query(Item).filter(Item.id == item_id, Item.user_id == user_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    if not cover_image_url or not cover_image_url.strip():
        raise HTTPException(status_code=400, detail="请提供封面链接")
    try:
        parsed = urlparse(cover_image_url.strip())
        if parsed.scheme not in ("https", "http") or parsed.netloc not in ALLOWED_COVER_HOSTS:
            raise HTTPException(status_code=400, detail="封面链接仅允许来自 MyAnimeList 或 Bangumi CDN")
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
            r = await client.get(cover_image_url.strip())
            r.raise_for_status()
            content_type = r.headers.get("content-type", "")
            if "image/" not in content_type:
                raise HTTPException(status_code=400, detail="链接不是有效图片")
            ext = ".jpg"
            if "png" in content_type:
                ext = ".png"
            elif "webp" in content_type:
                ext = ".webp"
            fn = f"{uuid.uuid4()}{ext}"
            path = os.path.join(UPLOAD_DIR, fn)
            with open(path, "wb") as buf:
                buf.write(r.content)
            img = ItemImage(item_id=item.id, image_url=f"/api/uploads/{fn}", sort_order=0)
            db.add(img)
            db.flush()
            # 已有图片时，把新封面插到最前：其余 sort_order 统一 +1
            db.execute(
                update(ItemImage)
                .where(ItemImage.item_id == item.id, ItemImage.id != img.id)
                .values(sort_order=ItemImage.sort_order + 1)
            )
        db.commit()
        db.refresh(img)
        out = list(item.images)  # 已按 sort_order, id 排序
        return [{"id": i.id, "image_url": i.image_url, "upload_time": i.upload_time.isoformat()} for i in out]
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"拉取封面失败: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存封面失败: {str(e)}")


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
    items = (
        db.query(Item)
        .options(joinedload(Item.category))
        .filter(
            Item.user_id == user_id,
            Item.is_completed == True,
            Item.finish_time.isnot(None),
            extract("year", Item.finish_time) == year
        )
        .all()
    )
    by_cat = {}
    by_month = {str(i): 0 for i in range(1, 13)}
    for i in items:
        by_cat[i.category.name] = by_cat.get(i.category.name, 0) + 1
        by_month[str(i.finish_time.month)] = by_month.get(str(i.finish_time.month), 0) + 1
    return {"total": len(items), "by_category": by_cat, "by_month": by_month}

@router.get("/annual-gallery/{year}")
def get_annual_gallery(year: int, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    """获取指定年份的所有带图记录，用于酷炫展示"""
    items = (
        db.query(Item)
        .options(joinedload(Item.category), selectinload(Item.images))
        .join(ItemImage)
        .filter(
            Item.user_id == user_id,
            Item.is_completed == True,
            Item.finish_time.isnot(None),
            extract('year', Item.finish_time) == year
        )
        .order_by(Item.finish_time.asc())
        .all()
    )
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