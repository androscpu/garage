import aiohttp
import os
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)


class ThreeCXService:
    """Service for integrating with 3CX Phone System"""
    
    def __init__(self):
        self.api_url = os.getenv("THREECX_API_URL", "")
        self.api_key = os.getenv("THREECX_API_KEY", "")
        self.extension_prefix = os.getenv("THREECX_EXTENSION_PREFIX", "2000")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def make_call(self, from_extension: str, to_number: str) -> Dict[str, Any]:
        """Initiate a call from an extension to a number"""
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "fromExtension": from_extension,
                    "toNumber": to_number
                }
                async with session.post(
                    f"{self.api_url}/calls/make",
                    headers=self.headers,
                    json=payload
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.error(f"Failed to make call: {response.status}")
                        return {"error": f"Failed to make call: {response.status}"}
        except Exception as e:
            logger.error(f"Error making call: {str(e)}")
            return {"error": str(e)}
    
    async def transfer_call(self, call_id: str, to_extension: str) -> Dict[str, Any]:
        """Transfer an active call to another extension"""
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "callId": call_id,
                    "toExtension": to_extension
                }
                async with session.post(
                    f"{self.api_url}/calls/transfer",
                    headers=self.headers,
                    json=payload
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.error(f"Failed to transfer call: {response.status}")
                        return {"error": f"Failed to transfer call: {response.status}"}
        except Exception as e:
            logger.error(f"Error transferring call: {str(e)}")
            return {"error": str(e)}
    
    async def get_call_status(self, call_id: str) -> Dict[str, Any]:
        """Get status of a specific call"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.api_url}/calls/{call_id}",
                    headers=self.headers
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.error(f"Failed to get call status: {response.status}")
                        return {"error": f"Failed to get call status: {response.status}"}
        except Exception as e:
            logger.error(f"Error getting call status: {str(e)}")
            return {"error": str(e)}
    
    async def get_active_calls(self) -> List[Dict[str, Any]]:
        """Get all active calls in the system"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.api_url}/calls/active",
                    headers=self.headers
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("calls", [])
                    else:
                        logger.error(f"Failed to get active calls: {response.status}")
                        return []
        except Exception as e:
            logger.error(f"Error getting active calls: {str(e)}")
            return []
    
    async def get_extension_info(self, extension: str) -> Dict[str, Any]:
        """Get information about an extension"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.api_url}/extensions/{extension}",
                    headers=self.headers
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.error(f"Failed to get extension info: {response.status}")
                        return {"error": f"Failed to get extension info: {response.status}"}
        except Exception as e:
            logger.error(f"Error getting extension info: {str(e)}")
            return {"error": str(e)}
    
    async def create_extension(self, extension_number: str, name: str, email: str) -> Dict[str, Any]:
        """Create a new extension in 3CX"""
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "number": extension_number,
                    "name": name,
                    "email": email
                }
                async with session.post(
                    f"{self.api_url}/extensions",
                    headers=self.headers,
                    json=payload
                ) as response:
                    if response.status == 200 or response.status == 201:
                        return await response.json()
                    else:
                        logger.error(f"Failed to create extension: {response.status}")
                        return {"error": f"Failed to create extension: {response.status}"}
        except Exception as e:
            logger.error(f"Error creating extension: {str(e)}")
            return {"error": str(e)}
    
    async def get_call_history(
        self, 
        extension: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get call history with optional filters"""
        try:
            params = {}
            if extension:
                params["extension"] = extension
            if start_date:
                params["startDate"] = start_date
            if end_date:
                params["endDate"] = end_date
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.api_url}/calls/history",
                    headers=self.headers,
                    params=params
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("calls", [])
                    else:
                        logger.error(f"Failed to get call history: {response.status}")
                        return []
        except Exception as e:
            logger.error(f"Error getting call history: {str(e)}")
            return []
    
    async def set_presence(self, extension: str, status: str) -> Dict[str, Any]:
        """Set presence status for an extension (Available, Away, DND, etc.)"""
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "extension": extension,
                    "status": status
                }
                async with session.post(
                    f"{self.api_url}/presence",
                    headers=self.headers,
                    json=payload
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.error(f"Failed to set presence: {response.status}")
                        return {"error": f"Failed to set presence: {response.status}"}
        except Exception as e:
            logger.error(f"Error setting presence: {str(e)}")
            return {"error": str(e)}
    
    async def get_room_extension(self, room_number: str) -> str:
        """Generate extension number for a room"""
        # Simple logic: room 101 -> extension 2101
        try:
            room_num = int(room_number)
            return f"{self.extension_prefix}{room_num}"
        except:
            return f"{self.extension_prefix}{room_number}"
    
    async def park_call(self, call_id: str) -> Dict[str, Any]:
        """Park a call"""
        try:
            async with aiohttp.ClientSession() as session:
                payload = {"callId": call_id}
                async with session.post(
                    f"{self.api_url}/calls/park",
                    headers=self.headers,
                    json=payload
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.error(f"Failed to park call: {response.status}")
                        return {"error": f"Failed to park call: {response.status}"}
        except Exception as e:
            logger.error(f"Error parking call: {str(e)}")
            return {"error": str(e)}
    
    async def send_sms(self, to_number: str, message: str) -> Dict[str, Any]:
        """Send SMS through 3CX (if SMS provider is configured)"""
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "toNumber": to_number,
                    "message": message
                }
                async with session.post(
                    f"{self.api_url}/sms/send",
                    headers=self.headers,
                    json=payload
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.error(f"Failed to send SMS: {response.status}")
                        return {"error": f"Failed to send SMS: {response.status}"}
        except Exception as e:
            logger.error(f"Error sending SMS: {str(e)}")
            return {"error": str(e)}


# Global instance
threecx_service = ThreeCXService()
