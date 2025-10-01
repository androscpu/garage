from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from backend.database import get_db
from backend.models import HousekeepingTask, User, UserRole
from backend.schemas import HousekeepingTaskCreate, HousekeepingTaskUpdate, HousekeepingTaskResponse
from backend.auth import get_current_active_user, require_role
from backend.services.housekeeping_service import housekeeping_service

router = APIRouter(prefix="/api/housekeeping", tags=["Housekeeping"])


@router.post("/tasks", response_model=HousekeepingTaskResponse, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.HOUSEKEEPING]))])
async def create_housekeeping_task(
    task_data: HousekeepingTaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new housekeeping task"""
    try:
        task = await housekeeping_service.create_task(db, task_data)
        return task
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tasks", response_model=List[HousekeepingTaskResponse], dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.HOUSEKEEPING]))])
async def get_housekeeping_tasks(
    assigned_to: Optional[int] = None,
    room_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get housekeeping tasks"""
    query = select(HousekeepingTask)
    
    # Housekeeping staff can only see their own tasks
    if current_user.role == UserRole.HOUSEKEEPING:
        query = query.where(HousekeepingTask.assigned_to == current_user.id)
    elif assigned_to:
        query = query.where(HousekeepingTask.assigned_to == assigned_to)
    
    if room_id:
        query = query.where(HousekeepingTask.room_id == room_id)
    
    query = query.order_by(HousekeepingTask.priority.desc(), HousekeepingTask.created_at)
    
    result = await db.execute(query)
    tasks = result.scalars().all()
    return list(tasks)


@router.get("/tasks/pending", response_model=List[HousekeepingTaskResponse], dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.HOUSEKEEPING]))])
async def get_pending_tasks(
    assigned_to: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all pending housekeeping tasks"""
    # Housekeeping staff see only their tasks
    if current_user.role == UserRole.HOUSEKEEPING:
        assigned_to = current_user.id
    
    tasks = await housekeeping_service.get_pending_tasks(db, assigned_to)
    return tasks


@router.get("/tasks/{task_id}", response_model=HousekeepingTaskResponse, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.HOUSEKEEPING]))])
async def get_housekeeping_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific housekeeping task"""
    result = await db.execute(select(HousekeepingTask).where(HousekeepingTask.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check permissions
    if current_user.role == UserRole.HOUSEKEEPING and task.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this task")
    
    return task


@router.put("/tasks/{task_id}", response_model=HousekeepingTaskResponse, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.HOUSEKEEPING]))])
async def update_housekeeping_task(
    task_id: int,
    task_data: HousekeepingTaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a housekeeping task"""
    result = await db.execute(select(HousekeepingTask).where(HousekeepingTask.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check permissions
    if current_user.role == UserRole.HOUSEKEEPING and task.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this task")
    
    # Update fields
    update_data = task_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    
    await db.commit()
    await db.refresh(task)
    
    return task


@router.post("/tasks/{task_id}/assign", response_model=HousekeepingTaskResponse, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))])
async def assign_task(
    task_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Assign a task to a staff member"""
    try:
        task = await housekeeping_service.assign_task(db, task_id, user_id)
        return task
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tasks/{task_id}/start", response_model=HousekeepingTaskResponse, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.HOUSEKEEPING]))])
async def start_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Start a housekeeping task"""
    try:
        task = await housekeeping_service.start_task(db, task_id)
        return task
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tasks/{task_id}/complete", response_model=HousekeepingTaskResponse, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER, UserRole.HOUSEKEEPING]))])
async def complete_task(
    task_id: int,
    notes: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Complete a housekeeping task"""
    try:
        task = await housekeeping_service.complete_task(db, task_id, notes)
        return task
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tasks/{task_id}/verify", response_model=HousekeepingTaskResponse, dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))])
async def verify_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Verify a completed housekeeping task"""
    try:
        task = await housekeeping_service.verify_task(db, task_id, current_user.id)
        return task
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/workload", dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))])
async def get_staff_workload(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get workload statistics for housekeeping staff"""
    workload = await housekeeping_service.get_staff_workload(db)
    return workload
