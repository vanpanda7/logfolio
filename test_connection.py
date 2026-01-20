"""
数据库连接测试脚本
用于诊断数据库连接问题
"""
from dotenv import load_dotenv
import os
from urllib.parse import quote_plus
import sys

load_dotenv()

# 读取环境变量
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "culture_wall")

print("=" * 50)
print("数据库连接配置检查")
print("=" * 50)
print(f"DB_HOST: {DB_HOST}")
print(f"DB_PORT: {DB_PORT}")
print(f"DB_USER: {DB_USER}")
print(f"DB_PASSWORD: {'*' * len(DB_PASSWORD) if DB_PASSWORD else '(空)'}")
print(f"DB_NAME: {DB_NAME}")
print()

# 检查环境变量是否加载
if not DB_HOST or DB_HOST == "localhost":
    print("⚠️  警告: DB_HOST 可能未正确加载")
if not DB_PASSWORD:
    print("⚠️  警告: DB_PASSWORD 为空")

# 测试导入必要的包
print("检查依赖包...")
try:
    import pymysql
    print("✓ pymysql 已安装")
except ImportError:
    print("✗ pymysql 未安装，请运行: pip install pymysql")
    sys.exit(1)

try:
    from sqlalchemy import create_engine
    print("✓ sqlalchemy 已安装")
except ImportError:
    print("✗ sqlalchemy 未安装，请运行: pip install sqlalchemy")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    print("✓ python-dotenv 已安装")
except ImportError:
    print("✗ python-dotenv 未安装，请运行: pip install python-dotenv")
    sys.exit(1)

print()

# 测试直接连接（不指定数据库）
print("=" * 50)
print("测试 MySQL 服务器连接（不指定数据库）...")
print("=" * 50)
try:
    import pymysql
    connection = pymysql.connect(
        host=DB_HOST,
        port=int(DB_PORT),
        user=DB_USER,
        password=DB_PASSWORD,
        connect_timeout=5
    )
    print("✓ MySQL 服务器连接成功")
    connection.close()
except Exception as e:
    print(f"✗ MySQL 服务器连接失败: {e}")
    print("\n可能的原因：")
    print("1. MySQL 服务未运行或不可达")
    print("2. 主机地址或端口错误")
    print("3. 用户名或密码错误")
    print("4. 防火墙阻止连接")
    sys.exit(1)

print()

# 测试数据库是否存在
print("=" * 50)
print(f"测试数据库 '{DB_NAME}' 是否存在...")
print("=" * 50)
try:
    import pymysql
    connection = pymysql.connect(
        host=DB_HOST,
        port=int(DB_PORT),
        user=DB_USER,
        password=DB_PASSWORD,
        connect_timeout=5
    )
    cursor = connection.cursor()
    cursor.execute(f"SHOW DATABASES LIKE '{DB_NAME}'")
    result = cursor.fetchone()
    if result:
        print(f"✓ 数据库 '{DB_NAME}' 存在")
    else:
        print(f"✗ 数据库 '{DB_NAME}' 不存在")
        print(f"\n请先创建数据库:")
        print(f"  CREATE DATABASE {DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    cursor.close()
    connection.close()
except Exception as e:
    print(f"✗ 检查数据库时出错: {e}")

print()

# 测试 SQLAlchemy 连接
print("=" * 50)
print("测试 SQLAlchemy 连接...")
print("=" * 50)
try:
    from sqlalchemy import create_engine, text
    
    # URL 编码密码（处理特殊字符）
    encoded_password = quote_plus(DB_PASSWORD)
    DATABASE_URL = f"mysql+pymysql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"
    
    print(f"连接字符串: mysql+pymysql://{DB_USER}:***@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4")
    
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 5}
    )
    
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("✓ SQLAlchemy 连接成功")
        
except Exception as e:
    print(f"✗ SQLAlchemy 连接失败: {e}")
    print("\n可能的原因：")
    print("1. 数据库不存在")
    print("2. 用户没有访问该数据库的权限")
    print("3. 密码中包含特殊字符需要 URL 编码")
    print("4. 连接字符串格式错误")
    sys.exit(1)

print()
print("=" * 50)
print("✓ 所有连接测试通过！")
print("=" * 50)
