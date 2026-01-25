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
    finish_time = Column(DateTime, nullable=False, index=True)
    notes = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    user_id = Column(String(64), nullable=False, index=True, default="default_user")
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("Category", back_populates="items")
    images = relationship("ItemImage", back_populates="item", cascade="all, delete-orphan")


class ItemImage(Base):
    __tablename__ = "item_images"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    upload_time = Column(DateTime, default=datetime.utcnow)

    item = relationship("Item", back_populates="images")
