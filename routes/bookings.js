const express = require('express');
const { Booking, Room, RoomType, Guest, Hotel, Payment, HousekeepingTask, User } = require('../models');
const { authenticateToken, authorize, checkHotelAccess } = require('../middleware/auth');
const { validateBooking, validateUUID } = require('../middleware/validation');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const moment = require('moment');

const router = express.Router();

// Get all bookings for a hotel
router.get('/hotel/:hotelId', authenticateToken, checkHotelAccess, validateUUID('hotelId'), async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      checkInDate, 
      checkOutDate, 
      guestName,
      roomNumber,
      source
    } = req.query;
    const offset = (page - 1) * limit;

    const where = { hotelId };
    if (status) where.status = status;
    if (checkInDate) where.checkInDate = { [Op.gte]: checkInDate };
    if (checkOutDate) where.checkOutDate = { [Op.lte]: checkOutDate };
    if (source) where.source = source;

    const include = [
      {
        model: Guest,
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'vipStatus'],
        where: guestName ? {
          [Op.or]: [
            { firstName: { [Op.iLike]: `%${guestName}%` } },
            { lastName: { [Op.iLike]: `%${guestName}%` } }
          ]
        } : undefined
      },
      {
        model: Room,
        attributes: ['id', 'roomNumber', 'floor'],
        include: [{ model: RoomType, attributes: ['name'] }],
        where: roomNumber ? { roomNumber: { [Op.iLike]: `%${roomNumber}%` } } : undefined
      },
      {
        model: Payment,
        attributes: ['id', 'amount', 'status', 'method']
      }
    ];

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bookings'
    });
  }
});

// Get single booking
router.get('/:bookingId', authenticateToken, validateUUID('bookingId'), async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Guest,
          attributes: { exclude: ['createdAt', 'updatedAt'] }
        },
        {
          model: Room,
          include: [{ model: RoomType }]
        },
        {
          model: Hotel,
          attributes: ['id', 'name', 'address', 'phone', 'email']
        },
        {
          model: Payment,
          order: [['createdAt', 'DESC']]
        },
        {
          model: HousekeepingTask,
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

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== booking.hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    logger.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get booking'
    });
  }
});

// Create booking
router.post('/', authenticateToken, validateBooking, async (req, res) => {
  try {
    const {
      hotelId,
      roomId,
      guestId,
      checkInDate,
      checkOutDate,
      adults,
      children,
      totalAmount,
      specialRequests,
      source,
      ratePlan
    } = req.body;

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Validate dates
    const checkIn = moment(checkInDate);
    const checkOut = moment(checkOutDate);
    
    if (checkOut.isSameOrBefore(checkIn)) {
      return res.status(400).json({
        success: false,
        error: 'Check-out date must be after check-in date'
      });
    }

    // Check room availability if roomId is provided
    if (roomId) {
      const isAvailable = await checkRoomAvailability(roomId, checkInDate, checkOutDate);
      if (!isAvailable) {
        return res.status(400).json({
          success: false,
          error: 'Room is not available for the selected dates'
        });
      }
    }

    // Verify guest exists
    const guest = await Guest.findByPk(guestId);
    if (!guest) {
      return res.status(400).json({
        success: false,
        error: 'Guest not found'
      });
    }

    const booking = await Booking.create({
      hotelId,
      roomId,
      guestId,
      checkInDate,
      checkOutDate,
      adults,
      children: children || 0,
      totalAmount,
      specialRequests,
      source: source || 'direct',
      ratePlan: ratePlan || { name: 'Standard Rate', isRefundable: true }
    });

    // Update room status if room is assigned
    if (roomId) {
      await Room.update(
        { status: 'occupied' },
        { where: { id: roomId } }
      );
    }

    // Create housekeeping task for check-in preparation
    await HousekeepingTask.create({
      hotelId,
      roomId,
      bookingId: booking.id,
      type: 'checkin_prep',
      title: `Prepare room for check-in - ${booking.bookingNumber}`,
      description: `Prepare room for guest arrival on ${checkInDate}`,
      priority: 'medium',
      scheduledFor: moment(checkInDate).subtract(2, 'hours').toDate()
    });

    // Emit real-time notification
    req.io.to(`hotel-${hotelId}`).emit('new-booking', {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      guestName: `${guest.firstName} ${guest.lastName}`,
      checkInDate,
      createdBy: req.user.firstName + ' ' + req.user.lastName
    });

    logger.info(`Booking created by ${req.user.email}: ${booking.bookingNumber}`);

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    logger.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create booking'
    });
  }
});

