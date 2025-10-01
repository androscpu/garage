const express = require('express');
const { Hotel, Room, Booking, Guest, Payment, HousekeepingTask, ThreeCXCall, User } = require('../models');
const { authenticateToken, checkHotelAccess } = require('../middleware/auth');
const { validateUUID } = require('../middleware/validation');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const moment = require('moment');

const router = express.Router();

// Get comprehensive dashboard data for a hotel
router.get('/hotel/:hotelId', authenticateToken, checkHotelAccess, validateUUID('hotelId'), async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { period = '30' } = req.query; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    const endDate = new Date();
    const today = moment().startOf('day').toDate();
    const endOfDay = moment().endOf('day').toDate();

    // Get all dashboard data in parallel
    const [
      hotelInfo,
      roomStats,
      bookingStats,
      revenueStats,
      guestStats,
      housekeepingStats,
      callStats,
      todayArrivals,
      todayDepartures,
      upcomingArrivals,
      recentBookings,
      pendingTasks,
      recentCalls
    ] = await Promise.all([
      getHotelInfo(hotelId),
      getRoomStats(hotelId),
      getBookingStats(hotelId, startDate, endDate),
      getRevenueStats(hotelId, startDate, endDate),
      getGuestStats(hotelId, startDate, endDate),
      getHousekeepingStats(hotelId, today, endOfDay),
      getCallStats(hotelId, startDate, endDate),
      getTodayArrivals(hotelId, today, endOfDay),
      getTodayDepartures(hotelId, today, endOfDay),
      getUpcomingArrivals(hotelId),
      getRecentBookings(hotelId),
      getPendingTasks(hotelId),
      getRecentCalls(hotelId)
    ]);

    res.json({
      success: true,
      data: {
        hotel: hotelInfo,
        overview: {
          rooms: roomStats,
          bookings: bookingStats,
          revenue: revenueStats,
          guests: guestStats,
          housekeeping: housekeepingStats,
          calls: callStats
        },
        today: {
          arrivals: todayArrivals,
          departures: todayDepartures
        },
        upcoming: {
          arrivals: upcomingArrivals
        },
        recent: {
          bookings: recentBookings,
          calls: recentCalls
        },
        tasks: {
          pending: pendingTasks
        }
      }
    });
  } catch (error) {
    logger.error('Get dashboard data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard data'
    });
  }
});

// Get quick stats for header/widgets
router.get('/quick-stats/:hotelId', authenticateToken, checkHotelAccess, validateUUID('hotelId'), async (req, res) => {
  try {
    const { hotelId } = req.params;
    const today = moment().startOf('day').toDate();
    const endOfDay = moment().endOf('day').toDate();

    const [
      totalRooms,
      availableRooms,
      occupiedRooms,
      todayArrivals,
      todayDepartures,
      pendingTasks,
      activeCalls
    ] = await Promise.all([
      Room.count({ where: { hotelId } }),
      Room.count({ where: { hotelId, status: 'available' } }),
      Room.count({ where: { hotelId, status: 'occupied' } }),
      Booking.count({
        where: {
          hotelId,
          checkInDate: { [Op.between]: [today, endOfDay] },
          status: { [Op.ne]: 'cancelled' }
        }
      }),
      Booking.count({
        where: {
          hotelId,
          checkOutDate: { [Op.between]: [today, endOfDay] },
          status: 'checked_in'
        }
      }),
      HousekeepingTask.count({
        where: {
          hotelId,
          status: { [Op.in]: ['pending', 'in_progress'] }
        }
      }),
      ThreeCXCall.count({
        include: [{ model: Booking, where: { hotelId }, attributes: [] }],
        where: {
          status: { [Op.in]: ['ringing', 'answered'] }
        }
      })
    ]);

    const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        rooms: {
          total: totalRooms,
          available: availableRooms,
          occupied: occupiedRooms,
          occupancyRate: parseFloat(occupancyRate)
        },
        today: {
          arrivals: todayArrivals,
          departures: todayDepartures
        },
        tasks: {
          pending: pendingTasks
        },
        calls: {
          active: activeCalls
        }
      }
    });
  } catch (error) {
    logger.error('Get quick stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get quick stats'
    });
  }
});

// Helper functions
async function getHotelInfo(hotelId) {
  return await Hotel.findByPk(hotelId, {
    attributes: ['id', 'name', 'address', 'phone', 'email', 'starRating', 'currency']
  });
}

