from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("name", "user_id", name="uq_category_name_user"),)

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, index=True)
    user_id = Column(String(64), nullable=False, index=True, default="default_user")
    user_defined = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("Item", back_populates="category", cascade="all, delete-orphan")


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    
    # 时间三剑客
    due_time = Column(DateTime, nullable=True, index=True)      # 预计完成时间（待办用）
    finish_time = Column(DateTime, nullable=True, index=True)  # 实际结束时间（完成时记录）
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 核心状态：False 为待办，True 为已完成记录
    is_completed = Column(Boolean, default=False, index=True)
    
    notes = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    user_id = Column(String(64), nullable=False, index=True, default="default_user")

    category = relationship("Category", back_populates="items")
    images = relationship(
        "ItemImage", back_populates="item", cascade="all, delete-orphan",
        order_by="ItemImage.sort_order, ItemImage.id",
    )


class ItemImage(Base):
    __tablename__ = "item_images"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    upload_time = Column(DateTime, default=datetime.utcnow)
    sort_order = Column(Integer, default=0, nullable=False)  # 越小越靠前，插入封面时置 0 并让其余 +1

    item = relationship("Item", back_populates="images")
