from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import json
from pathlib import Path

router = APIRouter(prefix="/api/ontology", tags=["ontology"])

ONTOLOGY_DIR = Path("./data")
ONTOLOGY_DIR.mkdir(parents=True, exist_ok=True)
ONTOLOGY_FILE = ONTOLOGY_DIR / "ontology.json"


class OntologyConfig(BaseModel):
    entities: List[str] = []
    relations: List[str] = []


@router.get("/")
async def get_ontology():
    """获取 Ontology 配置"""
    if not ONTOLOGY_FILE.exists():
        return {"entities": [], "relations": []}
    
    with open(ONTOLOGY_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


@router.put("/")
async def update_ontology(config: OntologyConfig):
    """更新 Ontology 配置"""
    with open(ONTOLOGY_FILE, "w", encoding="utf-8") as f:
        json.dump(config.model_dump(), f, indent=2, ensure_ascii=False)
    
    return {"status": "updated", "config": config}


@router.post("/entities")
async def add_entity(entity: str):
    """添加实体类型"""
    config = OntologyConfig()
    if ONTOLOGY_FILE.exists():
        with open(ONTOLOGY_FILE, "r", encoding="utf-8") as f:
            config = OntologyConfig(**json.load(f))
    
    if entity not in config.entities:
        config.entities.append(entity)
        with open(ONTOLOGY_FILE, "w", encoding="utf-8") as f:
            json.dump(config.model_dump(), f, indent=2, ensure_ascii=False)
    
    return {"status": "added", "entity": entity}


@router.delete("/entities/{entity}")
async def delete_entity(entity: str):
    """删除实体类型"""
    if not ONTOLOGY_FILE.exists():
        raise HTTPException(status_code=404, detail="Ontology not found")
    
    with open(ONTOLOGY_FILE, "r", encoding="utf-8") as f:
        config = OntologyConfig(**json.load(f))
    
    if entity in config.entities:
        config.entities.remove(entity)
        with open(ONTOLOGY_FILE, "w", encoding="utf-8") as f:
            json.dump(config.model_dump(), f, indent=2, ensure_ascii=False)
    
    return {"status": "deleted", "entity": entity}