async function getRoomStats(hotelId) {
  const roomStatusCounts = await Room.findAll({
    where: { hotelId },
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['status']
  });

  const totalRooms = await Room.count({ where: { hotelId } });
  const statusMap = {};
  
  roomStatusCounts.forEach(item => {
    statusMap[item.status] = parseInt(item.get('count'));
  });

  const occupiedRooms = statusMap.occupied || 0;
  const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(2) : 0;

  return {
    total: totalRooms,
    available: statusMap.available || 0,
    occupied: occupiedRooms,
    maintenance: statusMap.maintenance || 0,
    cleaning: statusMap.cleaning || 0,
    outOfOrder: statusMap.out_of_order || 0,
    occupancyRate: parseFloat(occupancyRate)
  };
}

async function getBookingStats(hotelId, startDate, endDate) {
  const [
    totalBookings,
    confirmedBookings,
    checkedInBookings,
    checkedOutBookings,
    cancelledBookings
  ] = await Promise.all([
    Booking.count({
      where: {
        hotelId,
        createdAt: { [Op.between]: [startDate, endDate] }
      }
    }),
    Booking.count({
      where: {
        hotelId,
        status: 'confirmed',
        createdAt: { [Op.between]: [startDate, endDate] }
      }
    }),
    Booking.count({
      where: {
        hotelId,
        status: 'checked_in'
      }
    }),
    Booking.count({
      where: {
        hotelId,
        status: 'checked_out',
        actualCheckOutTime: { [Op.between]: [startDate, endDate] }
      }
    }),
    Booking.count({
      where: {
        hotelId,
        status: 'cancelled',
        cancellationDate: { [Op.between]: [startDate, endDate] }
      }
    })
  ]);

  return {
    total: totalBookings,
    confirmed: confirmedBookings,
    checkedIn: checkedInBookings,
    checkedOut: checkedOutBookings,
    cancelled: cancelledBookings
  };
}

async function getRevenueStats(hotelId, startDate, endDate) {
  const revenueData = await Payment.findAll({
    include: [
      {
        model: Booking,
        where: { hotelId },
        attributes: []
      }
    ],
    where: {
      status: 'completed',
      type: { [Op.ne]: 'refund' },
      processedAt: { [Op.between]: [startDate, endDate] }
    },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('Payment.amount')), 'totalRevenue'],
      [sequelize.fn('COUNT', sequelize.col('Payment.id')), 'totalTransactions'],
      [sequelize.fn('AVG', sequelize.col('Payment.amount')), 'averageTransaction']
    ]
  });

  const refundData = await Payment.findAll({
    include: [
      {
        model: Booking,
        where: { hotelId },
        attributes: []
      }
    ],
    where: {
      status: 'completed',
      type: 'refund',
      processedAt: { [Op.between]: [startDate, endDate] }
    },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('Payment.amount')), 'totalRefunds']
    ]
  });

  const revenue = revenueData[0] || {};
  const refunds = refundData[0] || {};

  return {
    totalRevenue: parseFloat(revenue.get('totalRevenue') || 0),
    totalRefunds: parseFloat(refunds.get('totalRefunds') || 0),
    netRevenue: parseFloat(revenue.get('totalRevenue') || 0) - parseFloat(refunds.get('totalRefunds') || 0),
    totalTransactions: parseInt(revenue.get('totalTransactions') || 0),
    averageTransaction: parseFloat(revenue.get('averageTransaction') || 0)
  };
}

