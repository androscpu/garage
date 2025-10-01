from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime
from typing import List, Optional

from backend.models import (
    HousekeepingTask, 
    Room, 
    RoomStatus,
    HousekeepingTaskStatus,
    HousekeepingTaskType,
    User,
    UserRole
)
from backend.schemas import HousekeepingTaskCreate, HousekeepingTaskUpdate


class HousekeepingService:
    """Service for managing housekeeping operations"""
    
    async def create_task(
        self,
        db: AsyncSession,
        task_data: HousekeepingTaskCreate
    ) -> HousekeepingTask:
        """Create a new housekeeping task"""
        task = HousekeepingTask(**task_data.model_dump())
        
        # Update room status if it's a cleaning task
        if task.task_type in [HousekeepingTaskType.CLEANING, HousekeepingTaskType.DEEP_CLEANING]:
            result = await db.execute(select(Room).where(Room.id == task.room_id))
            room = result.scalar_one_or_none()
            if room and room.status != RoomStatus.OCCUPIED:
                room.status = RoomStatus.CLEANING
        
        db.add(task)
        await db.commit()
        await db.refresh(task)
        
        return task
    
    async def assign_task(
        self,
        db: AsyncSession,
        task_id: int,
        user_id: int
    ) -> HousekeepingTask:
        """Assign a task to a staff member"""
        # Verify user is housekeeping staff
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user or user.role not in [UserRole.HOUSEKEEPING, UserRole.ADMIN, UserRole.MANAGER]:
            raise ValueError("User is not authorized for housekeeping tasks")
        
        # Get task
        result = await db.execute(select(HousekeepingTask).where(HousekeepingTask.id == task_id))
        task = result.scalar_one_or_none()
        
        if not task:
            raise ValueError("Task not found")
        
        task.assigned_to = user_id
        
        await db.commit()
        await db.refresh(task)
        
        return task
    
    async def start_task(
        self,
        db: AsyncSession,
        task_id: int
    ) -> HousekeepingTask:
        """Mark a task as started"""
        result = await db.execute(select(HousekeepingTask).where(HousekeepingTask.id == task_id))
        task = result.scalar_one_or_none()
        
        if not task:
            raise ValueError("Task not found")
        
        if task.status != HousekeepingTaskStatus.PENDING:
            raise ValueError("Only pending tasks can be started")
        
        task.status = HousekeepingTaskStatus.IN_PROGRESS
        task.started_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(task)
        
        return task
    
    async def complete_task(
        self,
        db: AsyncSession,
        task_id: int,
        notes: Optional[str] = None
    ) -> HousekeepingTask:
        """Mark a task as completed"""
        result = await db.execute(select(HousekeepingTask).where(HousekeepingTask.id == task_id))
        task = result.scalar_one_or_none()
        
        if not task:
            raise ValueError("Task not found")
        
        if task.status != HousekeepingTaskStatus.IN_PROGRESS:
            raise ValueError("Only in-progress tasks can be completed")
        
        task.status = HousekeepingTaskStatus.COMPLETED
        task.completed_at = datetime.utcnow()
        
        if notes:
            task.notes = notes
        
        await db.commit()
        await db.refresh(task)
        
        return task
    
    async def verify_task(
        self,
        db: AsyncSession,
        task_id: int,
        verified_by: int
    ) -> HousekeepingTask:
        """Verify a completed task"""
        result = await db.execute(select(HousekeepingTask).where(HousekeepingTask.id == task_id))
        task = result.scalar_one_or_none()
        
        if not task:
            raise ValueError("Task not found")
        
        if task.status != HousekeepingTaskStatus.COMPLETED:
            raise ValueError("Only completed tasks can be verified")
        
        task.status = HousekeepingTaskStatus.VERIFIED
        task.verified_at = datetime.utcnow()
        task.verified_by = verified_by
        
        # Update room status to available if it was a cleaning task
        if task.task_type in [HousekeepingTaskType.CLEANING, HousekeepingTaskType.DEEP_CLEANING]:
            result = await db.execute(select(Room).where(Room.id == task.room_id))
            room = result.scalar_one_or_none()
            if room and room.status == RoomStatus.CLEANING:
                room.status = RoomStatus.AVAILABLE
        
        await db.commit()
        await db.refresh(task)
        
        return task
    
    async def get_pending_tasks(
        self,
        db: AsyncSession,
        assigned_to: Optional[int] = None
    ) -> List[HousekeepingTask]:
        """Get all pending tasks"""
        query = select(HousekeepingTask).where(
            HousekeepingTask.status.in_([
                HousekeepingTaskStatus.PENDING,
                HousekeepingTaskStatus.IN_PROGRESS
            ])
        ).order_by(HousekeepingTask.priority.desc(), HousekeepingTask.created_at)
        
        if assigned_to:
            query = query.where(HousekeepingTask.assigned_to == assigned_to)
        
        result = await db.execute(query)
        tasks = result.scalars().all()
        
        return list(tasks)
    
    async def get_tasks_by_room(
        self,
        db: AsyncSession,
        room_id: int,
        status: Optional[HousekeepingTaskStatus] = None
    ) -> List[HousekeepingTask]:
        """Get all tasks for a specific room"""
        query = select(HousekeepingTask).where(HousekeepingTask.room_id == room_id)
        
        if status:
            query = query.where(HousekeepingTask.status == status)
        
        query = query.order_by(HousekeepingTask.created_at.desc())
        
        result = await db.execute(query)
        tasks = result.scalars().all()
        
        return list(tasks)
    
    async def auto_create_checkout_cleaning_task(
        self,
        db: AsyncSession,
        room_id: int,
        priority: int = 1
    ) -> HousekeepingTask:
        """Automatically create a cleaning task after checkout"""
        task_data = HousekeepingTaskCreate(
            room_id=room_id,
            task_type=HousekeepingTaskType.CLEANING,
            priority=priority,
            description="Post-checkout cleaning",
            checklist=[
                {"item": "Change bed linens", "completed": False},
                {"item": "Clean bathroom", "completed": False},
                {"item": "Vacuum and mop floors", "completed": False},
                {"item": "Dust all surfaces", "completed": False},
                {"item": "Replenish amenities", "completed": False},
                {"item": "Check minibar", "completed": False},
                {"item": "Empty trash", "completed": False},
                {"item": "Check all appliances", "completed": False},
            ]
        )
        
        return await self.create_task(db, task_data)
    
    async def get_staff_workload(
        self,
        db: AsyncSession
    ) -> List[dict]:
        """Get workload statistics for housekeeping staff"""
        # Get all housekeeping staff
        result = await db.execute(
            select(User).where(User.role == UserRole.HOUSEKEEPING)
        )
        staff = result.scalars().all()
        
        workload = []
        for staff_member in staff:
            # Count pending and in-progress tasks
            result = await db.execute(
                select(HousekeepingTask).where(
                    and_(
                        HousekeepingTask.assigned_to == staff_member.id,
                        HousekeepingTask.status.in_([
                            HousekeepingTaskStatus.PENDING,
                            HousekeepingTaskStatus.IN_PROGRESS
                        ])
                    )
                )
            )
            tasks = result.scalars().all()
            
            workload.append({
                "staff_id": staff_member.id,
                "staff_name": staff_member.full_name,
                "pending_tasks": len([t for t in tasks if t.status == HousekeepingTaskStatus.PENDING]),
                "in_progress_tasks": len([t for t in tasks if t.status == HousekeepingTaskStatus.IN_PROGRESS]),
                "total_tasks": len(tasks)
            })
        
        return workload


# Global instance
housekeeping_service = HousekeepingService()
