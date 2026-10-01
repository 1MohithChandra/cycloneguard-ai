import asyncio
import httpx

from voice_server import find_nearest_ocean_point


async def main():
    async with httpx.AsyncClient(timeout=60) as client:
        result = await find_nearest_ocean_point(
            client,
            12.9716,
            77.5946
        )

        print("RESULT:")
        print(result)


asyncio.run(main())