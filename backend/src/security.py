"""
加密工具模块 - 用于安全存储敏感信息
使用 Fernet 对称加密，确保 API Key 不以明文存储
"""
from cryptography.fernet import Fernet
from pathlib import Path
import base64
import hashlib
import os

# 密钥存储路径
_KEY_FILE = Path(__file__).resolve().parent.parent.parent.parent / "data" / ".key"
_KEY_FILE.parent.mkdir(parents=True, exist_ok=True)

def _get_or_create_key() -> bytes:
    """获取或生成加密密钥"""
    if _KEY_FILE.exists():
        return _KEY_FILE.read_bytes()
    
    # 生成新密钥
    key = Fernet.generate_key()
    _KEY_FILE.write_bytes(key)
    # 限制权限
    os.chmod(_KEY_FILE, 0o600)
    return key

_fernet = None

def _get_fernet() -> Fernet:
    """获取 Fernet 实例"""
    global _fernet
    if _fernet is None:
        key = _get_or_create_key()
        _fernet = Fernet(key)
    return _fernet

def encrypt_value(value: str) -> str:
    """加密字符串，返回 base64 编码的密文"""
    if not value:
        return ""
    f = _get_fernet()
    encrypted = f.encrypt(value.encode("utf-8"))
    return base64.urlsafe_b64encode(encrypted).decode("ascii")

def decrypt_value(encrypted: str) -> str:
    """解密字符串"""
    if not encrypted:
        return ""
    try:
        f = _get_fernet()
        decoded = base64.urlsafe_b64decode(encrypted.encode("ascii"))
        return f.decrypt(decoded).decode("utf-8")
    except Exception:
        return ""

def mask_value(value: str, visible: int = 4) -> str:
    """掩码显示，只保留最后几位"""
    if not value:
        return ""
    if len(value) <= visible:
        return "*" * len(value)
    return "*" * (len(value) - visible) + value[-visible:]

def mask_api_key(api_key: str) -> str:
    """API Key 掩码 - 返回格式如 sk-***xyz"""
    if not api_key:
        return ""
    if len(api_key) <= 8:
        return "*" * len(api_key)
    prefix = api_key[:4] if len(api_key) > 4 else ""
    suffix = api_key[-4:] if len(api_key) > 4 else ""
    return f"{prefix}***{suffix}" if prefix else f"***{suffix}"
