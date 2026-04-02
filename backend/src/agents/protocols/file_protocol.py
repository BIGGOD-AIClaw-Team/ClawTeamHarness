"""
文件协商协议
定义Agent之间通过文件系统进行协作的协议规范
"""
import json
import hashlib
import operator
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

# 延迟导入避免循环依赖
from .file_lock import FileLock

# 操作符映射（避免使用eval）
_OPERATORS = {
    "==": operator.eq,
    "!=": operator.ne,
    ">": operator.gt,
    ">=": operator.ge,
    "<": operator.lt,
    "<=": operator.le,
    "in": lambda a, b: a in b,
    "not in": lambda a, b: a not in b,
    "contains": lambda a, b: b in a,
    "startswith": lambda a, b: str(a).startswith(b),
    "endswith": lambda a, b: str(a).endswith(b),
    "exists": lambda a, b: a is not None,
    "is_empty": lambda a, b: a is None or a == "",
    "is_type": lambda a, b: isinstance(a, eval(b)) if b in ("str", "int", "float", "bool", "list", "dict") else False,
}


class ConditionEvaluator:
    """
    结构化条件评估器
    
    支持AND/OR/NOT逻辑操作符，字段比较使用预定义操作符映射
    
    条件结构示例:
    ```python
    condition = {
        "type": "AND",  # AND / OR / NOT
        "conditions": [
            {"field": "review_result.verdict", "op": "in", "value": ["approved"]},
            {"field": "code_review.score", "op": ">=", "value": 0.8}
        ]
    }
    ```
    
    嵌套示例:
    ```python
    condition = {
        "type": "OR",
        "conditions": [
            {"field": "status", "op": "==", "value": "completed"},
            {
                "type": "AND",
                "conditions": [
                    {"field": "status", "op": "==", "value": "running"},
                    {"field": "progress", "op": ">=", "value": 50}
                ]
            }
        ]
    }
    ```
    """
    
    def __init__(self):
        self._operators = _OPERATORS.copy()
    
    def _get_nested_field(self, data: dict, field_path: str) -> Any:
        """获取嵌套字段值"""
        keys = field_path.split(".")
        value = data
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return None
        return value
    
    def _evaluate_single(self, condition: dict, context: dict) -> bool:
        """评估单个条件"""
        field = condition.get("field")
        op = condition.get("op")
        expected_value = condition.get("value")
        
        # 获取字段值
        actual_value = self._get_nested_field(context, field) if field else None
        
        # 获取操作符函数
        if op not in self._operators:
            raise ValueError(f"不支持的操作符: {op}")
        
        op_func = self._operators[op]
        
        try:
            return op_func(actual_value, expected_value)
        except Exception:
            return False
    
    def _evaluate(self, condition: dict, context: dict) -> bool:
        """评估条件（支持递归嵌套）"""
        cond_type = condition.get("type", "AND").upper()
        conditions = condition.get("conditions", [])
        
        if not conditions:
            # 单个条件没有type字段
            return self._evaluate_single(condition, context)
        
        if cond_type == "NOT":
            if len(conditions) != 1:
                raise ValueError("NOT条件只能包含一个子条件")
            return not self._evaluate(conditions[0], context)
        
        if cond_type == "AND":
            return all(self._evaluate(c, context) for c in conditions)
        
        if cond_type == "OR":
            return any(self._evaluate(c, context) for c in conditions)
        
        raise ValueError(f"不支持的条件类型: {cond_type}")
    
    def evaluate(self, condition: dict, context: dict) -> bool:
        """
        评估条件
        
        Args:
            condition: 条件字典
            context: 上下文数据字典
            
        Returns:
            条件是否满足
        """
        if not condition:
            return True  # 空条件视为满足
        return self._evaluate(condition, context)
    
    def register_operator(self, name: str, func: callable) -> None:
        """注册自定义操作符"""
        self._operators[name] = func


