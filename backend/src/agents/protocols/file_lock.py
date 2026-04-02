"""
文件锁
防止并发写入导致文件覆盖
"""
import fcntl
import os
from pathlib import Path
from typing import Optional, Union


class FileLock:
    """
    文件锁，用于防止并发写入
    
    使用fcntl.flock实现POSIX文件锁，支持：
    - 排他锁（LOCK_EX）：写入时使用
    - 共享锁（LOCK_SH）：读取时使用（可选）
    
    用法:
        lock = FileLock("/path/to/file.json")
        lock.acquire()
        try:
            # 操作文件
            pass
        finally:
            lock.release()
    """
    
    def __init__(self, filepath: Union[str, Path]):
        self.filepath = Path(filepath)
        self.lock_path = self.filepath.with_suffix(self.filepath.suffix + ".lock")
        self.fd: Optional[int] = None
        self._locked = False
    
    def acquire(self, blocking: bool = True) -> bool:
        """
        获取文件锁
        
        Args:
            blocking: 是否阻塞等待，False则立即返回
            
        Returns:
            是否成功获取锁
        """
        if self._locked:
            return True
        
        # 确保锁文件所在目录存在
        self.lock_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 打开锁文件
        self.fd = os.open(
            str(self.lock_path),
            os.O_CREAT | os.O_RDWR,
            0o644
        )
        
        lock_type = fcntl.LOCK_EX  # 排他锁
        if not blocking:
            lock_type |= fcntl.LOCK_NB  # 非阻塞
        
        try:
            fcntl.flock(self.fd, lock_type)
            self._locked = True
            return True
        except (IOError, OSError):
            # 锁被占用且非阻塞模式
            if self.fd is not None:
                os.close(self.fd)
                self.fd = None
            return False
    
    def release(self) -> None:
        """释放文件锁"""
        if not self._locked:
            return
        
        if self.fd is not None:
            try:
                fcntl.flock(self.fd, fcntl.LOCK_UN)
                os.close(self.fd)
            except (IOError, OSError):
                pass
            finally:
                self.fd = None
                self._locked = False
    
    def __enter__(self):
        self.acquire()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
        return False
    
    def __del__(self):
        self.release()


class FileLockContext:
    """
    文件锁上下文管理器工厂
    
    用法:
        with FileLockContext("/path/to/file.json") as lock:
            # 操作文件
            pass
    """
    
    @staticmethod
    def lock(filepath: Union[str, Path]) -> FileLock:
        """创建文件锁"""
        return FileLock(filepath)


# 便捷函数
def with_file_lock(filepath: Union[str, Path], operation, *args, **kwargs):
    """
    带文件锁执行操作的便捷函数
    
    用法:
        result = with_file_lock("/path/to/file.json", json.dump, data, f)
    """
    lock = FileLock(filepath)
    lock.acquire()
    try:
        return operation(*args, **kwargs)
    finally:
        lock.release()