// Update booking
router.put('/:bookingId', authenticateToken, validateUUID('bookingId'), async (req, res) => {
  try {
    const { bookingId } = req.params;
    const updateData = req.body;

    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: Room }]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== booking.hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Handle room change
    if (updateData.roomId && updateData.roomId !== booking.roomId) {
      // Check new room availability
      const isAvailable = await checkRoomAvailability(
        updateData.roomId, 
        updateData.checkInDate || booking.checkInDate,
        updateData.checkOutDate || booking.checkOutDate,
        bookingId
      );

      if (!isAvailable) {
        return res.status(400).json({
          success: false,
          error: 'New room is not available for the selected dates'
        });
      }

      // Update old room status
      if (booking.Room) {
        await Room.update(
          { status: 'available' },
          { where: { id: booking.roomId } }
        );
      }

      // Update new room status
      await Room.update(
        { status: 'occupied' },
        { where: { id: updateData.roomId } }
      );
    }

    await booking.update(updateData);

    // Emit real-time update
    req.io.to(`hotel-${booking.hotelId}`).emit('booking-updated', {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      updatedBy: req.user.firstName + ' ' + req.user.lastName
    });

    logger.info(`Booking updated by ${req.user.email}: ${booking.bookingNumber}`);

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    logger.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update booking'
    });
  }
});

// Check-in booking
router.post('/:bookingId/checkin', authenticateToken, validateUUID('bookingId'), async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { roomId, notes } = req.body;

    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: Guest }, { model: Room }]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== booking.hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        error: 'Only confirmed bookings can be checked in'
      });
    }

    // Assign room if not already assigned
    let finalRoomId = booking.roomId;
    if (roomId && roomId !== booking.roomId) {
      const isAvailable = await checkRoomAvailability(
        roomId, 
        booking.checkInDate,
        booking.checkOutDate,
        bookingId
      );

      if (!isAvailable) {
        return res.status(400).json({
          success: false,
          error: 'Selected room is not available'
        });
      }

      finalRoomId = roomId;
    }

    // Update booking
    await booking.update({
      status: 'checked_in',
      actualCheckInTime: new Date(),
      roomId: finalRoomId,
      notes: notes ? `${booking.notes || ''}\n${notes}` : booking.notes
    });

    // Update room status
    if (finalRoomId) {
      await Room.update(
        { status: 'occupied' },
        { where: { id: finalRoomId } }
      );
    }

    // Create checkout cleaning task
    await HousekeepingTask.create({
      hotelId: booking.hotelId,
      roomId: finalRoomId,
      bookingId: booking.id,
      type: 'checkout_clean',
      title: `Checkout cleaning - Room ${booking.Room?.roomNumber || 'TBD'}`,
      description: `Clean room after guest checkout on ${booking.checkOutDate}`,
      priority: 'high',
      scheduledFor: moment(booking.checkOutDate).add(1, 'hour').toDate()
    });

    // Update guest stats
    await Guest.increment(['totalStays'], { where: { id: booking.guestId } });

    // Emit real-time notification
    req.io.to(`hotel-${booking.hotelId}`).emit('guest-checkedin', {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      guestName: `${booking.Guest.firstName} ${booking.Guest.lastName}`,
      roomNumber: booking.Room?.roomNumber,
      checkedInBy: req.user.firstName + ' ' + req.user.lastName
    });

    logger.info(`Guest checked in by ${req.user.email}: ${booking.bookingNumber}`);

    res.json({
      success: true,
      data: booking,
      message: 'Guest checked in successfully'
    });
  } catch (error) {
    logger.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check in guest'
    });
  }
});

// Check-out booking
router.post('/:bookingId/checkout', authenticateToken, validateUUID('bookingId'), async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { charges, notes } = req.body;

    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: Guest }, { model: Room }]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== booking.hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (booking.status !== 'checked_in') {
      return res.status(400).json({
        success: false,
        error: 'Only checked-in guests can be checked out'
      });
    }

    // Calculate additional charges
    let additionalCharges = 0;
    if (charges && Array.isArray(charges)) {
      additionalCharges = charges.reduce((sum, charge) => sum + parseFloat(charge.amount || 0), 0);
    }

    // Update booking
    await booking.update({
      status: 'checked_out',
      actualCheckOutTime: new Date(),
      totalAmount: parseFloat(booking.totalAmount) + additionalCharges,
      notes: notes ? `${booking.notes || ''}\n${notes}` : booking.notes,
      extras: charges || []
    });

    // Update room status
    if (booking.roomId) {
      await Room.update(
        { status: 'cleaning' },
        { where: { id: booking.roomId } }
      );
    }

    // Update guest stats
    await Guest.increment(
      ['totalSpent'], 
      { 
        by: parseFloat(booking.totalAmount),
        where: { id: booking.guestId } 
      }
    );

    // Emit real-time notification
    req.io.to(`hotel-${booking.hotelId}`).emit('guest-checkedout', {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      guestName: `${booking.Guest.firstName} ${booking.Guest.lastName}`,
      roomNumber: booking.Room?.roomNumber,
      checkedOutBy: req.user.firstName + ' ' + req.user.lastName
    });

    logger.info(`Guest checked out by ${req.user.email}: ${booking.bookingNumber}`);

    res.json({
      success: true,
      data: booking,
      message: 'Guest checked out successfully'
    });
  } catch (error) {
    logger.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check out guest'
    });
  }
});

