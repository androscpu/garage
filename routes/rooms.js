const express = require('express');
const { Room, RoomType, Hotel, Booking, HousekeepingTask } = require('../models');
const { authenticateToken, authorize, checkHotelAccess } = require('../middleware/auth');
const { validateRoom, validateUUID } = require('../middleware/validation');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const router = express.Router();

// Get all rooms for a hotel
router.get('/hotel/:hotelId', authenticateToken, checkHotelAccess, validateUUID('hotelId'), async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { page = 1, limit = 20, status, floor, roomTypeId, search } = req.query;
    const offset = (page - 1) * limit;

    const where = { hotelId };
    if (status) where.status = status;
    if (floor) where.floor = parseInt(floor);
    if (roomTypeId) where.roomTypeId = roomTypeId;
    if (search) {
      where.roomNumber = { [Op.iLike]: `%${search}%` };
    }

    const { count, rows: rooms } = await Room.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['floor', 'ASC'], ['roomNumber', 'ASC']],
      include: [
        {
          model: RoomType,
          attributes: ['id', 'name', 'basePrice', 'maxOccupancy']
        },
        {
          model: Booking,
          where: { status: { [Op.in]: ['confirmed', 'checked_in'] } },
          required: false,
          attributes: ['id', 'checkInDate', 'checkOutDate', 'status'],
          include: [
            {
              model: Guest,
              attributes: ['firstName', 'lastName']
            }
          ]
        }
      ]
    });

    res.json({
      success: true,
      data: {
        rooms,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rooms'
    });
  }
});

// Get single room
router.get('/:roomId', authenticateToken, validateUUID('roomId'), async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findByPk(roomId, {
      include: [
        {
          model: RoomType,
          include: [{ model: Amenity }]
        },
        {
          model: Hotel,
          attributes: ['id', 'name']
        },
        {
          model: Booking,
          where: { status: { [Op.in]: ['confirmed', 'checked_in'] } },
          required: false,
          include: [
            {
              model: Guest,
              attributes: ['firstName', 'lastName', 'phone', 'email']
            }
          ]
        },
        {
          model: HousekeepingTask,
          where: { status: { [Op.ne]: 'completed' } },
          required: false,
          include: [
            {
              model: User,
              as: 'AssignedUser',
              attributes: ['firstName', 'lastName']
            }
          ]
        }
      ]
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== room.hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    logger.error('Get room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get room'
    });
  }
});

// Create room
router.post('/', authenticateToken, authorize('super_admin', 'hotel_admin', 'manager'), validateRoom, async (req, res) => {
  try {
    const { hotelId, roomNumber, floor, roomTypeId, features, notes } = req.body;

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check if room number already exists in hotel
    const existingRoom = await Room.findOne({
      where: { hotelId, roomNumber }
    });

    if (existingRoom) {
      return res.status(400).json({
        success: false,
        error: 'Room number already exists in this hotel'
      });
    }

    // Verify room type belongs to the hotel
    const roomType = await RoomType.findOne({
      where: { id: roomTypeId, hotelId }
    });

    if (!roomType) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room type for this hotel'
      });
    }

    const room = await Room.create({
      hotelId,
      roomNumber,
      floor,
      roomTypeId,
      features: features || {},
      notes
    });

    logger.info(`Room created by ${req.user.email}: ${roomNumber} in hotel ${hotelId}`);

    res.status(201).json({
      success: true,
      data: room
    });
  } catch (error) {
    logger.error('Create room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create room'
    });
  }
});

// Update room
router.put('/:roomId', authenticateToken, authorize('super_admin', 'hotel_admin', 'manager', 'receptionist'), validateUUID('roomId'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const { status, condition, features, notes, lastCleaned, lastMaintenance } = req.body;

    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== room.hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (condition) updateData.condition = condition;
    if (features) updateData.features = { ...room.features, ...features };
    if (notes !== undefined) updateData.notes = notes;
    if (lastCleaned) updateData.lastCleaned = new Date(lastCleaned);
    if (lastMaintenance) updateData.lastMaintenance = new Date(lastMaintenance);

    await room.update(updateData);

    // Emit real-time update
    req.io.to(`hotel-${room.hotelId}`).emit('room-updated', {
      roomId: room.id,
      roomNumber: room.roomNumber,
      status: room.status,
      updatedBy: req.user.firstName + ' ' + req.user.lastName
    });

    logger.info(`Room updated by ${req.user.email}: ${room.roomNumber}`);

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    logger.error('Update room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update room'
    });
  }
});

