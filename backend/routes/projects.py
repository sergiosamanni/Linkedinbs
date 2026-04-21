from fastapi import APIRouter, Depends, HTTPException
from typing import List
from bson import ObjectId
from datetime import datetime

from database import get_db
from routes.auth import get_current_user
from models.project import BrandProject

router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("/", response_model=List[BrandProject])
async def get_projects(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.projects.find({"userId": current_user["id"]})
    projects = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        projects.append(doc)
    return projects

@router.post("/", response_model=BrandProject)
async def create_project(project: BrandProject, current_user: dict = Depends(get_current_user)):
    db = get_db()
    project_dict = project.dict(by_alias=True)
    project_dict["userId"] = current_user["id"]
    project_dict["createdAt"] = datetime.utcnow()
    project_dict["updatedAt"] = datetime.utcnow()
    
    # Se l'ID arriva dal frontend, lo preserviamo come stringa o lo convertiamo in ObjectId se preferisci
    # In questo caso, usiamo l'ID fornito come _id
    if "_id" in project_dict:
        # Verifica se esiste già
        existing = await db.projects.find_one({"_id": project_dict["_id"]})
        if existing:
             await db.projects.replace_one({"_id": project_dict["_id"]}, project_dict)
        else:
             await db.projects.insert_one(project_dict)
    else:
        result = await db.projects.insert_one(project_dict)
        project_dict["_id"] = str(result.inserted_id)
        
    return project_dict

@router.put("/{project_id}", response_model=BrandProject)
async def update_project(project_id: str, project: BrandProject, current_user: dict = Depends(get_current_user)):
    db = get_db()
    project_dict = project.dict(by_alias=True)
    project_dict["updatedAt"] = datetime.utcnow()
    project_dict["userId"] = current_user["id"]
    
    result = await db.projects.replace_one(
        {"_id": project_id, "userId": current_user["id"]},
        project_dict
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Progetto non trovato")
        
    return project_dict

@router.delete("/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    result = await db.projects.delete_one({"_id": project_id, "userId": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Progetto non trovato")
    return {"status": "success"}
