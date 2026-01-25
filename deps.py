"""公共依赖：从 OpenResty 注入的 X-User-ID 读取 user_id"""
from fastapi import Request


def get_user_id(request: Request) -> str:
    return getattr(request.state, "user_id", "default_user")