// Delete room
router.delete('/:roomId', authenticateToken, authorize('super_admin', 'hotel_admin'), validateUUID('roomId'), async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== room.hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check if room has active bookings
    const activeBookings = await Booking.count({
      where: {
        roomId,
        status: { [Op.in]: ['confirmed', 'checked_in'] }
      }
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete room with active bookings'
      });
    }

    await room.destroy();

    logger.info(`Room deleted by ${req.user.email}: ${room.roomNumber}`);

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    logger.error('Delete room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete room'
    });
  }
});

// Get room availability
router.get('/:roomId/availability', authenticateToken, validateUUID('roomId'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }

    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== room.hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get conflicting bookings
    const conflictingBookings = await Booking.findAll({
      where: {
        roomId,
        status: { [Op.in]: ['confirmed', 'checked_in'] },
        [Op.or]: [
          {
            checkInDate: { [Op.between]: [startDate, endDate] }
          },
          {
            checkOutDate: { [Op.between]: [startDate, endDate] }
          },
          {
            [Op.and]: [
              { checkInDate: { [Op.lte]: startDate } },
              { checkOutDate: { [Op.gte]: endDate } }
            ]
          }
        ]
      },
      include: [
        {
          model: Guest,
          attributes: ['firstName', 'lastName']
        }
      ]
    });

    const isAvailable = conflictingBookings.length === 0 && room.status === 'available';

    res.json({
      success: true,
      data: {
        roomId,
        roomNumber: room.roomNumber,
        isAvailable,
        conflictingBookings,
        roomStatus: room.status
      }
    });
  } catch (error) {
    logger.error('Get room availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check room availability'
    });
  }
});

// Get room types for a hotel
router.get('/hotel/:hotelId/types', authenticateToken, checkHotelAccess, validateUUID('hotelId'), async (req, res) => {
  try {
    const { hotelId } = req.params;

    const roomTypes = await RoomType.findAll({
      where: { hotelId, isActive: true },
      include: [
        {
          model: Room,
          attributes: ['id', 'roomNumber', 'status']
        },
        {
          model: Amenity
        }
      ],
      order: [['basePrice', 'ASC']]
    });

    res.json({
      success: true,
      data: roomTypes
    });
  } catch (error) {
    logger.error('Get room types error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get room types'
    });
  }
});

// Create room type
router.post('/types', authenticateToken, authorize('super_admin', 'hotel_admin', 'manager'), async (req, res) => {
  try {
    const { hotelId, name, description, basePrice, maxOccupancy, bedConfiguration, size, amenities } = req.body;

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const roomType = await RoomType.create({
      hotelId,
      name,
      description,
      basePrice,
      maxOccupancy,
      bedConfiguration: bedConfiguration || { doubleBeds: 1 },
      size,
      amenities: amenities || []
    });

    logger.info(`Room type created by ${req.user.email}: ${name} in hotel ${hotelId}`);

    res.status(201).json({
      success: true,
      data: roomType
    });
  } catch (error) {
    logger.error('Create room type error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create room type'
    });
  }
});

// Update room type
router.put('/types/:roomTypeId', authenticateToken, authorize('super_admin', 'hotel_admin', 'manager'), validateUUID('roomTypeId'), async (req, res) => {
  try {
    const { roomTypeId } = req.params;
    const updateData = req.body;

    const roomType = await RoomType.findByPk(roomTypeId);
    if (!roomType) {
      return res.status(404).json({
        success: false,
        error: 'Room type not found'
      });
    }

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== roomType.hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    await roomType.update(updateData);

    logger.info(`Room type updated by ${req.user.email}: ${roomType.name}`);

    res.json({
      success: true,
      data: roomType
    });
  } catch (error) {
    logger.error('Update room type error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update room type'
    });
  }
});

// Delete room type
router.delete('/types/:roomTypeId', authenticateToken, authorize('super_admin', 'hotel_admin'), validateUUID('roomTypeId'), async (req, res) => {
  try {
    const { roomTypeId } = req.params;

    const roomType = await RoomType.findByPk(roomTypeId);
    if (!roomType) {
      return res.status(404).json({
        success: false,
        error: 'Room type not found'
      });
    }

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== roomType.hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check if room type has rooms
    const roomCount = await Room.count({ where: { roomTypeId } });
    if (roomCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete room type that has rooms assigned'
      });
    }

    await roomType.destroy();

    logger.info(`Room type deleted by ${req.user.email}: ${roomType.name}`);

    res.json({
      success: true,
      message: 'Room type deleted successfully'
    });
  } catch (error) {
    logger.error('Delete room type error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete room type'
    });
  }
});

module.exports = router;