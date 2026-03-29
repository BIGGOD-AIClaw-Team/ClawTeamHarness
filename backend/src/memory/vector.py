"""Vector memory module - ChromaDB semantic search."""

from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Any, Optional


class VectorMemory:
    """向量记忆 - ChromaDB 持久化存储。

    支持自然语言语义搜索，适用于 Agent 的知识召回场景。

    Example:
        >>> vm = VectorMemory(persist_dir="./data/chroma")
        >>> doc_id = vm.add("我喜欢使用 Python 编程", metadata={"source": "user"})
        >>> results = vm.search("编程语言推荐", top_k=3)
        >>> vm.delete(doc_id)
    """

    def __init__(self, persist_dir: Optional[str] = None):
        """初始化向量记忆。

        Args:
            persist_dir: ChromaDB 持久化目录，默认为 ./data/chroma
        """
        if persist_dir is None:
            persist_dir = os.environ.get(
                "CHROMA_PERSIST_DIR",
                str(Path(__file__).parent.parent.parent.parent / "data" / "chroma"),
            )
        self.persist_dir = Path(persist_dir)
        self.persist_dir.mkdir(parents=True, exist_ok=True)

        # 延迟导入，避免未安装 chromadb 时阻塞
        self._client: Optional[Any] = None
        self._collection: Optional[Any] = None

    def _ensure_client(self) -> Any:
        """确保 ChromaDB client 已初始化（懒加载）。"""
        if self._client is None:
            import chromadb
            self._client = chromadb.PersistentClient(path=str(self.persist_dir))
            self._collection = self._client.get_or_create_collection(
                "agent_memories",
                metadata={"description": "Agent vector memories"}
            )
        return self._collection

    @property
    def collection(self) -> Any:
        """获取 collection（兼容属性访问）。"""
        return self._ensure_client()

    def add(
        self,
        text: str,
        metadata: Optional[dict[str, Any]] = None,
        doc_id: Optional[str] = None,
    ) -> str:
        """添加记忆向量。

        Args:
            text: 要存储的文本内容
            metadata: 可选的元数据
            doc_id: 可选的文档 ID（不提供则自动生成 UUID）

        Returns:
            文档 ID
        """
        import chromadb

        doc_id = doc_id or str(uuid.uuid4())
        coll = self._ensure_client()
        coll.add(
            documents=[text],
            metadatas=[metadata] if metadata else None,
            ids=[doc_id],
        )
        return doc_id

    def add_batch(
        self,
        texts: list[str],
        metadatas: Optional[list[dict[str, Any]]] = None,
        doc_ids: Optional[list[str]] = None,
    ) -> list[str]:
        """批量添加记忆向量。

        Args:
            texts: 文本列表
            metadatas: 元数据列表（与 texts 一一对应）
            doc_ids: 文档 ID 列表（不提供则自动生成）

        Returns:
            文档 ID 列表
        """
        doc_ids = doc_ids or [str(uuid.uuid4()) for _ in texts]
        coll = self._ensure_client()
        coll.add(
            documents=texts,
            metadatas=metadatas if metadatas else None,
            ids=doc_ids,
        )
        return doc_ids

    def search(self, query: str, top_k: int = 5) -> list[dict[str, Any]]:
        """语义搜索记忆。

        Args:
            query: 自然语言查询
            top_k: 返回最相似的 K 条结果

        Returns:
            搜索结果列表，每项包含 id, text, metadata, distance
        """
        coll = self._ensure_client()
        try:
            results = coll.query(
                query_texts=[query],
                n_results=top_k,
            )
        except Exception:
            # ChromaDB may raise on empty collection
            return []

        if not results or not results.get("ids"):
            return []

        output = []
        ids_list = results.get("ids", [[]])[0]
        docs_list = results.get("documents", [[]])[0]
        metas_list = results.get("metadatas", [[]])[0]
        dists_list = results.get("distances", [[]])[0]

        for i in range(len(ids_list)):
            output.append({
                "id": ids_list[i],
                "text": docs_list[i] if i < len(docs_list) else "",
                "metadata": metas_list[i] if i < len(metas_list) else {},
                "distance": dists_list[i] if i < len(dists_list) else None,
            })
        return output

    def delete(self, doc_id: str) -> None:
        """删除指定的记忆向量。"""
        coll = self._ensure_client()
        coll.delete(ids=[doc_id])

    def count(self) -> int:
        """返回当前向量总数。"""
        coll = self._ensure_client()
        return coll.count()

    def clear(self) -> None:
        """清空所有向量（删除 collection 后重建）。"""
        import chromadb
        if self._client is not None:
            try:
                self._client.delete_collection("agent_memories")
            except Exception:
                pass
        self._client = None
        self._collection = None
