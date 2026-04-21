import motor.motor_asyncio
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "linkedinbs")

class Database:
    client: motor.motor_asyncio.AsyncIOMotorClient = None
    db = None

db_inst = Database()

async def connect_to_mongo():
    db_inst.client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
    db_inst.db = db_inst.client[DB_NAME]
    print(f"Connesso a MongoDB: {DB_NAME}")

async def close_mongo_connection():
    db_inst.client.close()
    print("Connessione MongoDB chiusa")

def get_db():
    return db_inst.db
