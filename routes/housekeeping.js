const express = require('express');
const { HousekeepingTask, Room, RoomType, Hotel, Booking, Guest, User } = require('../models');
const { authenticateToken, authorize, checkHotelAccess } = require('../middleware/auth');
const { validateHousekeepingTask, validateUUID } = require('../middleware/validation');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const moment = require('moment');

const router = express.Router();

// Get all housekeeping tasks for a hotel
router.get('/hotel/:hotelId', authenticateToken, checkHotelAccess, validateUUID('hotelId'), async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      type, 
      priority,
      assignedTo,
      roomNumber,
      date
    } = req.query;
    const offset = (page - 1) * limit;

    const where = { hotelId };
    if (status) where.status = status;
    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedTo = assignedTo;
    if (date) {
      const startOfDay = moment(date).startOf('day').toDate();
      const endOfDay = moment(date).endOf('day').toDate();
      where.scheduledFor = { [Op.between]: [startOfDay, endOfDay] };
    }

    const include = [
      {
        model: Room,
        attributes: ['id', 'roomNumber', 'floor', 'status'],
        include: [{ model: RoomType, attributes: ['name'] }],
        where: roomNumber ? { roomNumber: { [Op.iLike]: `%${roomNumber}%` } } : undefined
      },
      {
        model: User,
        as: 'AssignedUser',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false
      },
      {
        model: Booking,
        attributes: ['id', 'bookingNumber', 'checkInDate', 'checkOutDate'],
        include: [
          {
            model: Guest,
            attributes: ['firstName', 'lastName']
          }
        ],
        required: false
      }
    ];

    const { count, rows: tasks } = await HousekeepingTask.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [
        ['priority', 'DESC'],
        ['scheduledFor', 'ASC'],
        ['createdAt', 'DESC']
      ]
    });

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get housekeeping tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get housekeeping tasks'
    });
  }
});

// Get single housekeeping task
router.get('/:taskId', authenticateToken, validateUUID('taskId'), async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await HousekeepingTask.findByPk(taskId, {
      include: [
        {
          model: Room,
          include: [{ model: RoomType }]
        },
        {
          model: User,
          as: 'AssignedUser',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Booking,
          include: [
            {
              model: Guest,
              attributes: ['firstName', 'lastName', 'phone']
            }
          ]
        },
        {
          model: Hotel,
          attributes: ['id', 'name']
        }
      ]
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Housekeeping task not found'
      });
    }

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== task.hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('Get housekeeping task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get housekeeping task'
    });
  }
});

// Create housekeeping task
router.post('/', authenticateToken, authorize('super_admin', 'hotel_admin', 'manager', 'receptionist'), validateHousekeepingTask, async (req, res) => {
  try {
    const {
      hotelId,
      roomId,
      bookingId,
      type,
      title,
      description,
      priority,
      scheduledFor,
      estimatedDuration,
      assignedTo,
      checklist,
      supplies
    } = req.body;

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Verify room belongs to hotel
    const room = await Room.findOne({ where: { id: roomId, hotelId } });
    if (!room) {
      return res.status(400).json({
        success: false,
        error: 'Room not found in this hotel'
      });
    }

    // Verify assigned user belongs to hotel (if specified)
    if (assignedTo) {
      const user = await User.findOne({ 
        where: { 
          id: assignedTo, 
          hotelId,
          role: { [Op.in]: ['housekeeping', 'maintenance', 'manager'] }
        } 
      });
      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'Assigned user not found or invalid role'
        });
      }
    }

    const task = await HousekeepingTask.create({
      hotelId,
      roomId,
      bookingId,
      type,
      title,
      description,
      priority: priority || 'medium',
      scheduledFor: scheduledFor || new Date(),
      estimatedDuration,
      assignedTo,
      checklist: checklist || [],
      supplies: supplies || []
    });

    // Emit real-time notification
    req.io.to(`hotel-${hotelId}`).emit('new-housekeeping-task', {
      taskId: task.id,
      roomNumber: room.roomNumber,
      type: task.type,
      priority: task.priority,
      createdBy: req.user.firstName + ' ' + req.user.lastName
    });

    logger.info(`Housekeeping task created by ${req.user.email}: ${title}`);

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('Create housekeeping task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create housekeeping task'
    });
  }
});

