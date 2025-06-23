from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from datetime import datetime
import json
import glob
from pathlib import Path

from logbook_parser import LogbookParser
from langchain_agent import ScientificLogbookAgent
from user_manager import UserManager

app = FastAPI(title="Scientific Logbook AI", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
parser = LogbookParser()
agent = ScientificLogbookAgent()
user_manager = UserManager()

# Current model configuration
current_model = {"type": "openai"}

class QueryRequest(BaseModel):
    query: str
    user_filter: Optional[str] = None

class CreateEntryRequest(BaseModel):
    author: str
    title: str
    rough_description: str
    tags: Optional[List[str]] = []

class AddUserRequest(BaseModel):
    name: str

class ModelConfigRequest(BaseModel):
    model_type: str  # "openai" or "local"

class LogbookEntry(BaseModel):
    author: str
    date: str
    title: str
    content: str
    tags: List[str] = []

@app.get("/")
async def root():
    return {"message": "Scientific Logbook AI API"}

@app.post("/query")
async def query_logbook(request: QueryRequest):
    """Query the logbook data using natural language"""
    try:
        # Parse all logbook entries
        entries = parser.parse_all_logbooks()
        
        # Use the agent to answer the query
        response = agent.query(request.query, entries, request.user_filter)
        
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/entries", response_model=List[LogbookEntry])
async def get_all_entries():
    """Get all logbook entries"""
    try:
        entries = parser.parse_all_logbooks()
        return entries
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users")
async def get_users():
    """Get list of all users"""
    try:
        users = user_manager.get_users()
        return {"users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/add-user")
async def add_user(request: AddUserRequest):
    """Add a new user to the system"""
    try:
        success = user_manager.add_user(request.name)
        if success:
            return {"message": f"User '{request.name}' added successfully"}
        else:
            raise HTTPException(status_code=400, detail="User already exists or invalid name")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/summary")
async def get_summary():
    """Get a summary of recent scientific activities"""
    try:
        entries = parser.parse_all_logbooks()
        summary = agent.generate_summary(entries)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/create-entry")
async def create_entry(request: CreateEntryRequest):
    """Create a new logbook entry with LLM refinement"""
    try:
        # Use the agent to refine the rough description into proper markdown
        refined_content = agent.refine_entry(
            author=request.author,
            title=request.title,
            rough_description=request.rough_description,
            tags=request.tags or []
        )
        
        # Save the refined entry to a markdown file
        file_path = parser.save_entry(
            author=request.author,
            title=request.title,
            content=refined_content,
            tags=request.tags or []
        )
        
        return {
            "message": "Entry created successfully",
            "file_path": file_path,
            "refined_content": refined_content
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model-config")
async def get_model_config():
    """Get current model configuration"""
    return current_model

@app.post("/model-config")
async def set_model_config(request: ModelConfigRequest):
    """Switch between OpenAI and local model"""
    try:
        if request.model_type not in ["openai", "local"]:
            raise HTTPException(status_code=400, detail="Model type must be 'openai' or 'local'")
        
        current_model["type"] = request.model_type
        agent.switch_model(request.model_type)
        
        model_name = "Gemma-3-12B (Local)" if request.model_type == "local" else "GPT-4o-mini (OpenAI)"
        return {
            "message": f"Successfully switched to {model_name}",
            "model_type": request.model_type
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)