async function getGuestStats(hotelId, startDate, endDate) {
  const [
    totalGuests,
    newGuests,
    vipGuests,
    returningGuests
  ] = await Promise.all([
    Guest.count({
      include: [
        {
          model: Booking,
          where: { hotelId },
          attributes: []
        }
      ],
      distinct: true
    }),
    Guest.count({
      include: [
        {
          model: Booking,
          where: {
            hotelId,
            createdAt: { [Op.between]: [startDate, endDate] }
          },
          attributes: []
        }
      ],
      where: {
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      distinct: true
    }),
    Guest.count({
      include: [
        {
          model: Booking,
          where: { hotelId },
          attributes: []
        }
      ],
      where: {
        vipStatus: { [Op.ne]: 'regular' }
      },
      distinct: true
    }),
    Guest.count({
      include: [
        {
          model: Booking,
          where: { hotelId },
          attributes: []
        }
      ],
      where: {
        totalStays: { [Op.gt]: 1 }
      },
      distinct: true
    })
  ]);

  return {
    total: totalGuests,
    new: newGuests,
    vip: vipGuests,
    returning: returningGuests
  };
}

async function getHousekeepingStats(hotelId, today, endOfDay) {
  const [
    totalTasks,
    pendingTasks,
    inProgressTasks,
    completedToday,
    overdueTasks
  ] = await Promise.all([
    HousekeepingTask.count({ where: { hotelId } }),
    HousekeepingTask.count({
      where: {
        hotelId,
        status: 'pending'
      }
    }),
    HousekeepingTask.count({
      where: {
        hotelId,
        status: 'in_progress'
      }
    }),
    HousekeepingTask.count({
      where: {
        hotelId,
        status: 'completed',
        completedAt: { [Op.between]: [today, endOfDay] }
      }
    }),
    HousekeepingTask.count({
      where: {
        hotelId,
        status: { [Op.in]: ['pending', 'in_progress'] },
        scheduledFor: { [Op.lt]: new Date() }
      }
    })
  ]);

  return {
    total: totalTasks,
    pending: pendingTasks,
    inProgress: inProgressTasks,
    completedToday,
    overdue: overdueTasks
  };
}

async function getCallStats(hotelId, startDate, endDate) {
  const [
    totalCalls,
    inboundCalls,
    outboundCalls,
    answeredCalls,
    missedCalls
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
    })
  ]);

  const answerRate = totalCalls > 0 ? ((answeredCalls / totalCalls) * 100).toFixed(2) : 0;

  return {
    total: totalCalls,
    inbound: inboundCalls,
    outbound: outboundCalls,
    answered: answeredCalls,
    missed: missedCalls,
    answerRate: parseFloat(answerRate)
  };
}

async function getTodayArrivals(hotelId, today, endOfDay) {
  return await Booking.findAll({
    where: {
      hotelId,
      checkInDate: { [Op.between]: [today, endOfDay] },
      status: { [Op.ne]: 'cancelled' }
    },
    include: [
      {
        model: Guest,
        attributes: ['firstName', 'lastName', 'phone', 'vipStatus']
      },
      {
        model: Room,
        attributes: ['roomNumber', 'floor']
      }
    ],
    order: [['checkInDate', 'ASC']],
    limit: 10
  });
}

async function getTodayDepartures(hotelId, today, endOfDay) {
  return await Booking.findAll({
    where: {
      hotelId,
      checkOutDate: { [Op.between]: [today, endOfDay] },
      status: 'checked_in'
    },
    include: [
      {
        model: Guest,
        attributes: ['firstName', 'lastName', 'phone', 'vipStatus']
      },
      {
        model: Room,
        attributes: ['roomNumber', 'floor']
      }
    ],
    order: [['checkOutDate', 'ASC']],
    limit: 10
  });
}

async function getUpcomingArrivals(hotelId) {
  const tomorrow = moment().add(1, 'day').startOf('day').toDate();
  const nextWeek = moment().add(7, 'days').endOf('day').toDate();

  return await Booking.findAll({
    where: {
      hotelId,
      checkInDate: { [Op.between]: [tomorrow, nextWeek] },
      status: 'confirmed'
    },
    include: [
      {
        model: Guest,
        attributes: ['firstName', 'lastName', 'phone', 'vipStatus']
      },
      {
        model: Room,
        attributes: ['roomNumber', 'floor']
      }
    ],
    order: [['checkInDate', 'ASC']],
    limit: 10
  });
}

async function getRecentBookings(hotelId) {
  return await Booking.findAll({
    where: { hotelId },
    include: [
      {
        model: Guest,
        attributes: ['firstName', 'lastName', 'vipStatus']
      },
      {
        model: Room,
        attributes: ['roomNumber']
      }
    ],
    order: [['createdAt', 'DESC']],
    limit: 5
  });
}

async function getPendingTasks(hotelId) {
  return await HousekeepingTask.findAll({
    where: {
      hotelId,
      status: { [Op.in]: ['pending', 'in_progress'] }
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
}

async function getRecentCalls(hotelId) {
  return await ThreeCXCall.findAll({
    include: [
      {
        model: Booking,
        where: { hotelId },
        attributes: ['bookingNumber']
      },
      {
        model: Guest,
        attributes: ['firstName', 'lastName']
      }
    ],
    order: [['startTime', 'DESC']],
    limit: 5
  });
}

module.exports = router;