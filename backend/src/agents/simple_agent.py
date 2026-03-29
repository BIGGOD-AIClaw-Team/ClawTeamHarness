"""
Simple Agent - Direct LLM-based Agent without graph complexity.
参考 OpenClaw 的简洁架构：Soul + Agent + Memory
"""
import os
import json
import logging
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

@dataclass
class Agent:
    """
    简洁的 Agent 实现。
    参考 OpenClaw：直接 LLM 调用 + 记忆管理。
    """
    name: str
    llm_config: Dict[str, Any] = field(default_factory=dict)
    prompt_config: Dict[str, Any] = field(default_factory=dict)
    memory_config: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        self.messages: List[Dict[str, str]] = []
        
    async def chat(self, user_message: str) -> str:
        """
        直接与 LLM 对话，返回回复。
        """
        # 1. 构建消息
        messages = self._build_messages(user_message)
        
        # 2. 调用 LLM
        response = await self._call_llm(messages)
        
        # 3. 保存到记忆
        self._save_memory(user_message, response)
        
        return response
    
    def _build_messages(self, user_message: str) -> List[Dict[str, str]]:
        """构建消息列表"""
        messages = []
        
        # System prompt
        system_prompt = self.prompt_config.get("system", "你是一个有帮助的AI助手。")
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        # 对话历史
        messages.extend(self.messages)
        
        # 当前用户消息
        messages.append({"role": "user", "content": user_message})
        
        return messages
    
    async def _call_llm(self, messages: List[Dict[str, str]]) -> str:
        """调用 LLM API"""
        provider = self.llm_config.get("provider", "openai")
        model = self.llm_config.get("model", "gpt-4")
        api_key = self.llm_config.get("api_key") or os.getenv("LLM_API_KEY", "")
        temperature = float(self.llm_config.get("temperature", 0.7))
        
        if not api_key:
            return "错误：未配置 API Key，请在 Agent 设置中配置 LLM API Key。"
        
        try:
            if provider == "openai":
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=api_key)
                
                response = await client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                )
                return response.choices[0].message.content
            
            elif provider == "anthropic":
                import anthropic
                client = anthropic.AsyncAnthropic(api_key=api_key)
                
                # Convert messages format for Anthropic
                anthropic_messages = []
                for msg in messages:
                    if msg["role"] == "system":
                        anthropic_messages.append({"role": "user", "content": f"System: {msg['content']}"})
                    else:
                        anthropic_messages.append({"role": msg["role"], "content": msg["content"]})
                
                response = await client.messages.create(
                    model=model or "claude-3",
                    max_tokens=2048,
                    messages=anthropic_messages
                )
                return response.content[0].text
            
            elif provider == "glm":
                # 智谱 AI
                from openai import AsyncOpenAI
                client = AsyncOpenAI(
                    api_key=api_key,
                    base_url="https://open.bigmodel.cn/api/paas/v4"
                )
                response = await client.chat.completions.create(
                    model=model or "glm-4",
                    messages=messages,
                )
                return response.choices[0].message.content
            
            elif provider == "minimax":
                # Minimax
                from openai import AsyncOpenAI
                client = AsyncOpenAI(
                    api_key=api_key,
                    base_url="https://api.minimax.chat/v1"
                )
                response = await client.chat.completions.create(
                    model=model or "abab6-chat",
                    messages=messages,
                )
                return response.choices[0].message.content
            
            elif provider == "qwen":
                # 通义千问
                from openai import AsyncOpenAI
                client = AsyncOpenAI(
                    api_key=api_key,
                    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
                )
                response = await client.chat.completions.create(
                    model=model or "qwen-turbo",
                    messages=messages,
                )
                return response.choices[0].message.content
            
            else:
                # 默认 OpenAI
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=api_key)
                response = await client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                )
                return response.choices[0].message.content
                
        except Exception as e:
            logger.exception(f"LLM call failed: {e}")
            return f"错误：{str(e)}"
    
    def _save_memory(self, user_message: str, assistant_response: str):
        """保存对话到记忆"""
        max_messages = self.memory_config.get("short_term", {}).get("max_messages", 50)
        
        self.messages.append({"role": "user", "content": user_message})
        self.messages.append({"role": "assistant", "content": assistant_response})
        
        # 保持记忆在限制内
        if len(self.messages) > max_messages * 2:
            # 保留最近的对话
            self.messages = self.messages[-max_messages * 2:]
    
    def get_history(self) -> List[Dict[str, str]]:
        """获取对话历史"""
        return self.messages.copy()
    
    def clear_history(self):
        """清空对话历史"""
        self.messages = []
