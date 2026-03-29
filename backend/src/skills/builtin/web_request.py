"""Web Request Skill - HTTP request tool."""
from __future__ import annotations

import logging
from typing import Any

from ..protocol import BaseSkill, SkillManifest, register_skill

logger = logging.getLogger(__name__)


@register_skill
class WebRequestSkill(BaseSkill):
    """
    HTTP request skill for making web requests.
    
    Manifest:
        name: web_request
        version: 1.0.0
        description: Make HTTP requests to web endpoints
        dependencies: []
        author: ClawTeam
    """

    manifest: SkillManifest = {
        "name": "web_request",
        "version": "1.0.0",
        "description": "Make HTTP requests to web endpoints",
        "dependencies": [],
        "author": "ClawTeam",
        "tags": ["http", "web", "request", "api"],
    }

    async def execute(self, params: dict, context: dict) -> dict:
        """
        Execute an HTTP request.
        
        Args:
            params:
                - url (str, required): Target URL
                - method (str, optional): HTTP method (GET, POST, PUT, DELETE). Default: GET
                - headers (dict, optional): Request headers
                - body (str/dict, optional): Request body (for POST/PUT)
                - timeout (int, optional): Timeout in seconds (default 30)
            context: Agent context
            
        Returns:
            dict with status_code, headers, body, etc.
        """
        url = params.get("url")
        if not url:
            return {"error": "Missing required parameter: url", "success": False}
        
        method = params.get("method", "GET").upper()
        headers = params.get("headers", {})
        body = params.get("body")
        timeout = int(params.get("timeout", 30))
        
        try:
            result = await self._make_request(url, method, headers, body, timeout)
            return {
                "success": True,
                "status_code": result["status_code"],
                "headers": dict(result["headers"]),
                "body": result["body"],
                "url": url,
                "method": method,
            }
        except Exception as e:
            logger.exception(f"Web request failed: {url}")
            return {"success": False, "error": str(e), "url": url}

    async def _make_request(
        self,
        url: str,
        method: str,
        headers: dict,
        body: Any,
        timeout: int,
    ) -> dict:
        """Make the actual HTTP request using aiohttp."""
        try:
            import aiohttp
        except ImportError:
            return self._fallback_request(url, method, headers, body, timeout)
        
        timeout_cfg = aiohttp.ClientTimeout(total=timeout)
        async with aiohttp.ClientSession(timeout=timeout_cfg) as session:
            kwargs: dict[str, Any] = {"headers": headers}
            if body and method in ("POST", "PUT", "PATCH"):
                kwargs["data"] = body
            
            async with session.request(method, url, **kwargs) as resp:
                body_text = await resp.text()
                return {
                    "status_code": resp.status,
                    "headers": resp.headers,
                    "body": body_text,
                }

    def _fallback_request(
        self,
        url: str,
        method: str,
        headers: dict,
        body: Any,
        timeout: int,
    ) -> dict:
        """Fallback using stdlib urllib when aiohttp is not available."""
        import urllib.request
        import urllib.error
        import json
        
        req = urllib.request.Request(url, method=method, headers=headers)
        if body:
            if isinstance(body, dict):
                body = json.dumps(body).encode()
            elif isinstance(body, str):
                body = body.encode()
            req.data = body
        
        req.timeout = timeout
        
        try:
            with urllib.request.urlopen(req) as resp:
                return {
                    "status_code": resp.status,
                    "headers": resp.headers,
                    "body": resp.read().decode("utf-8"),
                }
        except urllib.error.HTTPError as e:
            return {
                "status_code": e.code,
                "headers": e.headers,
                "body": e.read().decode("utf-8"),
            }
