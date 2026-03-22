from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from typing import AsyncGenerator


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