// Cancel booking
router.post('/:bookingId/cancel', authenticateToken, validateUUID('bookingId'), async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== booking.hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (['checked_out', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel this booking'
      });
    }

    await booking.update({
      status: 'cancelled',
      cancellationDate: new Date(),
      cancellationReason: reason
    });

    // Free up the room
    if (booking.roomId) {
      await Room.update(
        { status: 'available' },
        { where: { id: booking.roomId } }
      );
    }

    // Cancel related housekeeping tasks
    await HousekeepingTask.update(
      { status: 'cancelled' },
      { where: { bookingId, status: { [Op.in]: ['pending', 'in_progress'] } } }
    );

    logger.info(`Booking cancelled by ${req.user.email}: ${booking.bookingNumber}`);

    res.json({
      success: true,
      data: booking,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    logger.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel booking'
    });
  }
});

// Get availability for date range
router.get('/hotel/:hotelId/availability', authenticateToken, checkHotelAccess, validateUUID('hotelId'), async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { startDate, endDate, adults = 1, children = 0 } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }

    const availability = await getHotelAvailability(hotelId, startDate, endDate, adults, children);

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    logger.error('Get availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get availability'
    });
  }
});

// Helper function to check room availability
async function checkRoomAvailability(roomId, checkInDate, checkOutDate, excludeBookingId = null) {
  const where = {
    roomId,
    status: { [Op.in]: ['confirmed', 'checked_in'] },
    [Op.or]: [
      {
        checkInDate: { [Op.between]: [checkInDate, checkOutDate] }
      },
      {
        checkOutDate: { [Op.between]: [checkInDate, checkOutDate] }
      },
      {
        [Op.and]: [
          { checkInDate: { [Op.lte]: checkInDate } },
          { checkOutDate: { [Op.gte]: checkOutDate } }
        ]
      }
    ]
  };

  if (excludeBookingId) {
    where.id = { [Op.ne]: excludeBookingId };
  }

  const conflictingBookings = await Booking.count({ where });
  return conflictingBookings === 0;
}

// Helper function to get hotel availability
async function getHotelAvailability(hotelId, startDate, endDate, adults, children) {
  try {
    // Get all room types for the hotel
    const roomTypes = await RoomType.findAll({
      where: { hotelId, isActive: true },
      include: [
        {
          model: Room,
          where: { status: { [Op.in]: ['available', 'occupied'] } }
        }
      ]
    });

    const availability = [];

    for (const roomType of roomTypes) {
      // Check if room type can accommodate the guests
      if (roomType.maxOccupancy >= (parseInt(adults) + parseInt(children))) {
        // Get available rooms for this type
        const availableRooms = [];

        for (const room of roomType.Rooms) {
          const isAvailable = await checkRoomAvailability(room.id, startDate, endDate);
          if (isAvailable) {
            availableRooms.push(room);
          }
        }

        if (availableRooms.length > 0) {
          availability.push({
            roomType: {
              id: roomType.id,
              name: roomType.name,
              description: roomType.description,
              basePrice: roomType.basePrice,
              maxOccupancy: roomType.maxOccupancy,
              bedConfiguration: roomType.bedConfiguration,
              size: roomType.size,
              amenities: roomType.amenities,
              images: roomType.images
            },
            availableRooms: availableRooms.length,
            rooms: availableRooms.map(room => ({
              id: room.id,
              roomNumber: room.roomNumber,
              floor: room.floor,
              features: room.features
            }))
          });
        }
      }
    }

    return {
      checkInDate: startDate,
      checkOutDate: endDate,
      adults: parseInt(adults),
      children: parseInt(children),
      availability
    };
  } catch (error) {
    logger.error('Get hotel availability error:', error);
    return { availability: [] };
  }
}

module.exports = router;