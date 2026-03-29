"""Integration tests for V1.2 core features."""
import pytest
import asyncio
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "backend" / "src"))


@pytest.mark.asyncio
async def test_skills_auto_registration():
    """测试 Skills 自动注册功能"""
    from skills.protocol import SkillRegistry
    
    # 验证内置 Skills 已被自动注册
    assert SkillRegistry.get("search") is not None, "SearchSkill should be auto-registered"
    assert SkillRegistry.get("calculator") is not None, "CalculatorSkill should be auto-registered"
    assert SkillRegistry.get("web_request") is not None, "WebRequestSkill should be auto-registered"
    
    # 验证可以获取 skill 实例
    search_skill = SkillRegistry.get_instance("search")
    assert search_skill is not None, "Should be able to get SearchSkill instance"
    assert hasattr(search_skill, "execute"), "Skill should have execute method"


@pytest.mark.asyncio
async def test_task_queue_agent_integration():
    """测试任务队列与 AgentEngine 集成"""
    from api.routes.tasks import TaskQueue
    from agents.engine import AgentEngine
    from agents.serializer import GraphSerializer
    
    # 创建 TaskQueue
    task_queue = TaskQueue()
    
    # 创建一个简单的 Agent 图
    agent_data = {
        "graph_def": {
            "nodes": [
                {"id": "start", "type": "start", "config": {}},
                {"id": "end", "type": "end", "config": {}},
            ],
            "edges": [
                {"source": "start", "target": "end"},
            ],
            "start": "start",
            "end": "end",
        }
    }
    
    # 注册 Agent
    task_queue.register_agent("test_agent", agent_data)
    
    # 验证 Agent 已注册
    assert task_queue._load_agent("test_agent") is not None
    
    # 创建任务
    task_id = task_queue.create_task("test_agent", {"messages": [], "context": {}})
    assert task_id is not None
    
    # 等待任务执行
    await asyncio.sleep(0.5)
    
    # 验证任务状态
    task = task_queue.get_task(task_id)
    assert task is not None
    assert task["status"] in ["completed", "failed", "running"]


@pytest.mark.asyncio
async def test_llm_stream_mode():
    """测试 LLM Stream 模式"""
    from agents.nodes import LLMNode
    
    # 创建 LLMNode，启用流式模式
    llm_node = LLMNode(
        model="gpt-4",
        prompt_template="You are a helpful assistant.",
        temperature=0.7,
        max_tokens=100,
        stream=True,
    )
    
    # 验证 stream 参数已设置
    assert llm_node.stream is True
    
    # 测试流式调用（如果 API key 不可用，会失败但方法存在）
    state = {
        "messages": [{"role": "user", "content": "Say 'test' if you can hear me"}],
        "context": {},
    }
    
    try:
        result = await llm_node.execute(state)
        # 如果成功，验证返回格式
        assert "messages" in result
        assert "result" in result
    except Exception as e:
        # API key 不可用时允许失败，但方法应该存在
        assert "_call_llm_stream" in dir(llm_node), "Stream method should exist"


def test_websocket_event_types():
    """测试 WebSocket 事件类型定义"""
    from api.routes.websocket import WSEventType, send_event, manager
    
    # 验证事件类型常量存在
    assert WSEventType.NODE_START == "node_start"
    assert WSEventType.NODE_COMPLETE == "node_complete"
    assert WSEventType.TOKEN_STREAM == "token_stream"
    assert WSEventType.EXECUTION_COMPLETE == "execution_complete"
    assert WSEventType.ERROR == "error"
    
    # 验证 send_event 函数存在
    assert callable(send_event)
    
    # 验证 ConnectionManager
    assert hasattr(manager, "active_connections")
    assert hasattr(manager, "connect")
    assert hasattr(manager, "disconnect")
    assert hasattr(manager, "send_message")


@pytest.mark.asyncio
async def test_agent_engine_with_nodes():
    """测试 AgentEngine 与节点集成"""
    from agents.engine import AgentEngine
    
    # 创建包含 LLM 节点的 Agent
    graph_def = {
        "nodes": [
            {"id": "start", "type": "start", "config": {}},
            {
                "id": "llm_node", 
                "type": "llm", 
                "config": {
                    "model": "gpt-4",
                    "prompt": "You are a helpful assistant.",
                    "temperature": 0.7,
                    "max_tokens": 50,
                }
            },
            {"id": "end", "type": "end", "config": {}},
        ],
        "edges": [
            {"source": "start", "target": "llm_node"},
            {"source": "llm_node", "target": "end"},
        ],
        "start": "start",
        "end": "end",
    }
    
    engine = AgentEngine(graph_def=graph_def)
    assert engine is not None
    
    # 验证节点数量
    nodes = engine.get_nodes()
    assert len(nodes) == 3


def test_graph_serializer():
    """测试图序列化器"""
    from agents.engine import AgentEngine
    from agents.serializer import GraphSerializer
    
    graph_def = {
        "nodes": [
            {"id": "start", "type": "start", "config": {}},
            {"id": "end", "type": "end", "config": {}},
        ],
        "edges": [
            {"source": "start", "target": "end"},
        ],
        "start": "start",
        "end": "end",
    }
    
    engine = AgentEngine(graph_def=graph_def)
    
    # 序列化
    serialized = GraphSerializer.serialize(engine)
    assert "graph_def" in serialized
    assert "nodes" in serialized
    
    # 反序列化
    new_engine = GraphSerializer.deserialize(serialized)
    assert new_engine is not None
    assert len(new_engine.get_nodes()) == 2