// Update housekeeping task
router.put('/:taskId', authenticateToken, validateUUID('taskId'), async (req, res) => {
  try {
    const { taskId } = req.params;
    const updateData = req.body;

    const task = await HousekeepingTask.findByPk(taskId, {
      include: [{ model: Room }]
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Housekeeping task not found'
      });
    }

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== task.hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check if user can update this task
    const canUpdate = req.user.role === 'super_admin' || 
                     req.user.role === 'hotel_admin' || 
                     req.user.role === 'manager' ||
                     task.assignedTo === req.user.id;

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        error: 'You can only update tasks assigned to you'
      });
    }

    // Handle status changes
    if (updateData.status) {
      if (updateData.status === 'in_progress' && task.status === 'pending') {
        updateData.startedAt = new Date();
      } else if (updateData.status === 'completed' && task.status !== 'completed') {
        updateData.completedAt = new Date();
        
        // Calculate actual duration
        if (task.startedAt) {
          const duration = Math.round((new Date() - new Date(task.startedAt)) / 60000); // minutes
          updateData.actualDuration = duration;
        }

        // Update room status based on task type
        if (task.type === 'cleaning' || task.type === 'checkout_clean') {
          await Room.update(
            { 
              status: 'available',
              lastCleaned: new Date()
            },
            { where: { id: task.roomId } }
          );
        } else if (task.type === 'maintenance') {
          await Room.update(
            { 
              status: 'available',
              lastMaintenance: new Date()
            },
            { where: { id: task.roomId } }
          );
        }
      }
    }

    // Handle checklist updates
    if (updateData.checklist) {
      updateData.checklist = updateData.checklist.map(item => ({
        ...item,
        completedAt: item.completed ? new Date() : null,
        completedBy: item.completed ? req.user.id : null
      }));
    }

    await task.update(updateData);

    // Emit real-time update
    req.io.to(`hotel-${task.hotelId}`).emit('housekeeping-task-updated', {
      taskId: task.id,
      roomNumber: task.Room?.roomNumber,
      status: task.status,
      updatedBy: req.user.firstName + ' ' + req.user.lastName
    });

    logger.info(`Housekeeping task updated by ${req.user.email}: ${task.title}`);

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('Update housekeeping task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update housekeeping task'
    });
  }
});

// Delete housekeeping task
router.delete('/:taskId', authenticateToken, authorize('super_admin', 'hotel_admin', 'manager'), validateUUID('taskId'), async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await HousekeepingTask.findByPk(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Housekeeping task not found'
      });
    }

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== task.hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (task.status === 'in_progress') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete task that is in progress'
      });
    }

    await task.destroy();

    logger.info(`Housekeeping task deleted by ${req.user.email}: ${task.title}`);

    res.json({
      success: true,
      message: 'Housekeeping task deleted successfully'
    });
  } catch (error) {
    logger.error('Delete housekeeping task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete housekeeping task'
    });
  }
});

// Assign task to user
router.post('/:taskId/assign', authenticateToken, authorize('super_admin', 'hotel_admin', 'manager'), validateUUID('taskId'), async (req, res) => {
  try {
    const { taskId } = req.params;
    const { assignedTo } = req.body;

    const task = await HousekeepingTask.findByPk(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Housekeeping task not found'
      });
    }

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== task.hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Verify assigned user
    if (assignedTo) {
      const user = await User.findOne({
        where: {
          id: assignedTo,
          hotelId: task.hotelId,
          role: { [Op.in]: ['housekeeping', 'maintenance', 'manager'] }
        }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'User not found or invalid role'
        });
      }
    }

    await task.update({ assignedTo });

    // Emit real-time notification
    if (assignedTo) {
      req.io.to(`user-${assignedTo}`).emit('task-assigned', {
        taskId: task.id,
        title: task.title,
        priority: task.priority,
        scheduledFor: task.scheduledFor
      });
    }

    logger.info(`Task assigned by ${req.user.email}: ${task.title} to user ${assignedTo}`);

    res.json({
      success: true,
      data: task,
      message: 'Task assigned successfully'
    });
  } catch (error) {
    logger.error('Assign task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign task'
    });
  }
});

