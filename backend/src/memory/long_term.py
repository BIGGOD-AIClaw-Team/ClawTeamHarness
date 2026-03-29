"""Long-term memory module - SQLite persistence."""

from __future__ import annotations

import sqlite3
import os
from pathlib import Path
from typing import Optional
from datetime import datetime


class LongTermMemory:
    """长期记忆 - SQLite 持久化存储。

    支持键值对存储、重要度标记、关键词搜索。
    可跨会话持久化，重启服务后数据仍可查询。

    Example:
        >>> memory = LongTermMemory(db_path="./data/memory.db")
        >>> memory.store("user_preference", "dark_mode", importance=3)
        >>> memory.retrieve("user_preference")
        'dark_mode'
        >>> memory.search("dark")
        [{'key': 'user_preference', 'value': 'dark_mode', 'importance': 3}]
    """

    def __init__(self, db_path: Optional[str] = None):
        """初始化长期记忆。

        Args:
            db_path: 数据库文件路径，默认为 ./data/memory_long_term.db
        """
        if db_path is None:
            db_path = os.environ.get(
                "MEMORY_DB_PATH",
                str(Path(__file__).parent.parent.parent.parent / "data" / "memory_long_term.db"),
            )
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self) -> None:
        """初始化数据库表结构。"""
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL,
                importance INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        # 创建索引加速搜索
        conn.execute("CREATE INDEX IF NOT EXISTS idx_memories_key ON memories(key)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_memories_value ON memories(value)")
        conn.commit()
        conn.close()

    def store(self, key: str, value: str, importance: int = 0) -> None:
        """存储或更新一条记忆。

        Args:
            key: 记忆键（唯一）
            value: 记忆值
            importance: 重要度（0-10，越高越重要）
        """
        now = datetime.now().isoformat()
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            INSERT OR REPLACE INTO memories (key, value, importance, created_at, updated_at)
            VALUES (
                ?,
                ?,
                ?,
                COALESCE((SELECT created_at FROM memories WHERE key=?), ?),
                ?
            )
        """, (key, value, importance, key, now, now))
        conn.commit()
        conn.close()

    def retrieve(self, key: str) -> Optional[str]:
        """根据键检索记忆值。

        Args:
            key: 记忆键

        Returns:
            记忆值，不存在则返回 None
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute("SELECT value FROM memories WHERE key=?", (key,))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else None

    def search(self, keyword: str) -> list[dict[str, Any]]:
        """根据关键词搜索记忆（模糊匹配 value 字段）。

        Args:
            keyword: 搜索关键词

        Returns:
            匹配的记忆列表，每项包含 key, value, importance
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute(
            "SELECT key, value, importance FROM memories WHERE value LIKE ?",
            (f"%{keyword}%",),
        )
        results = [
            {"key": row[0], "value": row[1], "importance": row[2]}
            for row in cursor
        ]
        conn.close()
        return results

    def delete(self, key: str) -> bool:
        """删除指定记忆。

        Args:
            key: 记忆键

        Returns:
            是否删除成功
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute("DELETE FROM memories WHERE key=?", (key,))
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted

    def get_all(self) -> list[dict[str, Any]]:
        """获取所有记忆。"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute(
            "SELECT key, value, importance, created_at, updated_at FROM memories ORDER BY importance DESC, updated_at DESC"
        )
        results = [
            {
                "key": row[0],
                "value": row[1],
                "importance": row[2],
                "created_at": row[3],
                "updated_at": row[4],
            }
            for row in cursor
        ]
        conn.close()
        return results

    def get_high_importance(self, min_importance: int = 5) -> list[dict[str, Any]]:
        """获取重要度高于阈值的记忆。"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute(
            "SELECT key, value, importance FROM memories WHERE importance >= ? ORDER BY importance DESC",
            (min_importance,),
        )
        results = [
            {"key": row[0], "value": row[1], "importance": row[2]}
            for row in cursor
        ]
        conn.close()
        return results

    def count(self) -> int:
        """返回记忆总数。"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute("SELECT COUNT(*) FROM memories")
        count = cursor.fetchone()[0]
        conn.close()
        return count
