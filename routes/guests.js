const express = require('express');
const { Guest, Booking, Hotel, Room, Review, ThreeCXCall } = require('../models');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateGuest, validateUUID } = require('../middleware/validation');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const router = express.Router();

// Get all guests
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      vipStatus, 
      blacklisted,
      hotelId 
    } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (vipStatus) where.vipStatus = vipStatus;
    if (blacklisted !== undefined) where.blacklisted = blacklisted === 'true';

    const include = [
      {
        model: Booking,
        attributes: ['id', 'hotelId', 'checkInDate', 'checkOutDate', 'status', 'totalAmount'],
        include: [
          {
            model: Hotel,
            attributes: ['id', 'name']
          }
        ]
      }
    ];

    // Filter by hotel if specified and user has access
    if (hotelId) {
      if (req.user.role !== 'super_admin' && req.user.hotelId !== hotelId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      include[0].where = { hotelId };
    } else if (req.user.role !== 'super_admin') {
      // Non-super admins can only see guests from their hotel
      include[0].where = { hotelId: req.user.hotelId };
    }

    const { count, rows: guests } = await Guest.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      distinct: true
    });

    res.json({
      success: true,
      data: {
        guests,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get guests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get guests'
    });
  }
});

// Get single guest
router.get('/:guestId', authenticateToken, validateUUID('guestId'), async (req, res) => {
  try {
    const { guestId } = req.params;

    const guest = await Guest.findByPk(guestId, {
      include: [
        {
          model: Booking,
          include: [
            {
              model: Hotel,
              attributes: ['id', 'name']
            },
            {
              model: Room,
              attributes: ['id', 'roomNumber']
            }
          ],
          order: [['createdAt', 'DESC']]
        },
        {
          model: Review,
          include: [
            {
              model: Hotel,
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: ThreeCXCall,
          order: [['startTime', 'DESC']],
          limit: 10
        }
      ]
    });

    if (!guest) {
      return res.status(404).json({
        success: false,
        error: 'Guest not found'
      });
    }

    // Check access - non-super admins can only see guests from their hotel
    if (req.user.role !== 'super_admin') {
      const hasAccess = guest.Bookings.some(booking => booking.hotelId === req.user.hotelId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: guest
    });
  } catch (error) {
    logger.error('Get guest error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get guest'
    });
  }
});

// Create guest
router.post('/', authenticateToken, validateGuest, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      nationality,
      passportNumber,
      address,
      preferences,
      emergencyContact
    } = req.body;

    // Check if guest already exists
    const existingGuest = await Guest.findOne({
      where: {
        [Op.or]: [
          { email },
          { phone: phone || null }
        ]
      }
    });

    if (existingGuest) {
      return res.status(400).json({
        success: false,
        error: 'Guest with this email or phone already exists',
        existingGuest: {
          id: existingGuest.id,
          firstName: existingGuest.firstName,
          lastName: existingGuest.lastName,
          email: existingGuest.email
        }
      });
    }

    const guest = await Guest.create({
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      nationality,
      passportNumber,
      address: address || {},
      preferences: preferences || {},
      emergencyContact: emergencyContact || {}
    });

    logger.info(`Guest created by ${req.user.email}: ${firstName} ${lastName}`);

    res.status(201).json({
      success: true,
      data: guest
    });
  } catch (error) {
    logger.error('Create guest error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create guest'
    });
  }
});

