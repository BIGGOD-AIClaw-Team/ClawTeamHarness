"""
任务状态机
统一管理任务状态转换
"""
from typing import Optional


class TaskStateMachine:
    """
    任务状态机
    
    状态转换字典映射，避免使用eval()
    
    状态列表:
    - pending: 等待分配
    - assigned: 已分配给Agent
    - running: 执行中
    - negotiating: 协商中
    - completed: 已完成
    - failed: 失败
    - blocked: 阻塞
    """
    
    states = ["pending", "assigned", "running", "negotiating", "completed", "failed", "blocked"]
    
    def __init__(self):
        # 状态转换映射表：(当前状态, 事件) -> 目标状态
        self._transitions: dict[tuple[str, str], str] = {
            # 正常流程
            ("pending", "assign"): "assigned",
            ("assigned", "start"): "running",
            ("running", "negotiate"): "negotiating",
            ("running", "complete"): "completed",
            ("negotiating", "resolve"): "running",
            ("negotiating", "complete"): "completed",
            
            # 失败流程
            ("pending", "fail"): "failed",
            ("assigned", "fail"): "failed",
            ("running", "fail"): "failed",
            ("negotiating", "fail"): "failed",
            
            # 阻塞流程
            ("running", "block"): "blocked",
            ("negotiating", "block"): "blocked",
            ("assigned", "block"): "blocked",
            
            # 恢复流程
            ("blocked", "resume"): "running",
            ("blocked", "retry"): "assigned",
        }
    
    def transition(self, from_state: str, event: str) -> str:
        """
        状态转换
        
        Args:
            from_state: 当前状态
            event: 触发事件
            
        Returns:
            目标状态，如果无合法转换则返回当前状态
        """
        return self._transitions.get((from_state, event), from_state)
    
    def get_valid_events(self, state: str) -> list[str]:
        """
        获取指定状态下所有合法的触发事件
        
        Args:
            state: 当前状态
            
        Returns:
            合法的触发事件列表
        """
        return [
            event for (s, event), target in self._transitions.items()
            if s == state
        ]
    
    def is_valid_state(self, state: str) -> bool:
        """检查状态是否合法"""
        return state in self.states
    
    def can_transition(self, from_state: str, event: str) -> bool:
        """检查状态转换是否合法"""
        return (from_state, event) in self._transitions


# 全局单例
_global_sm: Optional[TaskStateMachine] = None


def get_state_machine() -> TaskStateMachine:
    """获取全局状态机实例"""
    global _global_sm
    if _global_sm is None:
        _global_sm = TaskStateMachine()
    return _global_sm
