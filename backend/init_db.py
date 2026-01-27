"""创建表结构。若已有库且缺 user_id，请先执行 migrate SQL 或 migrate_add_user_id.py。"""
from database import engine, Base
from models import Category, Item, ItemImage  # noqa: F401

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print("表结构创建完成。")
