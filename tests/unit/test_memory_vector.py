"""Unit tests for VectorMemory (ChromaDB)."""

import tempfile
import os
import pytest
from backend.src.memory.vector import VectorMemory


@pytest.fixture
def vector_memory():
    tmpdir = tempfile.mkdtemp()
    vm = VectorMemory(persist_dir=tmpdir)
    yield vm
    # Cleanup
    import shutil
    shutil.rmtree(tmpdir, ignore_errors=True)


class TestVectorMemory:
    def test_init_creates_dir(self, vector_memory):
        assert vector_memory.persist_dir.exists()

    def test_add_returns_doc_id(self, vector_memory):
        doc_id = vector_memory.add("Hello world", metadata={"source": "user"})
        assert doc_id is not None
        assert len(doc_id) > 0

    def test_add_with_custom_id(self, vector_memory):
        doc_id = vector_memory.add("Hello", metadata={"type": "greeting"}, doc_id="my-custom-id")
        assert doc_id == "my-custom-id"

    def test_count(self, vector_memory):
        assert vector_memory.count() == 0
        vector_memory.add("Text 1", metadata={"index": 1})
        vector_memory.add("Text 2", metadata={"index": 2})
        assert vector_memory.count() == 2

    def test_search_returns_results(self, vector_memory):
        vector_memory.add("Python is a programming language", metadata={"lang": "python"})
        vector_memory.add("JavaScript is for web development", metadata={"lang": "js"})
        vector_memory.add("Cooking pasta with tomato sauce", metadata={"lang": "food"})

        results = vector_memory.search("programming", top_k=2)
        # Should find Python programming text
        assert len(results) >= 1
        assert any("programming" in r["text"].lower() or "python" in r["text"].lower() for r in results)

    def test_search_top_k(self, vector_memory):
        for i in range(5):
            vector_memory.add(f"Document number {i} with some content", metadata={"num": i})
        results = vector_memory.search("document", top_k=3)
        assert len(results) <= 3

    def test_search_empty_collection(self, vector_memory):
        results = vector_memory.search("any query")
        assert results == []

    def test_delete(self, vector_memory):
        doc_id = vector_memory.add("To be deleted", metadata={"status": "temp"})
        assert vector_memory.count() == 1
        vector_memory.delete(doc_id)
        assert vector_memory.count() == 0

    def test_delete_nonexistent(self, vector_memory):
        # Should not raise
        vector_memory.delete("nonexistent-id")

    def test_add_batch(self, vector_memory):
        texts = ["First document", "Second document", "Third document"]
        metas = [{"index": 1}, {"index": 2}, {"index": 3}]
        ids = vector_memory.add_batch(texts, metadatas=metas)
        assert len(ids) == 3
        assert vector_memory.count() == 3

    def test_add_batch_with_metadata(self, vector_memory):
        texts = ["Doc 1", "Doc 2"]
        metas = [{"index": 1}, {"index": 2}]
        ids = vector_memory.add_batch(texts, metadatas=metas)
        assert len(ids) == 2
        assert vector_memory.count() == 2

    def test_clear(self, vector_memory):
        vector_memory.add("Document 1", metadata={"num": 1})
        vector_memory.add("Document 2", metadata={"num": 2})
        assert vector_memory.count() >= 1
        vector_memory.clear()
        assert vector_memory.count() == 0

    def test_search_result_structure(self, vector_memory):
        vector_memory.add("Test content for structure check", metadata={"tag": "test"})
        results = vector_memory.search("test content", top_k=1)
        if results:
            r = results[0]
            assert "id" in r
            assert "text" in r
            assert "metadata" in r
