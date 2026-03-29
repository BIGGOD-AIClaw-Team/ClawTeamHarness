from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn

from .routes import agents, skills, memory, tasks, mcp, ontology, llm, models, settings
from .routes.websocket import router as websocket_router

# 注意：API Key 必须通过环境变量，禁止硬编码！

app = FastAPI(title="ClawTeamHarness API", version="1.0.0")

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class AgentCreateRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    graph_def: dict

class AgentExecuteRequest(BaseModel):
    agent_id: str
    input_data: dict

class SkillEnableRequest(BaseModel):
    skill_name: str

# 注册路由
app.include_router(agents.router)
app.include_router(skills.router)
app.include_router(memory.router)
app.include_router(tasks.router)
app.include_router(mcp.router)
app.include_router(ontology.router)
app.include_router(llm.router)
app.include_router(models.router)
app.include_router(settings.router)
app.include_router(websocket_router)

@app.get("/")
async def root():
    return {"message": "ClawTeamHarness API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
