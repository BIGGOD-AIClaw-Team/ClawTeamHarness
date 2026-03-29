"""Search Skill - web search via DuckDuckGo."""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from ..protocol import BaseSkill, SkillManifest, register_skill

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


@register_skill
class SearchSkill(BaseSkill):
    """
    Web search skill using DuckDuckGo.
    
    Manifest:
        name: search
        version: 1.0.0
        description: Search the web using DuckDuckGo
        dependencies: []
        author: ClawTeam
    """

    manifest: SkillManifest = {
        "name": "search",
        "version": "1.0.0",
        "description": "Search the web using DuckDuckGo",
        "dependencies": [],
        "author": "ClawTeam",
        "tags": ["web", "search", "duckduckgo"],
    }

    async def execute(self, params: dict, context: dict) -> dict:
        """
        Execute a web search.
        
        Args:
            params:
                - query (str, required): Search query string
                - count (int, optional): Number of results (default 5, max 10)
            context: Agent context (not used)
            
        Returns:
            dict with 'results' list of {title, url, snippet}
        """
        query = params.get("query")
        if not query:
            return {"error": "Missing required parameter: query", "success": False}
        
        count = min(int(params.get("count", 5)), 10)
        
        try:
            results = await self._search(query, count)
            return {
                "success": True,
                "query": query,
                "results": results,
                "count": len(results),
            }
        except Exception as e:
            logger.exception(f"Search failed for query: {query}")
            return {"success": False, "error": str(e), "query": query}

    async def _search(self, query: str, count: int) -> list[dict]:
        """Perform DuckDuckGo search."""
        # Import here to make duckduckgo an optional dependency
        try:
            from duckduckgo_search import DDGS
        except ImportError:
            logger.warning("duckduckgo_search not installed, using placeholder results")
            return self._placeholder_results(query, count)
        
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=count):
                results.append({
                    "title": r.get("title", ""),
                    "url": r.get("href", ""),
                    "snippet": r.get("body", ""),
                })
        return results

    def _placeholder_results(self, query: str, count: int) -> list[dict]:
        """Return placeholder results when duckduckgo_search is not available."""
        return [
            {
                "title": f"Result {i+1} for '{query}'",
                "url": f"https://example.com/result{i+1}",
                "snippet": f"This is a placeholder result for the query '{query}'.",
            }
            for i in range(count)
        ]
