from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Category(Base):
    """分类表"""
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True, comment="分类名称")
    user_defined = Column(Boolean, default=True, comment="是否为用户自定义分类")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    
    # 关联关系
    items = relationship("Item", back_populates="category", cascade="all, delete-orphan")


class Item(Base):
    """记录核心表"""
    __tablename__ = "items"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True, comment="记录标题/名称")
    finish_time = Column(DateTime, nullable=False, index=True, comment="完成时间（核心字段）")
    notes = Column(Text, nullable=True, comment="备注/感想")
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True, comment="分类ID")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    
    # 关联关系
    category = relationship("Category", back_populates="items")
    images = relationship("ItemImage", back_populates="item", cascade="all, delete-orphan")


class ItemImage(Base):
    """图片表（支持单条记录多个图片）"""
    __tablename__ = "item_images"
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False, index=True, comment="记录ID")
    image_url = Column(String(500), nullable=False, comment="图片服务器存储路径")
    upload_time = Column(DateTime, default=datetime.utcnow, comment="上传时间")
    
    # 关联关系
    item = relationship("Item", back_populates="images")
