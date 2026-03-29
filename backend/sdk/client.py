"""ClawTeamHarness SDK client."""
from __future__ import annotations

import httpx
from typing import Optional, Any


class HarnessClient:
    """
    Python SDK client for ClawTeamHarness backend API.

    Supports async context manager usage for automatic connection cleanup.

    Example:
        async with HarnessClient(base_url="http://localhost:8000") as client:
            agents = await client.list_agents()
            result = await client.execute_agent(agent_id="abc", input_data={"query": "hello"})
    """

    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        api_key: Optional[str] = None,
        timeout: float = 60.0,
    ):
        """
        Initialize the SDK client.

        Args:
            base_url: Base URL of the Harness API server.
            api_key: Optional API key for authentication.
            timeout: Request timeout in seconds.
        """
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={"X-API-Key": api_key} if api_key else {},
            timeout=timeout,
        )

    async def list_agents(self) -> list[dict]:
        """List all available agents."""
        resp = await self.client.get("/api/agents/")
        resp.raise_for_status()
        return (await resp.json()).get("agents", [])

    async def get_agent(self, agent_id: str) -> dict:
        """Get a specific agent by ID."""
        resp = await self.client.get(f"/api/agents/{agent_id}")
        resp.raise_for_status()
        return await resp.json()

    async def create_agent(self, name: str, graph_def: dict, description: str = "") -> str:
        """
        Create a new agent.

        Args:
            name: Agent name.
            graph_def: Graph definition dict with nodes, edges, start, end.
            description: Optional agent description.

        Returns:
            The created agent ID.
        """
        resp = await self.client.post(
            "/api/agents/",
            json={"name": name, "graph_def": graph_def, "description": description},
        )
        resp.raise_for_status()
        return (await resp.json()).get("agent_id", "")

    async def execute_agent(
        self,
        agent_id: str,
        input_data: dict,
        thread_id: Optional[str] = None,
    ) -> dict:
        """
        Execute an agent by ID.

        Args:
            agent_id: The agent UUID.
            input_data: Input state dict for the agent.
            thread_id: Optional thread ID for checkpointing.

        Returns:
            Execution result dict.
        """
        payload = {"input_data": input_data}
        if thread_id:
            payload["thread_id"] = thread_id
        resp = await self.client.post(f"/api/agents/{agent_id}/execute", json=payload)
        resp.raise_for_status()
        return await resp.json()

    async def cancel_execution(self, thread_id: str) -> dict:
        """
        Cancel a running execution by thread ID.

        Args:
            thread_id: The thread ID of the execution to cancel.

        Returns:
            Cancellation status dict.
        """
        resp = await self.client.post("/api/execute/cancel", json={"thread_id": thread_id})
        resp.raise_for_status()
        return await resp.json()

    async def list_skills(self) -> list[dict]:
        """List all registered skills."""
        resp = await self.client.get("/api/skills/")
        resp.raise_for_status()
        return (await resp.json()).get("skills", [])

    async def get_skill(self, skill_name: str) -> dict:
        """Get a specific skill by name."""
        resp = await self.client.get(f"/api/skills/{skill_name}")
        resp.raise_for_status()
        return await resp.json()

    async def list_checkpoints(self, thread_id: str) -> list[dict]:
        """List all checkpoints for a thread."""
        resp = await self.client.get(f"/api/checkpoints/{thread_id}")
        resp.raise_for_status()
        return (await resp.json()).get("checkpoints", [])

    async def get_checkpoint(self, thread_id: str, checkpoint_id: int) -> dict:
        """Get a specific checkpoint."""
        resp = await self.client.get(f"/api/checkpoints/{thread_id}/{checkpoint_id}")
        resp.raise_for_status()
        return await resp.json()

    async def resume_from_checkpoint(self, thread_id: str, checkpoint_id: int) -> dict:
        """Resume execution from a checkpoint."""
        resp = await self.client.post(
            f"/api/checkpoints/{thread_id}/{checkpoint_id}/resume",
        )
        resp.raise_for_status()
        return await resp.json()

    async def close(self):
        """Close the underlying HTTP client."""
        await self.client.aclose()

    async def __aenter__(self) -> "HarnessClient":
        return self

    async def __aexit__(self, *args):
        await self.close()