// Update guest
router.put('/:guestId', authenticateToken, validateUUID('guestId'), async (req, res) => {
  try {
    const { guestId } = req.params;
    const updateData = req.body;

    const guest = await Guest.findByPk(guestId);
    if (!guest) {
      return res.status(404).json({
        success: false,
        error: 'Guest not found'
      });
    }

    // Check access for non-super admins
    if (req.user.role !== 'super_admin') {
      const bookings = await Booking.findAll({
        where: { guestId, hotelId: req.user.hotelId }
      });
      
      if (bookings.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
    }

    // Handle nested object updates
    if (updateData.address) {
      updateData.address = { ...guest.address, ...updateData.address };
    }
    if (updateData.preferences) {
      updateData.preferences = { ...guest.preferences, ...updateData.preferences };
    }
    if (updateData.emergencyContact) {
      updateData.emergencyContact = { ...guest.emergencyContact, ...updateData.emergencyContact };
    }

    await guest.update(updateData);

    logger.info(`Guest updated by ${req.user.email}: ${guest.firstName} ${guest.lastName}`);

    res.json({
      success: true,
      data: guest
    });
  } catch (error) {
    logger.error('Update guest error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update guest'
    });
  }
});

// Delete guest
router.delete('/:guestId', authenticateToken, authorize('super_admin', 'hotel_admin'), validateUUID('guestId'), async (req, res) => {
  try {
    const { guestId } = req.params;

    const guest = await Guest.findByPk(guestId);
    if (!guest) {
      return res.status(404).json({
        success: false,
        error: 'Guest not found'
      });
    }

    // Check for active bookings
    const activeBookings = await Booking.count({
      where: {
        guestId,
        status: { [Op.in]: ['confirmed', 'checked_in'] }
      }
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete guest with active bookings'
      });
    }

    await guest.destroy();

    logger.info(`Guest deleted by ${req.user.email}: ${guest.firstName} ${guest.lastName}`);

    res.json({
      success: true,
      message: 'Guest deleted successfully'
    });
  } catch (error) {
    logger.error('Delete guest error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete guest'
    });
  }
});

// Blacklist/unblacklist guest
router.post('/:guestId/blacklist', authenticateToken, authorize('super_admin', 'hotel_admin', 'manager'), validateUUID('guestId'), async (req, res) => {
  try {
    const { guestId } = req.params;
    const { blacklisted, reason } = req.body;

    const guest = await Guest.findByPk(guestId);
    if (!guest) {
      return res.status(404).json({
        success: false,
        error: 'Guest not found'
      });
    }

    await guest.update({
      blacklisted: blacklisted === true,
      blacklistReason: blacklisted ? reason : null
    });

    logger.info(`Guest ${blacklisted ? 'blacklisted' : 'unblacklisted'} by ${req.user.email}: ${guest.firstName} ${guest.lastName}`);

    res.json({
      success: true,
      data: guest,
      message: `Guest ${blacklisted ? 'blacklisted' : 'unblacklisted'} successfully`
    });
  } catch (error) {
    logger.error('Blacklist guest error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update guest status'
    });
  }
});

// Update VIP status
router.post('/:guestId/vip-status', authenticateToken, authorize('super_admin', 'hotel_admin', 'manager'), validateUUID('guestId'), async (req, res) => {
  try {
    const { guestId } = req.params;
    const { vipStatus } = req.body;

    if (!['regular', 'silver', 'gold', 'platinum'].includes(vipStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid VIP status'
      });
    }

    const guest = await Guest.findByPk(guestId);
    if (!guest) {
      return res.status(404).json({
        success: false,
        error: 'Guest not found'
      });
    }

    await guest.update({ vipStatus });

    logger.info(`Guest VIP status updated by ${req.user.email}: ${guest.firstName} ${guest.lastName} -> ${vipStatus}`);

    res.json({
      success: true,
      data: guest,
      message: 'VIP status updated successfully'
    });
  } catch (error) {
    logger.error('Update VIP status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update VIP status'
    });
  }
});

