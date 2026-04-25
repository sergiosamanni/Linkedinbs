from fastapi import APIRouter, Depends, HTTPException
from typing import List
from bson import ObjectId
from datetime import datetime

from database import get_db
from routes.auth import get_current_user
from models.project import BrandProject

router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("", response_model=List[BrandProject], response_model_by_alias=False)
async def get_projects(current_user: dict = Depends(get_current_user)):
    db = get_db()
    # Find projects where user is owner OR a collaborator (by email)
    cursor = db.projects.find({
        "$or": [
            {"userId": current_user["id"]},
            {"collaborators": current_user["email"]}
        ]
    })
    projects = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        projects.append(doc)
    return projects

async def handle_project_files(db, project_dict, user_id):
    if "brand" in project_dict and "files" in project_dict["brand"]:
        for file in project_dict["brand"]["files"]:
            if "data" in file and file["data"]:
                # Salva in collezione separata
                await db.brand_files.update_one(
                    {"_id": file["id"]},
                    {"$set": {"data": file["data"], "mimeType": file.get("mimeType"), "userId": user_id, "updatedAt": datetime.utcnow()}},
                    upsert=True
                )
                # Rimuovi dati dal documento principale per evitare DocumentTooLarge
                file["data"] = None

@router.post("", response_model=BrandProject, response_model_by_alias=False)
async def create_project(project: BrandProject, current_user: dict = Depends(get_current_user)):
    db = get_db()
    project_dict = project.model_dump(by_alias=True)
    
    # Estrai e salva i file separatamente
    await handle_project_files(db, project_dict, current_user["id"])
    
    if "_id" in project_dict and project_dict["_id"]:
        # Verifica se esiste già
        existing = await db.projects.find_one({"_id": project_dict["_id"]})
        if existing:
            # Verifica permessi: owner o collaboratore
            is_owner = existing.get("userId") == current_user["id"]
            is_collab = current_user["email"] in existing.get("collaborators", [])
            
            if not is_owner and not is_collab:
                raise HTTPException(status_code=403, detail="Accesso negato")
            
            # Mantieni il userId originale se è un collaboratore a salvare
            if not is_owner:
                project_dict["userId"] = existing["userId"]
            else:
                project_dict["userId"] = current_user["id"]
                
            project_dict["updatedAt"] = datetime.utcnow()
            await db.projects.replace_one({"_id": project_dict["_id"]}, project_dict)
            return project_dict

    # Nuovo progetto
    project_dict["userId"] = current_user["id"]
    project_dict["createdAt"] = datetime.utcnow()
    project_dict["updatedAt"] = datetime.utcnow()
    
    if "_id" not in project_dict or not project_dict["_id"]:
        project_dict["_id"] = str(ObjectId())
        
    await db.projects.insert_one(project_dict)
    return project_dict

@router.put("/{project_id}", response_model=BrandProject, response_model_by_alias=False)
async def update_project(project_id: str, project: BrandProject, current_user: dict = Depends(get_current_user)):
    db = get_db()
    project_dict = project.model_dump(by_alias=True)
    
    # Estrai e salva i file separatamente
    await handle_project_files(db, project_dict, current_user["id"])
    
    existing = await db.projects.find_one({"_id": project_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Progetto non trovato")
        
    is_owner = existing.get("userId") == current_user["id"]
    is_collab = current_user["email"] in existing.get("collaborators", [])
    
    if not is_owner and not is_collab:
        raise HTTPException(status_code=403, detail="Accesso negato")
        
    # Preserviamo userId e metadata
    project_dict["userId"] = existing["userId"]
    project_dict["createdAt"] = existing.get("createdAt", datetime.utcnow())
    project_dict["updatedAt"] = datetime.utcnow()
    
    await db.projects.replace_one({"_id": project_id}, project_dict)
    return project_dict

@router.post("/upload-file")
async def upload_file(data: dict, current_user: dict = Depends(get_current_user)):
    db = get_db()
    file_id = data.get("id") or str(ObjectId())
    file_data = data.get("data")
    mime_type = data.get("mimeType")
    
    if not file_data:
        raise HTTPException(status_code=400, detail="Dati file mancanti")
        
    await db.brand_files.update_one(
        {"_id": file_id},
        {"$set": {"data": file_data, "mimeType": mime_type, "userId": current_user["id"], "updatedAt": datetime.utcnow()}},
        upsert=True
    )
    return {"id": file_id}

@router.get("/files/{file_id}")
async def get_file_content(file_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    file = await db.brand_files.find_one({"_id": file_id})
    if not file:
        raise HTTPException(status_code=404, detail="File non trovato")
    # Qui potremmo aggiungere controllo permessi se desiderato
    return {"data": file["data"], "mimeType": file.get("mimeType")}

@router.delete("/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    result = await db.projects.delete_one({"_id": project_id, "userId": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Progetto non trovato")
    return {"status": "success"}
