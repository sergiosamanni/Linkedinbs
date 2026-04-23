
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Carica variabili d'ambiente
load_dotenv(dotenv_path="../.env")

async def make_admin():
    mongo_url = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
    db_name = os.getenv('DB_NAME', 'linkedinbs')
    
    print(f"Tentativo di connessione a {mongo_url}, DB: {db_name}")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    result = await db.users.update_many({}, {"$set": {"role": "admin"}})
    print(f"Successo: {result.modified_count} utenti impostati come ADMIN.")
    client.close()

if __name__ == "__main__":
    asyncio.run(make_admin())
