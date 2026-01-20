"""
数据库初始化脚本
创建所有表结构，并插入默认分类数据
"""
from database import engine, Base, SessionLocal
from models import Category
import sys

def init_database():
    """初始化数据库：创建表并插入默认数据"""
    try:
        # 创建所有表
        print("正在创建数据库表...")
        Base.metadata.create_all(bind=engine)
        print("✓ 数据库表创建成功")
        
        # 插入默认分类
        db = SessionLocal()
        try:
            default_categories = [
                {"name": "影视", "user_defined": False},
                {"name": "书籍", "user_defined": False},
                {"name": "游戏", "user_defined": False},
                {"name": "音乐", "user_defined": False},
            ]
            
            for cat_data in default_categories:
                # 检查分类是否已存在
                existing = db.query(Category).filter(Category.name == cat_data["name"]).first()
                if not existing:
                    category = Category(**cat_data)
                    db.add(category)
                    print(f"✓ 添加默认分类: {cat_data['name']}")
                else:
                    print(f"  - 分类已存在，跳过: {cat_data['name']}")
            
            db.commit()
            print("✓ 默认分类数据初始化完成")
        except Exception as e:
            db.rollback()
            print(f"✗ 初始化默认分类时出错: {e}")
            raise
        finally:
            db.close()
            
        print("\n数据库初始化完成！")
        return True
        
    except Exception as e:
        print(f"\n✗ 数据库初始化失败: {e}")
        print("\n请检查：")
        print("1. MySQL 服务是否运行")
        print("2. 数据库是否已创建（culture_wall）")
        print("3. .env 文件中的数据库配置是否正确")
        return False

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)
