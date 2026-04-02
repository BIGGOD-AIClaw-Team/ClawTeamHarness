"""Unified Memory Manager - coordinates short-term, long-term, and entity memories."""

from __future__ import annotations

import asyncio
import uuid
from typing import Any, Optional

from ...memory.short_term import ShortTermMemory
from ...memory.long_term import LongTermMemory
from ...memory.vector import VectorMemory
from ..config_models import MemoryConfig, ShortTermMemoryConfig, LongTermMemoryConfig, MemoryType


class MemoryManager:
    """统一记忆管理器。

    协调短期记忆、长期记忆（向量）和实体记忆，
    提供统一的 add_message() / get_context() / store() 接口。

    记忆类型行为：
    - short_term: 仅使用滑动窗口短期记忆
    - long_term: 仅使用 ChromaDB 向量召回
    - vector:     同 long_term（别名）
    - hybrid:     短期 + 长期合并召回，结果重排序

    Example:
        >>> config = MemoryConfig(type=MemoryType.HYBRID)
        >>> manager = MemoryManager(config)
        >>> await manager.add_message("user", "我叫张三，住在北京")
        >>> await manager.add_message("assistant", "好的张三，我记住了")
        >>> ctx = await manager.get_context("用户叫什么名字")
        >>> print(ctx)
    """

    def __init__(self, config: MemoryConfig):
        """初始化记忆管理器。

        Args:
            config: MemoryConfig 配置对象
        """
        self.config = config
        self.enabled = config.enabled
        self.memory_type = config.type

        # 短期记忆
        if config.short_term.enabled:
            self._init_short_term(config.short_term)
        else:
            self.short_term: Optional[ShortTermMemory] = None

        # 长期记忆（向量）
        if config.long_term.enabled:
            self._init_long_term(config.long_term)
        else:
            self.long_term: Optional[VectorMemory] = None
            self.sqlite_store: Optional[LongTermMemory] = None

    # ------------------------------------------------------------------
    # 初始化
    # ------------------------------------------------------------------

    def _init_short_term(self, cfg: ShortTermMemoryConfig) -> None:
        self.short_term = ShortTermMemory(max_messages=cfg.max_messages)
        self._preserve_roles: set[str] = set(getattr(cfg, "preserve_roles", []))

    def _init_long_term(self, cfg: LongTermMemoryConfig) -> None:
        self.long_term = VectorMemory()
        self.similarity_threshold: float = cfg.similarity_threshold
        self.top_k: int = cfg.top_k
        # SQLite key-value store (for structured long-term data)
        self.sqlite_store = LongTermMemory()

    # ------------------------------------------------------------------
    # 核心接口
    # ------------------------------------------------------------------

    async def add_message(self, role: str, content: str, metadata: Optional[dict[str, Any]] = None) -> None:
        """添加一条消息到记忆。

        短期记忆：追加到滑动窗口（自动淘汰最老消息）
        长期记忆：auto_store=True 时自动向量化存入 ChromaDB

        Args:
            role: 消息角色（"user" / "assistant" / "system"）
            content: 消息内容
            metadata: 可选元数据
        """
        if not self.enabled:
            return

        # 短期记忆
        if self.short_term is not None:
            self.short_term.add(role, content, metadata)

        # 长期记忆自动存储（auto_store 字段可能不存在，用 getattr 兼容）
        auto_store = getattr(self.config.long_term, "auto_store", False)
        if self.long_term is not None and auto_store:
            await self._store_long_term(content, {"role": role, **(metadata or {})})

    async def get_context(self, query: str, top_k: int = 5) -> str:
        """根据查询召回记忆上下文。

        Args:
            query: 自然语言查询
            top_k: 最大召回条数

        Returns:
            合并后的上下文字符串
        """
        if not self.enabled:
            return ""

        if self.memory_type == MemoryType.SHORT_TERM:
            return self._get_context_short(query, top_k)
        elif self.memory_type in (MemoryType.LONG_TERM, MemoryType.VECTOR):
            return await self._get_context_long(query, top_k)
        elif self.memory_type == MemoryType.HYBRID:
            return await self._get_context_hybrid(query, top_k)
        else:
            return ""

    async def store(self, content: str, metadata: dict[str, Any] = None) -> None:
        """显式存储内容到长期记忆（向量）。

        Args:
            content: 要存储的文本
            metadata: 元数据
        """
        if not self.enabled or self.long_term is None:
            return
        await self._store_long_term(content, metadata or {})

    # ------------------------------------------------------------------
    # 私有方法 - 各类记忆的召回实现
    # ------------------------------------------------------------------

    def _get_context_short(self, query: str, top_k: int) -> str:
        """短期记忆召回：直接返回最近 top_k 条消息。"""
        if self.short_term is None:
            return ""
        messages = self.short_term.get_recent(top_k)
        return self._format_messages(messages)

    async def _get_context_long(self, query: str, top_k: int) -> str:
        """长期记忆召回：ChromaDB 向量语义搜索。"""
        if self.long_term is None:
            return ""
        results = await self._search_long_term(query, top_k)
        return self._format_vector_results(results)

    async def _get_context_hybrid(self, query: str, top_k: int) -> str:
        """混合召回：短期 + 长期，结果重排序后拼接。

        合并策略（Re-ranking）：
        1. 短期：从滑动窗口取最近 2*top_k 条消息（原始时序，权重高）
        2. 长期：从 ChromaDB 取 top_k 条（语义相关，权重次之）
        3. 短期结果排在前面，长期结果紧随其后
        4. 总数不超过 top_k * 2
        """
        short_k = top_k * 2  # 短期取双倍量再截断

        # 并行获取
        short_task = asyncio.to_thread(self._get_context_short_raw, short_k)
        long_task = self._search_long_term(query, top_k)

        short_messages, long_results = await asyncio.gather(short_task, long_task)

        # 合并：短期优先，长期补充
        merged = self._merge_contexts(short_messages, long_results, top_k)

        # 格式化输出
        parts = []
        if short_messages:
            parts.append(self._format_messages(short_messages[:top_k]))
        if merged["vector"]:
            parts.append(self._format_vector_results(merged["vector"]))

        return "\n---\n".join(parts) if parts else ""

    def _get_context_short_raw(self, n: int) -> list[dict[str, Any]]:
        """获取最近 n 条短期记忆（原始格式，供混合模式使用）。"""
        if self.short_term is None:
            return []
        return self.short_term.get_recent(n)

    async def _search_long_term(self, query: str, top_k: int) -> list[dict[str, Any]]:
        """搜索长期记忆（ChromaDB），应用 similarity_threshold 过滤。"""
        if self.long_term is None:
            return []
        # ChromaDB 内部会多取一些，我们在应用层过滤
        raw_results = self.long_term.search(query, top_k=top_k * 2)

        # similarity_threshold 过滤：distance 越小相似度越高
        # ChromaDB distance ≈ L2 距离，转换为相似度（归一化）
        filtered = []
        for r in raw_results:
            distance = r.get("distance")
            if distance is None:
                # 无距离信息时跳过
                continue
            # 将 L2 距离转换为相似度（假设最大距离约 2.0，归一化到 0-1）
            similarity = max(0.0, 1.0 - distance / 2.0)
            if similarity >= self.similarity_threshold:
                r["similarity"] = similarity
                filtered.append(r)

        # 按相似度降序
        filtered.sort(key=lambda x: x.get("similarity", 0), reverse=True)
        return filtered[:top_k]

    async def _store_long_term(self, content: str, metadata: dict[str, Any]) -> None:
        """异步存储到长期记忆（ChromaDB + SQLite）。"""
        def _store():
            doc_id = self.long_term.add(content, metadata)
            # 同时存到 SQLite（key = doc_id，value = content）
            self.sqlite_store.store(doc_id, content)
            return doc_id

        await asyncio.to_thread(_store)

    # ------------------------------------------------------------------
    # 合并策略
    # ------------------------------------------------------------------

    def _merge_contexts(
        self,
        short_messages: list[dict[str, Any]],
        long_results: list[dict[str, Any]],
        top_k: int,
    ) -> dict[str, Any]:
        """混合模式合并：将短期和长期召回结果合并。

        策略：短期 + 长期拼接，去重后取前 top_k * 2 条。
        - 短期消息通过 role+content 的 hash 去重
        - 短期结果排在前面（时序重要）
        - 长期结果紧随其后

        Returns:
            {"short": [...], "vector": [...]} 各自已截断
        """
        seen = set()
        deduped_short = []
        for msg in short_messages:
            key = f"{msg.get('role')}:{msg.get('content', '')[:50]}"
            if key not in seen:
                seen.add(key)
                deduped_short.append(msg)

        # 短期最多 top_k 条
        short_final = deduped_short[:top_k]

        # 长期结果过滤重复（可能与短期内容重复）
        deduped_long = []
        for r in long_results:
            key = f"vec:{r.get('text', '')[:50]}"
            if key not in seen:
                seen.add(key)
                deduped_long.append(r)

        # 长期最多 top_k 条
        long_final = deduped_long[:top_k]

        return {"short": short_final, "vector": long_final}

    # ------------------------------------------------------------------
    # 格式化
    # ------------------------------------------------------------------

    def _format_messages(self, messages: list[dict[str, Any]]) -> str:
        """将消息列表格式化为字符串。"""
        if not messages:
            return ""
        lines = []
        for m in messages:
            role = m.get("role", "unknown")
            content = m.get("content", "")
            lines.append(f"[{role}] {content}")
        return "\n".join(lines)

    def _format_vector_results(self, results: list[dict[str, Any]]) -> str:
        """将向量搜索结果格式化为字符串。"""
        if not results:
            return ""
        lines = ["[长期记忆]"]
        for r in results:
            text = r.get("text", "")
            sim = r.get("similarity")
            meta = r.get("metadata", {})
            role = meta.get("role", "unknown")
            sim_str = f"(相似度: {sim:.2f})" if sim is not None else ""
            lines.append(f"[{role}] {text} {sim_str}")
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # 工具方法
    # ------------------------------------------------------------------

    def clear(self) -> None:
        """清空所有记忆。"""
        if self.short_term is not None:
            self.short_term.clear()
        if self.long_term is not None:
            self.long_term.clear()

    def get_stats(self) -> dict[str, Any]:
        """获取记忆统计信息。"""
        stats = {
            "enabled": self.enabled,
            "type": self.memory_type.value if self.memory_type else None,
        }
        if self.short_term is not None:
            stats["short_term"] = self.short_term.get_stats()
        if self.long_term is not None:
            stats["long_term_vector_count"] = self.long_term.count()
        if self.sqlite_store is not None:
            stats["long_term_sqlite_count"] = self.sqlite_store.count()
        return stats
