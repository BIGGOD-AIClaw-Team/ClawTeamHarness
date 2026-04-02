"""
SQLite Database for ClawTeamHarness
持久化存储 Agent、对话和消息
"""
import sqlite3
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime


class Database:
    def __init__(self, db_path: str = None):
        if db_path is None:
            # database.py at src/db/database.py -> parents[4] = ClawTeamHarness/
            db_path = Path(__file__).resolve().parent.parent.parent.parent / "data" / "harness.db"
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
    
    def _init_db(self):
        """初始化数据库表"""
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                config TEXT,
                status TEXT DEFAULT 'draft',
                created_at TEXT,
                updated_at TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id TEXT,
                session_id TEXT,
                created_at TEXT,
                FOREIGN KEY(agent_id) REFERENCES agents(id)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER,
                role TEXT,
                content TEXT,
                created_at TEXT,
                FOREIGN KEY(conversation_id) REFERENCES conversations(id)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS teams (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                agents TEXT,
                shared_context TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                workflow_type TEXT,
                steps TEXT,
                condition TEXT,
                team_id TEXT,
                status TEXT DEFAULT 'pending',
                result TEXT,
                error TEXT,
                progress INTEGER DEFAULT 0,
                created_at TEXT,
                started_at TEXT,
                completed_at TEXT
            )
        """)
        conn.commit()
        conn.close()
    
    def save_message(self, agent_id: str, session_id: str, role: str, content: str) -> int:
        """保存消息，返回消息ID"""
        conn = sqlite3.connect(self.db_path)
        
        # 查找或创建 conversation
        cursor = conn.execute(
            "SELECT id FROM conversations WHERE agent_id=? AND session_id=?",
            (agent_id, session_id)
        )
        row = cursor.fetchone()
        
        if row:
            conv_id = row[0]
        else:
            cursor = conn.execute(
                "INSERT INTO conversations (agent_id, session_id, created_at) VALUES (?, ?, ?)",
                (agent_id, session_id, datetime.now().isoformat())
            )
            conv_id = cursor.lastrowid
        
        # 插入消息
        cursor = conn.execute(
            "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)",
            (conv_id, role, content, datetime.now().isoformat())
        )
        
        msg_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return msg_id
    
    def get_conversations(self, agent_id: str) -> List[Dict[str, Any]]:
        """获取 Agent 的所有会话"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute(
            "SELECT id, session_id, created_at FROM conversations WHERE agent_id=? ORDER BY created_at DESC",
            (agent_id,)
        )
        result = [
            {"id": r[0], "session_id": r[1], "created_at": r[2]} 
            for r in cursor.fetchall()
        ]
        conn.close()
        return result
    
    def get_messages(self, conversation_id: int) -> List[Dict[str, str]]:
        """获取会话的所有消息"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute(
            "SELECT role, content FROM messages WHERE conversation_id=? ORDER BY created_at",
            (conversation_id,)
        )
        result = [
            {"role": r[0], "content": r[1]} 
            for r in cursor.fetchall()
        ]
        conn.close()
        return result
    
    def get_conversation_by_session(self, agent_id: str, session_id: str) -> Optional[Dict[str, Any]]:
        """通过 session_id 查找会话"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute(
            "SELECT id, session_id, created_at FROM conversations WHERE agent_id=? AND session_id=?",
            (agent_id, session_id)
        )
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {"id": row[0], "session_id": row[1], "created_at": row[2]}
        return None
    
    def delete_conversation(self, conversation_id: int):
        """删除会话及其所有消息"""
        conn = sqlite3.connect(self.db_path)
        conn.execute("DELETE FROM messages WHERE conversation_id=?", (conversation_id,))
        conn.execute("DELETE FROM conversations WHERE id=?", (conversation_id,))
        conn.commit()
        conn.close()
    
    def save_agent(self, agent_id: str, name: str, config: str, status: str = "draft"):
        """保存或更新 Agent 元信息"""
        conn = sqlite3.connect(self.db_path)
        now = datetime.now().isoformat()
        
        # 检查是否存在
        cursor = conn.execute("SELECT id FROM agents WHERE id=?", (agent_id,))
        if cursor.fetchone():
            conn.execute(
                "UPDATE agents SET name=?, config=?, status=?, updated_at=? WHERE id=?",
                (name, config, status, now, agent_id)
            )
        else:
            conn.execute(
                "INSERT INTO agents (id, name, config, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (agent_id, name, config, status, now, now)
            )
        
        conn.commit()
        conn.close()

    # ==================== Team Operations ====================

    def save_team(self, team: dict) -> None:
        """保存或更新团队"""
        conn = sqlite3.connect(self.db_path)
        now = datetime.now().isoformat()
        
        cursor = conn.execute("SELECT id FROM teams WHERE id=?", (team["team_id"],))
        if cursor.fetchone():
            conn.execute(
                """UPDATE teams SET name=?, description=?, agents=?, shared_context=?, updated_at=? 
                   WHERE id=?""",
                (team["name"], team.get("description", ""), json.dumps(team["agents"]),
                 json.dumps(team.get("shared_context", {})), now, team["team_id"])
            )
        else:
            conn.execute(
                """INSERT INTO teams (id, name, description, agents, shared_context, created_at, updated_at) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (team["team_id"], team["name"], team.get("description", ""),
                 json.dumps(team["agents"]), json.dumps(team.get("shared_context", {})),
                 team.get("created_at", now), now)
            )
        
        conn.commit()
        conn.close()

    def get_team(self, team_id: str) -> Optional[dict]:
        """获取团队"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute(
            "SELECT id, name, description, agents, shared_context, created_at, updated_at FROM teams WHERE id=?",
            (team_id,)
        )
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "team_id": row[0], "name": row[1], "description": row[2],
                "agents": json.loads(row[3]) if row[3] else [],
                "shared_context": json.loads(row[4]) if row[4] else {},
                "created_at": row[5], "updated_at": row[6]
            }
        return None

    def list_teams(self) -> list[dict]:
        """获取所有团队"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute(
            "SELECT id, name, description, agents, shared_context, created_at, updated_at FROM teams"
        )
        rows = cursor.fetchall()
        conn.close()
        
        return [
            {"team_id": r[0], "name": r[1], "description": r[2],
             "agents": json.loads(r[3]) if r[3] else [],
             "shared_context": json.loads(r[4]) if r[4] else {},
             "created_at": r[5], "updated_at": r[6]}
            for r in rows
        ]

    def delete_team(self, team_id: str) -> None:
        """删除团队"""
        conn = sqlite3.connect(self.db_path)
        conn.execute("DELETE FROM teams WHERE id=?", (team_id,))
        conn.commit()
        conn.close()

    # ==================== Task Operations ====================

    def save_task(self, task: dict) -> None:
        """保存或更新任务"""
        conn = sqlite3.connect(self.db_path)
        now = datetime.now().isoformat()
        
        cursor = conn.execute("SELECT id FROM tasks WHERE id=?", (task["task_id"],))
        if cursor.fetchone():
            conn.execute(
                """UPDATE tasks SET name=?, description=?, workflow_type=?, steps=?, condition=?,
                   team_id=?, status=?, result=?, error=?, progress=?, started_at=?, completed_at=?
                   WHERE id=?""",
                (task["name"], task.get("description", ""), task.get("workflow_type", "sequential"),
                 json.dumps(task["steps"]), json.dumps(task.get("condition")),
                 task.get("team_id"), task["status"], json.dumps(task.get("result")),
                 task.get("error"), task.get("progress", 0),
                 task.get("started_at"), task.get("completed_at"), task["task_id"])
            )
        else:
            conn.execute(
                """INSERT INTO tasks (id, name, description, workflow_type, steps, condition, team_id,
                   status, result, error, progress, created_at, started_at, completed_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (task["task_id"], task["name"], task.get("description", ""),
                 task.get("workflow_type", "sequential"), json.dumps(task["steps"]),
                 json.dumps(task.get("condition")), task.get("team_id"),
                 task["status"], json.dumps(task.get("result")), task.get("error"),
                 task.get("progress", 0), task.get("created_at", now),
                 task.get("started_at"), task.get("completed_at"))
            )
        
        conn.commit()
        conn.close()

    def get_task(self, task_id: str) -> Optional[dict]:
        """获取任务"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute(
            """SELECT id, name, description, workflow_type, steps, condition, team_id,
               status, result, error, progress, created_at, started_at, completed_at
               FROM tasks WHERE id=?""",
            (task_id,)
        )
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "task_id": row[0], "name": row[1], "description": row[2],
                "workflow_type": row[3], "steps": json.loads(row[4]) if row[4] else [],
                "condition": json.loads(row[5]) if row[5] else None,
                "team_id": row[6], "status": row[7],
                "result": json.loads(row[8]) if row[8] else None,
                "error": row[9], "progress": row[10],
                "created_at": row[11], "started_at": row[12], "completed_at": row[13]
            }
        return None

    def list_tasks(self, team_id: str = None, status: str = None) -> list[dict]:
        """获取任务列表"""
        conn = sqlite3.connect(self.db_path)
        
        query = """SELECT id, name, description, workflow_type, steps, condition, team_id,
                   status, result, error, progress, created_at, started_at, completed_at FROM tasks"""
        params = []
        
        if team_id or status:
            conditions = []
            if team_id:
                conditions.append("team_id=?")
                params.append(team_id)
            if status:
                conditions.append("status=?")
                params.append(status)
            query += " WHERE " + " AND ".join(conditions)
        
        cursor = conn.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [
            {"task_id": r[0], "name": r[1], "description": r[2], "workflow_type": r[3],
             "steps": json.loads(r[4]) if r[4] else [], "condition": json.loads(r[5]) if r[5] else None,
             "team_id": r[6], "status": r[7], "result": json.loads(r[8]) if r[8] else None,
             "error": r[9], "progress": r[10], "created_at": r[11], "started_at": r[12], "completed_at": r[13]}
            for r in rows
        ]


# 全局数据库实例
_db: Optional[Database] = None


def get_db(db_path: str = "./data/harness.db") -> Database:
    """获取数据库单例"""
    global _db
    if _db is None:
        _db = Database(db_path)
    return _db
