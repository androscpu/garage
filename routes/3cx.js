const express = require('express');
const axios = require('axios');
const { ThreeCXCall, Guest, Booking, User } = require('../models');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateUUID } = require('../middleware/validation');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const router = express.Router();

// 3CX API configuration
const threeCXConfig = {
  baseURL: process.env.THREECX_API_URL,
  username: process.env.THREECX_USERNAME,
  password: process.env.THREECX_PASSWORD,
  tenant: process.env.THREECX_TENANT
};

// Get 3CX authentication token
async function get3CXToken() {
  try {
    const response = await axios.post(`${threeCXConfig.baseURL}/auth/login`, {
      username: threeCXConfig.username,
      password: threeCXConfig.password,
      tenant: threeCXConfig.tenant
    });
    
    return response.data.token;
  } catch (error) {
    logger.error('3CX authentication error:', error);
    throw new Error('Failed to authenticate with 3CX');
  }
}

// Make authenticated 3CX API request
async function make3CXRequest(method, endpoint, data = null) {
  try {
    const token = await get3CXToken();
    
    const config = {
      method,
      url: `${threeCXConfig.baseURL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    logger.error('3CX API request error:', error);
    throw error;
  }
}

// Get all calls for a hotel
router.get('/calls/hotel/:hotelId', authenticateToken, async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      direction, 
      callType,
      startDate,
      endDate,
      guestId 
    } = req.query;
    const offset = (page - 1) * limit;

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const where = {};
    if (status) where.status = status;
    if (direction) where.direction = direction;
    if (callType) where.callType = callType;
    if (guestId) where.guestId = guestId;
    if (startDate && endDate) {
      where.startTime = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    const include = [
      {
        model: Guest,
        attributes: ['id', 'firstName', 'lastName', 'phone', 'vipStatus'],
        required: false
      },
      {
        model: Booking,
        attributes: ['id', 'bookingNumber', 'status'],
        where: { hotelId },
        required: false
      },
      {
        model: User,
        as: 'Handler',
        attributes: ['id', 'firstName', 'lastName'],
        required: false
      }
    ];

    const { count, rows: calls } = await ThreeCXCall.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['startTime', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        calls,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get 3CX calls error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get calls'
    });
  }
});

// Get single call
router.get('/calls/:callId', authenticateToken, validateUUID('callId'), async (req, res) => {
  try {
    const { callId } = req.params;

    const call = await ThreeCXCall.findByPk(callId, {
      include: [
        {
          model: Guest,
          attributes: { exclude: ['createdAt', 'updatedAt'] }
        },
        {
          model: Booking,
          include: [
            {
              model: Hotel,
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: User,
          as: 'Handler',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    // Check access
    if (req.user.role !== 'super_admin' && call.Booking && req.user.hotelId !== call.Booking.hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: call
    });
  } catch (error) {
    logger.error('Get 3CX call error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get call'
    });
  }
});

// Create call record (webhook from 3CX)
router.post('/webhook/call', async (req, res) => {
  try {
    const {
      callId,
      direction,
      fromNumber,
      toNumber,
      status,
      startTime,
      endTime,
      duration,
      recordingUrl
    } = req.body;

    if (!callId || !direction || !fromNumber || !toNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required call data'
      });
    }

    // Check if call already exists
    let call = await ThreeCXCall.findOne({ where: { callId } });

    if (call) {
      // Update existing call
      await call.update({
        status,
        endTime: endTime ? new Date(endTime) : null,
        duration: duration || 0,
        recordingUrl
      });
    } else {
      // Try to identify guest by phone number
      let guestId = null;
      let bookingId = null;

      const phoneNumber = direction === 'inbound' ? fromNumber : toNumber;
      const guest = await Guest.findOne({
        where: { phone: { [Op.iLike]: `%${phoneNumber.replace(/\D/g, '')}%` } }
      });

      if (guest) {
        guestId = guest.id;
        
        // Find active booking for this guest
        const activeBooking = await Booking.findOne({
          where: {
            guestId,
            status: { [Op.in]: ['confirmed', 'checked_in'] }
          },
          order: [['checkInDate', 'DESC']]
        });

        if (activeBooking) {
          bookingId = activeBooking.id;
        }
      }

      // Create new call record
      call = await ThreeCXCall.create({
        callId,
        direction,
        fromNumber,
        toNumber,
        status: status || 'ringing',
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        duration: duration || 0,
        recordingUrl,
        guestId,
        bookingId
      });
    }

    // Emit real-time notification for active calls
    if (call.bookingId) {
      const booking = await Booking.findByPk(call.bookingId);
      if (booking) {
        req.io.to(`hotel-${booking.hotelId}`).emit('incoming-call', {
          callId: call.id,
          direction: call.direction,
          fromNumber: call.fromNumber,
          guestName: call.Guest ? `${call.Guest.firstName} ${call.Guest.lastName}` : null,
          bookingNumber: booking.bookingNumber
        });
      }
    }

    logger.info(`3CX call webhook processed: ${callId}`);

    res.json({
      success: true,
      data: call
    });
  } catch (error) {
    logger.error('3CX call webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process call webhook'
    });
  }
});

// Update call record
router.put('/calls/:callId', authenticateToken, validateUUID('callId'), async (req, res) => {
  try {
    const { callId } = req.params;
    const {
      notes,
      callType,
      priority,
      resolution,
      followUpRequired,
      followUpDate,
      tags,
      guestId,
      bookingId
    } = req.body;

    const call = await ThreeCXCall.findByPk(callId);
    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    const updateData = {
      handledBy: req.user.id
    };

    if (notes !== undefined) updateData.notes = notes;
    if (callType) updateData.callType = callType;
    if (priority) updateData.priority = priority;
    if (resolution) updateData.resolution = resolution;
    if (followUpRequired !== undefined) updateData.followUpRequired = followUpRequired;
    if (followUpDate) updateData.followUpDate = new Date(followUpDate);
    if (tags) updateData.tags = tags;
    if (guestId) updateData.guestId = guestId;
    if (bookingId) updateData.bookingId = bookingId;

    await call.update(updateData);

    logger.info(`3CX call updated by ${req.user.email}: ${call.callId}`);

    res.json({
      success: true,
      data: call
    });
  } catch (error) {
    logger.error('Update 3CX call error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update call'
    });
  }
});

// Make outbound call via 3CX
router.post('/calls/outbound', authenticateToken, async (req, res) => {
  try {
    const { toNumber, fromExtension, guestId, bookingId } = req.body;

    if (!toNumber || !fromExtension) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and extension are required'
      });
    }

    // Make call via 3CX API
    const callData = await make3CXRequest('POST', '/calls/make', {
      from: fromExtension,
      to: toNumber,
      timeout: 30
    });

    // Create call record
    const call = await ThreeCXCall.create({
      callId: callData.callId || `OUT_${Date.now()}`,
      direction: 'outbound',
      fromNumber: fromExtension,
      toNumber,
      status: 'ringing',
      startTime: new Date(),
      guestId: guestId || null,
      bookingId: bookingId || null,
      handledBy: req.user.id,
      callType: 'inquiry'
    });

    logger.info(`Outbound call initiated by ${req.user.email}: ${toNumber}`);

    res.json({
      success: true,
      data: call,
      message: 'Outbound call initiated'
    });
  } catch (error) {
    logger.error('Make outbound call error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to make outbound call'
    });
  }
});

// Get call statistics
router.get('/stats/hotel/:hotelId', authenticateToken, async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { period = '30' } = req.query; // days

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const stats = await get3CXStats(hotelId, startDate);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get 3CX stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get call statistics'
    });
  }
});

// Get extensions from 3CX
router.get('/extensions', authenticateToken, async (req, res) => {
  try {
    const extensions = await make3CXRequest('GET', '/extensions');

    res.json({
      success: true,
      data: extensions
    });
  } catch (error) {
    logger.error('Get 3CX extensions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get extensions'
    });
  }
});

// Get call queues from 3CX
router.get('/queues', authenticateToken, async (req, res) => {
  try {
    const queues = await make3CXRequest('GET', '/queues');

    res.json({
      success: true,
      data: queues
    });
  } catch (error) {
    logger.error('Get 3CX queues error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get call queues'
    });
  }
});

// Get active calls from 3CX
router.get('/active-calls', authenticateToken, async (req, res) => {
  try {
    const activeCalls = await make3CXRequest('GET', '/calls/active');

    res.json({
      success: true,
      data: activeCalls
    });
  } catch (error) {
    logger.error('Get active calls error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active calls'
    });
  }
});

// Transfer call
router.post('/calls/:callId/transfer', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const { toExtension, toQueue } = req.body;

    if (!toExtension && !toQueue) {
      return res.status(400).json({
        success: false,
        error: 'Transfer destination (extension or queue) is required'
      });
    }

    const call = await ThreeCXCall.findOne({ where: { callId } });
    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    // Transfer call via 3CX API
    const transferData = {
      callId,
      destination: toExtension || toQueue,
      type: toExtension ? 'extension' : 'queue'
    };

    await make3CXRequest('POST', '/calls/transfer', transferData);

    // Update call record
    await call.update({
      notes: `${call.notes || ''}\nTransferred to ${toExtension || toQueue} by ${req.user.firstName} ${req.user.lastName}`,
      handledBy: req.user.id
    });

    logger.info(`Call transferred by ${req.user.email}: ${callId} to ${toExtension || toQueue}`);

    res.json({
      success: true,
      message: 'Call transferred successfully'
    });
  } catch (error) {
    logger.error('Transfer call error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transfer call'
    });
  }
});

// End call
router.post('/calls/:callId/hangup', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;

    const call = await ThreeCXCall.findOne({ where: { callId } });
    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    // End call via 3CX API
    await make3CXRequest('POST', '/calls/hangup', { callId });

    // Update call record
    await call.update({
      status: 'completed',
      endTime: new Date(),
      handledBy: req.user.id
    });

    logger.info(`Call ended by ${req.user.email}: ${callId}`);

    res.json({
      success: true,
      message: 'Call ended successfully'
    });
  } catch (error) {
    logger.error('End call error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end call'
    });
  }
});

// Get call recordings
router.get('/calls/:callId/recording', authenticateToken, validateUUID('callId'), async (req, res) => {
  try {
    const { callId } = req.params;

    const call = await ThreeCXCall.findByPk(callId);
    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    if (!call.recordingUrl) {
      return res.status(404).json({
        success: false,
        error: 'No recording available for this call'
      });
    }

    // Get recording from 3CX
    const recording = await make3CXRequest('GET', `/recordings/${call.callId}`);

    res.json({
      success: true,
      data: {
        recordingUrl: call.recordingUrl,
        recording
      }
    });
  } catch (error) {
    logger.error('Get call recording error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get call recording'
    });
  }
});

// Helper function to get 3CX statistics
async function get3CXStats(hotelId, startDate) {
  try {
    const endDate = new Date();

    // Get call statistics
    const [
      totalCalls,
      inboundCalls,
      outboundCalls,
      answeredCalls,
      missedCalls,
      averageDuration
    ] = await Promise.all([
      ThreeCXCall.count({
        include: [{ model: Booking, where: { hotelId }, attributes: [] }],
        where: { startTime: { [Op.between]: [startDate, endDate] } }
      }),
      ThreeCXCall.count({
        include: [{ model: Booking, where: { hotelId }, attributes: [] }],
        where: {
          direction: 'inbound',
          startTime: { [Op.between]: [startDate, endDate] }
        }
      }),
      ThreeCXCall.count({
        include: [{ model: Booking, where: { hotelId }, attributes: [] }],
        where: {
          direction: 'outbound',
          startTime: { [Op.between]: [startDate, endDate] }
        }
      }),
      ThreeCXCall.count({
        include: [{ model: Booking, where: { hotelId }, attributes: [] }],
        where: {
          status: { [Op.in]: ['answered', 'completed'] },
          startTime: { [Op.between]: [startDate, endDate] }
        }
      }),
      ThreeCXCall.count({
        include: [{ model: Booking, where: { hotelId }, attributes: [] }],
        where: {
          status: { [Op.in]: ['no_answer', 'busy'] },
          startTime: { [Op.between]: [startDate, endDate] }
        }
      }),
      ThreeCXCall.findAll({
        include: [{ model: Booking, where: { hotelId }, attributes: [] }],
        where: {
          status: 'completed',
          startTime: { [Op.between]: [startDate, endDate] }
        },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('duration')), 'avgDuration']
        ]
      })
    ]);

    // Get calls by type
    const callsByType = await ThreeCXCall.findAll({
      include: [{ model: Booking, where: { hotelId }, attributes: [] }],
      where: { startTime: { [Op.between]: [startDate, endDate] } },
      attributes: [
        'callType',
        [sequelize.fn('COUNT', sequelize.col('ThreeCXCall.id')), 'count']
      ],
      group: ['callType']
    });

    // Get daily call volume
    const dailyCallVolume = await ThreeCXCall.findAll({
      include: [{ model: Booking, where: { hotelId }, attributes: [] }],
      where: { startTime: { [Op.between]: [startDate, endDate] } },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('startTime')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('ThreeCXCall.id')), 'calls']
      ],
      group: [sequelize.fn('DATE', sequelize.col('startTime'))],
      order: [[sequelize.fn('DATE', sequelize.col('startTime')), 'ASC']]
    });

    return {
      overview: {
        totalCalls,
        inboundCalls,
        outboundCalls,
        answeredCalls,
        missedCalls,
        averageDuration: averageDuration[0]?.avgDuration || 0,
        answerRate: totalCalls > 0 ? ((answeredCalls / totalCalls) * 100).toFixed(2) : 0
      },
      callsByType,
      dailyCallVolume
    };
  } catch (error) {
    logger.error('Get 3CX stats error:', error);
    return {};
  }
}

module.exports = router;