class FileProtocol:
    """
    文件协商协议
    
    规范Agent之间通过共享文件系统进行协作的协议：
    - 任务目录结构
    - 文件命名规范
    - 状态机定义
    - 协商流程
    """

    # 文件命名规范
    BRIEFING_FILE = "task_briefing.json"
    RESULT_FILE = "task_result.json"
    ARTIFACT_DIR = "artifacts"
    NEGOTIATION_FILE = "negotiation.json"
    CHECKPOINT_FILE = "checkpoint.json"
    
    # 任务状态
    STATUS_PENDING = "pending"
    STATUS_RUNNING = "running"
    STATUS_NEGOTIATING = "negotiating"
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"
    STATUS_BLOCKED = "blocked"

    @staticmethod
    def get_task_dir(base_workspace: str, agent_id: str, task_id: str) -> Path:
        """获取任务目录路径"""
        return Path(base_workspace) / agent_id / task_id

    @staticmethod
    def ensure_task_structure(task_dir: Path) -> dict[str, Path]:
        """
        确保任务目录结构完整
        
        Returns:
            各关键文件的路径字典
        """
        task_dir.mkdir(parents=True, exist_ok=True)
        artifacts_dir = task_dir / FileProtocol.ARTIFACT_DIR
        artifacts_dir.mkdir(exist_ok=True)
        
        paths = {
            "task_dir": task_dir,
            "artifacts_dir": artifacts_dir,
            "briefing": task_dir / FileProtocol.BRIEFING_FILE,
            "result": task_dir / FileProtocol.RESULT_FILE,
            "negotiation": task_dir / FileProtocol.NEGOTIATION_FILE,
            "checkpoint": task_dir / FileProtocol.CHECKPOINT_FILE,
        }
        
        for path in paths.values():
            if not path.exists():
                path.touch()
        
        return paths

    @staticmethod
    def write_briefing(task_dir: Path, briefing: dict[str, Any]) -> None:
        """写入任务简报（带文件锁）"""
        briefing_path = task_dir / FileProtocol.BRIEFING_FILE
        briefing["created_at"] = datetime.now().isoformat()
        lock = FileLock(briefing_path)
        lock.acquire()
        try:
            with open(briefing_path, "w", encoding="utf-8") as f:
                json.dump(briefing, f, ensure_ascii=False, indent=2)
        finally:
            lock.release()

    @staticmethod
    def read_briefing(task_dir: Path) -> dict[str, Any]:
        """读取任务简报"""
        briefing_path = task_dir / FileProtocol.BRIEFING_FILE
        if not briefing_path.exists():
            return {}
        with open(briefing_path, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def write_result(task_dir: Path, result: dict[str, Any]) -> None:
        """写入任务结果（带文件锁）"""
        result["updated_at"] = datetime.now().isoformat()
        result_path = task_dir / FileProtocol.RESULT_FILE
        lock = FileLock(result_path)
        lock.acquire()
        try:
            with open(result_path, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
        finally:
            lock.release()

    @staticmethod
    def read_result(task_dir: Path) -> dict[str, Any]:
        """读取任务结果"""
        result_path = task_dir / FileProtocol.RESULT_FILE
        if not result_path.exists():
            return {"status": FileProtocol.STATUS_PENDING}
        with open(result_path, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def update_status(task_dir: Path, status: str, message: str = "") -> None:
        """更新任务状态"""
        result = FileProtocol.read_result(task_dir)
        result["status"] = status
        if message:
            result["message"] = message
        result["updated_at"] = datetime.now().isoformat()
        FileProtocol.write_result(task_dir, result)

    @staticmethod
    def write_artifact(task_dir: Path, filename: str, content: str, metadata: dict[str, Any] = None) -> Path:
        """
        写入产物文件（带文件锁）
        
        Returns:
            产物文件路径
        """
        artifacts_dir = task_dir / FileProtocol.ARTIFACT_DIR
        artifacts_dir.mkdir(exist_ok=True)
        
        artifact_path = artifacts_dir / filename
        result_path = task_dir / FileProtocol.RESULT_FILE
        
        # 使用文件锁保护artifact写入和result更新
        lock = FileLock(artifact_path)
        lock.acquire()
        try:
            with open(artifact_path, "w", encoding="utf-8") as f:
                f.write(content)
            
            # 更新结果中的artifacts列表（也需要锁保护）
            result = FileProtocol.read_result(task_dir)
            artifacts = result.get("artifacts", [])
            artifact_info = {
                "filename": filename,
                "path": str(artifact_path),
                "size": len(content),
                "hash": hashlib.md5(content.encode()).hexdigest(),
                "created_at": datetime.now().isoformat(),
            }
            if metadata:
                artifact_info["metadata"] = metadata
            artifacts.append(artifact_info)
            result["artifacts"] = artifacts
            FileProtocol.write_result(task_dir, result)
        finally:
            lock.release()
        
        return artifact_path

    @staticmethod
    def start_negotiation(task_dir: Path, negotiation_data: dict[str, Any]) -> None:
        """开始协商流程（带文件锁）"""
        negotiation = {
            "status": "negotiating",
            "started_at": datetime.now().isoformat(),
            "proposals": [],
            "decisions": [],
            **negotiation_data,
        }
        neg_path = task_dir / FileProtocol.NEGOTIATION_FILE
        lock = FileLock(neg_path)
        lock.acquire()
        try:
            with open(neg_path, "w", encoding="utf-8") as f:
                json.dump(negotiation, f, ensure_ascii=False, indent=2)
        finally:
            lock.release()
        
        FileProtocol.update_status(task_dir, FileProtocol.STATUS_NEGOTIATING, "协商中")

    @staticmethod
    def add_proposal(task_dir: Path, agent_id: str, proposal: dict[str, Any]) -> None:
        """添加协商提案（带文件锁）"""
        neg_path = task_dir / FileProtocol.NEGOTIATION_FILE
        if not neg_path.exists():
            raise ValueError("协商文件不存在，请先调用 start_negotiation")
        
        lock = FileLock(neg_path)
        lock.acquire()
        try:
            with open(neg_path, "r", encoding="utf-8") as f:
                negotiation = json.load(f)
            
            negotiation["proposals"].append({
                "agent_id": agent_id,
                "proposal": proposal,
                "timestamp": datetime.now().isoformat(),
            })
            
            with open(neg_path, "w", encoding="utf-8") as f:
                json.dump(negotiation, f, ensure_ascii=False, indent=2)
        finally:
            lock.release()

    @staticmethod
    def make_decision(task_dir: Path, decision: dict[str, Any]) -> None:
        """做出协商决策（带文件锁）"""
        neg_path = task_dir / FileProtocol.NEGOTIATION_FILE
        if not neg_path.exists():
            raise ValueError("协商文件不存在")
        
        lock = FileLock(neg_path)
        lock.acquire()
        try:
            with open(neg_path, "r", encoding="utf-8") as f:
                negotiation = json.load(f)
            
            negotiation["status"] = "decided"
            negotiation["decided_at"] = datetime.now().isoformat()
            negotiation["decision"] = decision
            
            with open(neg_path, "w", encoding="utf-8") as f:
                json.dump(negotiation, f, ensure_ascii=False, indent=2)
        finally:
            lock.release()
        
        FileProtocol.update_status(task_dir, FileProtocol.STATUS_RUNNING, "协商完成，开始执行")

    @staticmethod
    def read_negotiation(task_dir: Path) -> Optional[dict[str, Any]]:
        """读取协商状态"""
        neg_path = task_dir / FileProtocol.NEGOTIATION_FILE
        if not neg_path.exists():
            return None
        with open(neg_path, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def create_checkpoint(task_dir: Path, checkpoint_data: dict[str, Any]) -> None:
        """创建检查点（带文件锁）"""
        checkpoint = {
            "created_at": datetime.now().isoformat(),
            "data": checkpoint_data,
        }
        cp_path = task_dir / FileProtocol.CHECKPOINT_FILE
        lock = FileLock(cp_path)
        lock.acquire()
        try:
            with open(cp_path, "w", encoding="utf-8") as f:
                json.dump(checkpoint, f, ensure_ascii=False, indent=2)
        finally:
            lock.release()

    @staticmethod
    def read_checkpoint(task_dir: Path) -> Optional[dict[str, Any]]:
        """读取检查点"""
        cp_path = task_dir / FileProtocol.CHECKPOINT_FILE
        if not cp_path.exists():
            return None
        with open(cp_path, "r", encoding="utf-8") as f:
            return json.load(f)