// Get my tasks (for housekeeping staff)
router.get('/my-tasks/:hotelId', authenticateToken, checkHotelAccess, validateUUID('hotelId'), async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { status, date } = req.query;

    const where = {
      hotelId,
      assignedTo: req.user.id
    };

    if (status) where.status = status;
    if (date) {
      const startOfDay = moment(date).startOf('day').toDate();
      const endOfDay = moment(date).endOf('day').toDate();
      where.scheduledFor = { [Op.between]: [startOfDay, endOfDay] };
    }

    const tasks = await HousekeepingTask.findAll({
      where,
      include: [
        {
          model: Room,
          attributes: ['id', 'roomNumber', 'floor'],
          include: [{ model: RoomType, attributes: ['name'] }]
        },
        {
          model: Booking,
          attributes: ['bookingNumber', 'checkInDate', 'checkOutDate'],
          include: [
            {
              model: Guest,
              attributes: ['firstName', 'lastName']
            }
          ],
          required: false
        }
      ],
      order: [
        ['priority', 'DESC'],
        ['scheduledFor', 'ASC']
      ]
    });

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    logger.error('Get my tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tasks'
    });
  }
});

// Get housekeeping dashboard
router.get('/hotel/:hotelId/dashboard', authenticateToken, checkHotelAccess, validateUUID('hotelId'), async (req, res) => {
  try {
    const { hotelId } = req.params;
    const today = moment().startOf('day').toDate();
    const endOfDay = moment().endOf('day').toDate();

    // Get task statistics
    const [
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
      todayTasks
    ] = await Promise.all([
      HousekeepingTask.count({ where: { hotelId } }),
      HousekeepingTask.count({ where: { hotelId, status: 'pending' } }),
      HousekeepingTask.count({ where: { hotelId, status: 'in_progress' } }),
      HousekeepingTask.count({ where: { hotelId, status: 'completed' } }),
      HousekeepingTask.count({
        where: {
          hotelId,
          status: { [Op.in]: ['pending', 'in_progress'] },
          scheduledFor: { [Op.lt]: new Date() }
        }
      }),
      HousekeepingTask.count({
        where: {
          hotelId,
          scheduledFor: { [Op.between]: [today, endOfDay] }
        }
      })
    ]);

    // Get room status overview
    const roomStatus = await Room.findAll({
      where: { hotelId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    // Get staff performance (tasks completed today)
    const staffPerformance = await HousekeepingTask.findAll({
      where: {
        hotelId,
        status: 'completed',
        completedAt: { [Op.between]: [today, endOfDay] }
      },
      attributes: [
        'assignedTo',
        [sequelize.fn('COUNT', sequelize.col('id')), 'tasksCompleted'],
        [sequelize.fn('AVG', sequelize.col('actualDuration')), 'avgDuration']
      ],
      include: [
        {
          model: User,
          as: 'AssignedUser',
          attributes: ['firstName', 'lastName']
        }
      ],
      group: ['assignedTo', 'AssignedUser.id'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });

    // Get urgent tasks
    const urgentTasks = await HousekeepingTask.findAll({
      where: {
        hotelId,
        status: { [Op.in]: ['pending', 'in_progress'] },
        priority: { [Op.in]: ['high', 'urgent'] }
      },
      include: [
        {
          model: Room,
          attributes: ['roomNumber']
        },
        {
          model: User,
          as: 'AssignedUser',
          attributes: ['firstName', 'lastName']
        }
      ],
      order: [['priority', 'DESC'], ['scheduledFor', 'ASC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        statistics: {
          totalTasks,
          pendingTasks,
          inProgressTasks,
          completedTasks,
          overdueTasks,
          todayTasks
        },
        roomStatus,
        staffPerformance,
        urgentTasks
      }
    });
  } catch (error) {
    logger.error('Get housekeeping dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get housekeeping dashboard'
    });
  }
});

// Bulk update tasks
router.post('/bulk-update', authenticateToken, authorize('super_admin', 'hotel_admin', 'manager'), async (req, res) => {
  try {
    const { taskIds, updateData } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Task IDs array is required'
      });
    }

    // Verify all tasks belong to user's hotel
    const tasks = await HousekeepingTask.findAll({
      where: { 
        id: { [Op.in]: taskIds },
        hotelId: req.user.role === 'super_admin' ? undefined : req.user.hotelId
      }
    });

    if (tasks.length !== taskIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Some tasks not found or access denied'
      });
    }

    await HousekeepingTask.update(updateData, {
      where: { id: { [Op.in]: taskIds } }
    });

    logger.info(`Bulk update by ${req.user.email}: ${taskIds.length} tasks updated`);

    res.json({
      success: true,
      message: `${taskIds.length} tasks updated successfully`
    });
  } catch (error) {
    logger.error('Bulk update tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tasks'
    });
  }
});

module.exports = router;