// Add loyalty points
router.post('/:guestId/loyalty-points', authenticateToken, validateUUID('guestId'), async (req, res) => {
  try {
    const { guestId } = req.params;
    const { points, reason } = req.body;

    if (!points || isNaN(points)) {
      return res.status(400).json({
        success: false,
        error: 'Valid points amount is required'
      });
    }

    const guest = await Guest.findByPk(guestId);
    if (!guest) {
      return res.status(404).json({
        success: false,
        error: 'Guest not found'
      });
    }

    await guest.increment('loyaltyPoints', { by: parseInt(points) });
    await guest.reload();

    // Auto-upgrade VIP status based on points
    let newVipStatus = guest.vipStatus;
    if (guest.loyaltyPoints >= 10000 && guest.vipStatus !== 'platinum') {
      newVipStatus = 'platinum';
    } else if (guest.loyaltyPoints >= 5000 && !['gold', 'platinum'].includes(guest.vipStatus)) {
      newVipStatus = 'gold';
    } else if (guest.loyaltyPoints >= 1000 && !['silver', 'gold', 'platinum'].includes(guest.vipStatus)) {
      newVipStatus = 'silver';
    }

    if (newVipStatus !== guest.vipStatus) {
      await guest.update({ vipStatus: newVipStatus });
    }

    logger.info(`Loyalty points added by ${req.user.email}: ${points} points to ${guest.firstName} ${guest.lastName}`);

    res.json({
      success: true,
      data: guest,
      message: `${points} loyalty points added successfully`
    });
  } catch (error) {
    logger.error('Add loyalty points error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add loyalty points'
    });
  }
});

// Get guest statistics
router.get('/:guestId/stats', authenticateToken, validateUUID('guestId'), async (req, res) => {
  try {
    const { guestId } = req.params;

    const guest = await Guest.findByPk(guestId);
    if (!guest) {
      return res.status(404).json({
        success: false,
        error: 'Guest not found'
      });
    }

    // Get booking statistics
    const bookingStats = await Booking.findAll({
      where: { guestId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalBookings'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalSpent'],
        [sequelize.fn('AVG', sequelize.col('totalAmount')), 'averageSpent']
      ],
      group: ['status'],
      raw: true
    });

    // Get recent bookings
    const recentBookings = await Booking.findAll({
      where: { guestId },
      include: [
        {
          model: Hotel,
          attributes: ['name']
        },
        {
          model: Room,
          attributes: ['roomNumber']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    // Get favorite hotels (most booked)
    const favoriteHotels = await Booking.findAll({
      where: { guestId },
      attributes: [
        'hotelId',
        [sequelize.fn('COUNT', sequelize.col('Booking.id')), 'bookingCount']
      ],
      include: [
        {
          model: Hotel,
          attributes: ['name', 'address']
        }
      ],
      group: ['hotelId', 'Hotel.id'],
      order: [[sequelize.fn('COUNT', sequelize.col('Booking.id')), 'DESC']],
      limit: 3
    });

    res.json({
      success: true,
      data: {
        guest: {
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          vipStatus: guest.vipStatus,
          loyaltyPoints: guest.loyaltyPoints,
          totalStays: guest.totalStays,
          totalSpent: guest.totalSpent
        },
        bookingStats,
        recentBookings,
        favoriteHotels
      }
    });
  } catch (error) {
    logger.error('Get guest stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get guest statistics'
    });
  }
});

// Search guests
router.get('/search/:query', authenticateToken, async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 10 } = req.query;

    const where = {
      [Op.or]: [
        { firstName: { [Op.iLike]: `%${query}%` } },
        { lastName: { [Op.iLike]: `%${query}%` } },
        { email: { [Op.iLike]: `%${query}%` } },
        { phone: { [Op.iLike]: `%${query}%` } }
      ]
    };

    const include = [];

    // Filter by hotel for non-super admins
    if (req.user.role !== 'super_admin') {
      include.push({
        model: Booking,
        where: { hotelId: req.user.hotelId },
        attributes: [],
        required: true
      });
    }

    const guests = await Guest.findAll({
      where,
      include,
      limit: parseInt(limit),
      order: [['firstName', 'ASC']],
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'vipStatus']
    });

    res.json({
      success: true,
      data: guests
    });
  } catch (error) {
    logger.error('Search guests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search guests'
    });
  }
});

module.exports = router;