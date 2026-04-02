"""
文件协商协议
定义Agent之间通过文件系统进行协作的协议规范
"""
import json
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Any, Optional


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
        """写入任务简报"""
        briefing_path = task_dir / FileProtocol.BRIEFING_FILE
        briefing["created_at"] = datetime.now().isoformat()
        with open(briefing_path, "w", encoding="utf-8") as f:
            json.dump(briefing, f, ensure_ascii=False, indent=2)

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
        """写入任务结果"""
        result["updated_at"] = datetime.now().isoformat()
        result_path = task_dir / FileProtocol.RESULT_FILE
        with open(result_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

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
        写入产物文件
        
        Returns:
            产物文件路径
        """
        artifacts_dir = task_dir / FileProtocol.ARTIFACT_DIR
        artifacts_dir.mkdir(exist_ok=True)
        
        artifact_path = artifacts_dir / filename
        with open(artifact_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        # 更新结果中的artifacts列表
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
        
        return artifact_path

    @staticmethod
    def start_negotiation(task_dir: Path, negotiation_data: dict[str, Any]) -> None:
        """开始协商流程"""
        negotiation = {
            "status": "negotiating",
            "started_at": datetime.now().isoformat(),
            "proposals": [],
            "decisions": [],
            **negotiation_data,
        }
        neg_path = task_dir / FileProtocol.NEGOTIATION_FILE
        with open(neg_path, "w", encoding="utf-8") as f:
            json.dump(negotiation, f, ensure_ascii=False, indent=2)
        
        FileProtocol.update_status(task_dir, FileProtocol.STATUS_NEGOTIATING, "协商中")

    @staticmethod
    def add_proposal(task_dir: Path, agent_id: str, proposal: dict[str, Any]) -> None:
        """添加协商提案"""
        neg_path = task_dir / FileProtocol.NEGOTIATION_FILE
        if not neg_path.exists():
            raise ValueError("协商文件不存在，请先调用 start_negotiation")
        
        with open(neg_path, "r", encoding="utf-8") as f:
            negotiation = json.load(f)
        
        negotiation["proposals"].append({
            "agent_id": agent_id,
            "proposal": proposal,
            "timestamp": datetime.now().isoformat(),
        })
        
        with open(neg_path, "w", encoding="utf-8") as f:
            json.dump(negotiation, f, ensure_ascii=False, indent=2)

    @staticmethod
    def make_decision(task_dir: Path, decision: dict[str, Any]) -> None:
        """做出协商决策"""
        neg_path = task_dir / FileProtocol.NEGOTIATION_FILE
        if not neg_path.exists():
            raise ValueError("协商文件不存在")
        
        with open(neg_path, "r", encoding="utf-8") as f:
            negotiation = json.load(f)
        
        negotiation["status"] = "decided"
        negotiation["decided_at"] = datetime.now().isoformat()
        negotiation["decision"] = decision
        
        with open(neg_path, "w", encoding="utf-8") as f:
            json.dump(negotiation, f, ensure_ascii=False, indent=2)
        
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
        """创建检查点"""
        checkpoint = {
            "created_at": datetime.now().isoformat(),
            "data": checkpoint_data,
        }
        cp_path = task_dir / FileProtocol.CHECKPOINT_FILE
        with open(cp_path, "w", encoding="utf-8") as f:
            json.dump(checkpoint, f, ensure_ascii=False, indent=2)

    @staticmethod
    def read_checkpoint(task_dir: Path) -> Optional[dict[str, Any]]:
        """读取检查点"""
        cp_path = task_dir / FileProtocol.CHECKPOINT_FILE
        if not cp_path.exists():
            return None
        with open(cp_path, "r", encoding="utf-8") as f:
            return json.load(f)
