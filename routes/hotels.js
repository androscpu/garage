const express = require('express');
const { Hotel, Room, RoomType, User, Booking } = require('../models');
const { authenticateToken, authorize, checkHotelAccess } = require('../middleware/auth');
const { validateHotel, validateUUID } = require('../middleware/validation');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const router = express.Router();

// Get all hotels (super admin only)
router.get('/', authenticateToken, authorize('super_admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isActive } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { 'address.city': { [Op.iLike]: `%${search}%` } },
        { 'address.country': { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const { count, rows: hotels } = await Hotel.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
          where: { role: 'hotel_admin' },
          required: false
        }
      ]
    });

    res.json({
      success: true,
      data: {
        hotels,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get hotels error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get hotels'
    });
  }
});

// Get single hotel
router.get('/:hotelId', authenticateToken, checkHotelAccess, validateUUID('hotelId'), async (req, res) => {
  try {
    const { hotelId } = req.params;

    const hotel = await Hotel.findByPk(hotelId, {
      include: [
        {
          model: Room,
          include: [{ model: RoomType }]
        },
        {
          model: RoomType,
          include: [{ model: Room }]
        },
        {
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive']
        }
      ]
    });

    if (!hotel) {
      return res.status(404).json({
        success: false,
        error: 'Hotel not found'
      });
    }

    // Get hotel statistics
    const stats = await getHotelStats(hotelId);

    res.json({
      success: true,
      data: {
        hotel,
        stats
      }
    });
  } catch (error) {
    logger.error('Get hotel error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get hotel'
    });
  }
});

// Create hotel (super admin only)
router.post('/', authenticateToken, authorize('super_admin'), validateHotel, async (req, res) => {
  try {
    const hotelData = req.body;
    
    const hotel = await Hotel.create(hotelData);

    logger.info(`Hotel created by ${req.user.email}: ${hotel.name}`);

    res.status(201).json({
      success: true,
      data: hotel
    });
  } catch (error) {
    logger.error('Create hotel error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create hotel'
    });
  }
});

// Update hotel
router.put('/:hotelId', authenticateToken, authorize('super_admin', 'hotel_admin'), checkHotelAccess, validateUUID('hotelId'), async (req, res) => {
  try {
    const { hotelId } = req.params;
    const updateData = req.body;

    const hotel = await Hotel.findByPk(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        error: 'Hotel not found'
      });
    }

    await hotel.update(updateData);

    logger.info(`Hotel updated by ${req.user.email}: ${hotel.name}`);

    res.json({
      success: true,
      data: hotel
    });
  } catch (error) {
    logger.error('Update hotel error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update hotel'
    });
  }
});

// Delete hotel (super admin only)
router.delete('/:hotelId', authenticateToken, authorize('super_admin'), validateUUID('hotelId'), async (req, res) => {
  try {
    const { hotelId } = req.params;

    const hotel = await Hotel.findByPk(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        error: 'Hotel not found'
      });
    }

    // Check if hotel has active bookings
    const activeBookings = await Booking.count({
      where: {
        hotelId,
        status: { [Op.in]: ['confirmed', 'checked_in'] }
      }
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete hotel with active bookings'
      });
    }

    await hotel.destroy();

    logger.info(`Hotel deleted by ${req.user.email}: ${hotel.name}`);

    res.json({
      success: true,
      message: 'Hotel deleted successfully'
    });
  } catch (error) {
    logger.error('Delete hotel error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete hotel'
    });
  }
});

// Get hotel dashboard data
router.get('/:hotelId/dashboard', authenticateToken, checkHotelAccess, validateUUID('hotelId'), async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { period = '30' } = req.query; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get comprehensive dashboard data
    const dashboardData = await getDashboardData(hotelId, startDate);

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    logger.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard data'
    });
  }
});

// Helper function to get hotel statistics
async function getHotelStats(hotelId) {
  try {
    const [
      totalRooms,
      availableRooms,
      occupiedRooms,
      maintenanceRooms,
      totalBookings,
      activeBookings,
      todayCheckIns,
      todayCheckOuts
    ] = await Promise.all([
      Room.count({ where: { hotelId } }),
      Room.count({ where: { hotelId, status: 'available' } }),
      Room.count({ where: { hotelId, status: 'occupied' } }),
      Room.count({ where: { hotelId, status: { [Op.in]: ['maintenance', 'out_of_order'] } } }),
      Booking.count({ where: { hotelId } }),
      Booking.count({ where: { hotelId, status: { [Op.in]: ['confirmed', 'checked_in'] } } }),
      Booking.count({
        where: {
          hotelId,
          checkInDate: new Date().toISOString().split('T')[0],
          status: { [Op.ne]: 'cancelled' }
        }
      }),
      Booking.count({
        where: {
          hotelId,
          checkOutDate: new Date().toISOString().split('T')[0],
          status: 'checked_in'
        }
      })
    ]);

    const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(2) : 0;

    return {
      rooms: {
        total: totalRooms,
        available: availableRooms,
        occupied: occupiedRooms,
        maintenance: maintenanceRooms,
        occupancyRate: parseFloat(occupancyRate)
      },
      bookings: {
        total: totalBookings,
        active: activeBookings,
        todayCheckIns,
        todayCheckOuts
      }
    };
  } catch (error) {
    logger.error('Get hotel stats error:', error);
    return {};
  }
}

// Helper function to get comprehensive dashboard data
async function getDashboardData(hotelId, startDate) {
  try {
    const endDate = new Date();
    
    // Get revenue data
    const revenueData = await Booking.findAll({
      where: {
        hotelId,
        createdAt: { [Op.between]: [startDate, endDate] },
        status: { [Op.ne]: 'cancelled' }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'bookings']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
    });

    // Get room status distribution
    const roomStatus = await Room.findAll({
      where: { hotelId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    // Get booking sources
    const bookingSources = await Booking.findAll({
      where: {
        hotelId,
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      attributes: [
        'source',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['source']
    });

    // Get upcoming arrivals and departures
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const [todayArrivals, todayDepartures, tomorrowArrivals] = await Promise.all([
      Booking.findAll({
        where: {
          hotelId,
          checkInDate: today,
          status: { [Op.in]: ['confirmed', 'checked_in'] }
        },
        include: [
          { model: Guest, attributes: ['firstName', 'lastName', 'phone'] },
          { model: Room, attributes: ['roomNumber'] }
        ]
      }),
      Booking.findAll({
        where: {
          hotelId,
          checkOutDate: today,
          status: 'checked_in'
        },
        include: [
          { model: Guest, attributes: ['firstName', 'lastName', 'phone'] },
          { model: Room, attributes: ['roomNumber'] }
        ]
      }),
      Booking.findAll({
        where: {
          hotelId,
          checkInDate: tomorrow,
          status: 'confirmed'
        },
        include: [
          { model: Guest, attributes: ['firstName', 'lastName', 'phone'] },
          { model: Room, attributes: ['roomNumber'] }
        ]
      })
    ]);

    return {
      revenue: revenueData,
      roomStatus,
      bookingSources,
      arrivals: {
        today: todayArrivals,
        tomorrow: tomorrowArrivals
      },
      departures: {
        today: todayDepartures
      }
    };
  } catch (error) {
    logger.error('Get dashboard data error:', error);
    return {};
  }
}

module.exports = router;