const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Payment, Booking, Guest, Hotel } = require('../models');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validatePayment, validateUUID } = require('../middleware/validation');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const router = express.Router();

// Get all payments for a booking
router.get('/booking/:bookingId', authenticateToken, validateUUID('bookingId'), async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Verify booking exists and user has access
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

    const payments = await Payment.findAll({
      where: { bookingId },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    logger.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payments'
    });
  }
});

// Get single payment
router.get('/:paymentId', authenticateToken, validateUUID('paymentId'), async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findByPk(paymentId, {
      include: [
        {
          model: Booking,
          include: [
            {
              model: Guest,
              attributes: ['firstName', 'lastName', 'email']
            },
            {
              model: Hotel,
              attributes: ['name']
            }
          ]
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== payment.Booking.hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    logger.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment'
    });
  }
});

// Create payment intent (Stripe)
router.post('/create-intent', authenticateToken, async (req, res) => {
  try {
    const { bookingId, amount, currency = 'usd', description } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID and amount are required'
      });
    }

    // Verify booking
    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Guest,
          attributes: ['firstName', 'lastName', 'email']
        },
        {
          model: Hotel,
          attributes: ['name', 'currency']
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

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(amount) * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        bookingId,
        bookingNumber: booking.bookingNumber,
        hotelId: booking.hotelId,
        guestEmail: booking.Guest.email
      },
      description: description || `Payment for booking ${booking.bookingNumber}`,
      receipt_email: booking.Guest.email
    });

    // Create payment record
    const payment = await Payment.create({
      bookingId,
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      method: 'stripe',
      status: 'pending',
      stripePaymentIntentId: paymentIntent.id,
      description: description || `Payment for booking ${booking.bookingNumber}`
    });

    logger.info(`Payment intent created by ${req.user.email}: ${amount} ${currency} for booking ${booking.bookingNumber}`);

    res.json({
      success: true,
      data: {
        payment,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }
    });
  } catch (error) {
    logger.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent'
    });
  }
});

// Process cash payment
router.post('/cash', authenticateToken, validatePayment, async (req, res) => {
  try {
    const { bookingId, amount, currency = 'USD', description, notes } = req.body;

    // Verify booking
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

    // Create payment record
    const payment = await Payment.create({
      bookingId,
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      method: 'cash',
      status: 'completed',
      processedAt: new Date(),
      description: description || `Cash payment for booking ${booking.bookingNumber}`,
      notes
    });

    // Update booking payment status
    await updateBookingPaymentStatus(booking);

    logger.info(`Cash payment processed by ${req.user.email}: ${amount} ${currency} for booking ${booking.bookingNumber}`);

    res.status(201).json({
      success: true,
      data: payment,
      message: 'Cash payment processed successfully'
    });
  } catch (error) {
    logger.error('Process cash payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process cash payment'
    });
  }
});

// Process card payment (manual entry)
router.post('/card', authenticateToken, async (req, res) => {
  try {
    const { 
      bookingId, 
      amount, 
      currency = 'USD', 
      cardLast4, 
      cardBrand, 
      description,
      authCode,
      notes 
    } = req.body;

    if (!bookingId || !amount || !cardLast4) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID, amount, and card last 4 digits are required'
      });
    }

    // Verify booking
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

    // Create payment record
    const payment = await Payment.create({
      bookingId,
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      method: 'credit_card',
      status: 'completed',
      processedAt: new Date(),
      cardLast4,
      cardBrand: cardBrand || 'Unknown',
      description: description || `Card payment for booking ${booking.bookingNumber}`,
      notes: notes ? `Auth Code: ${authCode}\n${notes}` : `Auth Code: ${authCode}`,
      gatewayResponse: {
        authCode,
        processedBy: req.user.id,
        processedAt: new Date()
      }
    });

    // Update booking payment status
    await updateBookingPaymentStatus(booking);

    logger.info(`Card payment processed by ${req.user.email}: ${amount} ${currency} for booking ${booking.bookingNumber}`);

    res.status(201).json({
      success: true,
      data: payment,
      message: 'Card payment processed successfully'
    });
  } catch (error) {
    logger.error('Process card payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process card payment'
    });
  }
});

// Stripe webhook handler
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Stripe webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      case 'charge.succeeded':
        await handleChargeSucceeded(event.data.object);
        break;
      case 'charge.failed':
        await handleChargeFailed(event.data.object);
        break;
      default:
        logger.info(`Unhandled Stripe event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Refund payment
router.post('/:paymentId/refund', authenticateToken, authorize('super_admin', 'hotel_admin', 'manager'), validateUUID('paymentId'), async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    const payment = await Payment.findByPk(paymentId, {
      include: [{ model: Booking }]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    // Check hotel access
    if (req.user.role !== 'super_admin' && req.user.hotelId !== payment.Booking.hotelId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Only completed payments can be refunded'
      });
    }

    const refundAmount = amount ? parseFloat(amount) : parseFloat(payment.amount);
    
    if (refundAmount > parseFloat(payment.amount)) {
      return res.status(400).json({
        success: false,
        error: 'Refund amount cannot exceed payment amount'
      });
    }

    let refund = null;

    // Process Stripe refund if applicable
    if (payment.stripeChargeId) {
      try {
        refund = await stripe.refunds.create({
          charge: payment.stripeChargeId,
          amount: Math.round(refundAmount * 100), // Convert to cents
          reason: 'requested_by_customer',
          metadata: {
            refundedBy: req.user.id,
            reason: reason || 'Manual refund'
          }
        });
      } catch (stripeError) {
        logger.error('Stripe refund error:', stripeError);
        return res.status(400).json({
          success: false,
          error: 'Failed to process Stripe refund: ' + stripeError.message
        });
      }
    }

    // Create refund payment record
    const refundPayment = await Payment.create({
      bookingId: payment.bookingId,
      amount: refundAmount,
      currency: payment.currency,
      method: payment.method,
      status: 'completed',
      type: 'refund',
      processedAt: new Date(),
      description: `Refund for payment ${payment.transactionId}`,
      notes: reason,
      gatewayResponse: refund ? {
        stripeRefundId: refund.id,
        refundedBy: req.user.id
      } : {
        refundedBy: req.user.id
      }
    });

    // Update original payment
    await payment.update({
      refundAmount: parseFloat(payment.refundAmount || 0) + refundAmount,
      refundedAt: new Date(),
      status: refundAmount >= parseFloat(payment.amount) ? 'refunded' : 'completed'
    });

    // Update booking payment status
    await updateBookingPaymentStatus(payment.Booking);

    logger.info(`Payment refunded by ${req.user.email}: ${refundAmount} ${payment.currency} for payment ${payment.transactionId}`);

    res.json({
      success: true,
      data: refundPayment,
      message: 'Refund processed successfully'
    });
  } catch (error) {
    logger.error('Refund payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process refund'
    });
  }
});

// Get payment statistics for hotel
router.get('/hotel/:hotelId/stats', authenticateToken, async (req, res) => {
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

    // Get payment statistics
    const stats = await getPaymentStats(hotelId, startDate);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment statistics'
    });
  }
});

// Helper function to handle successful payment intent
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    const payment = await Payment.findOne({
      where: { stripePaymentIntentId: paymentIntent.id }
    });

    if (payment) {
      await payment.update({
        status: 'completed',
        processedAt: new Date(),
        gatewayResponse: {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency
        }
      });

      // Update booking payment status
      const booking = await Booking.findByPk(payment.bookingId);
      if (booking) {
        await updateBookingPaymentStatus(booking);
      }

      logger.info(`Stripe payment succeeded: ${paymentIntent.id}`);
    }
  } catch (error) {
    logger.error('Handle payment intent succeeded error:', error);
  }
}

// Helper function to handle failed payment intent
async function handlePaymentIntentFailed(paymentIntent) {
  try {
    const payment = await Payment.findOne({
      where: { stripePaymentIntentId: paymentIntent.id }
    });

    if (payment) {
      await payment.update({
        status: 'failed',
        gatewayResponse: {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          lastPaymentError: paymentIntent.last_payment_error
        }
      });

      logger.info(`Stripe payment failed: ${paymentIntent.id}`);
    }
  } catch (error) {
    logger.error('Handle payment intent failed error:', error);
  }
}

// Helper function to handle successful charge
async function handleChargeSucceeded(charge) {
  try {
    const payment = await Payment.findOne({
      where: { stripePaymentIntentId: charge.payment_intent }
    });

    if (payment) {
      await payment.update({
        stripeChargeId: charge.id,
        cardLast4: charge.payment_method_details?.card?.last4,
        cardBrand: charge.payment_method_details?.card?.brand,
        fees: charge.application_fee_amount ? charge.application_fee_amount / 100 : 0
      });

      logger.info(`Stripe charge succeeded: ${charge.id}`);
    }
  } catch (error) {
    logger.error('Handle charge succeeded error:', error);
  }
}

// Helper function to handle failed charge
async function handleChargeFailed(charge) {
  try {
    logger.info(`Stripe charge failed: ${charge.id} - ${charge.failure_message}`);
  } catch (error) {
    logger.error('Handle charge failed error:', error);
  }
}

// Helper function to update booking payment status
async function updateBookingPaymentStatus(booking) {
  try {
    const payments = await Payment.findAll({
      where: { 
        bookingId: booking.id,
        status: 'completed',
        type: { [Op.ne]: 'refund' }
      }
    });

    const refunds = await Payment.findAll({
      where: { 
        bookingId: booking.id,
        status: 'completed',
        type: 'refund'
      }
    });

    const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    const totalRefunded = refunds.reduce((sum, refund) => sum + parseFloat(refund.amount), 0);
    const netPaid = totalPaid - totalRefunded;

    let paymentStatus = 'pending';
    if (netPaid >= parseFloat(booking.totalAmount)) {
      paymentStatus = 'paid';
    } else if (netPaid > 0) {
      paymentStatus = 'partial';
    } else if (totalRefunded > 0) {
      paymentStatus = 'refunded';
    }

    await booking.update({
      paidAmount: netPaid,
      paymentStatus
    });

    logger.info(`Booking payment status updated: ${booking.bookingNumber} - ${paymentStatus}`);
  } catch (error) {
    logger.error('Update booking payment status error:', error);
  }
}

// Helper function to get payment statistics
async function getPaymentStats(hotelId, startDate) {
  try {
    const endDate = new Date();

    // Get payment totals by method
    const paymentsByMethod = await Payment.findAll({
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
        'method',
        [sequelize.fn('COUNT', sequelize.col('Payment.id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('Payment.amount')), 'total']
      ],
      group: ['method']
    });

    // Get daily revenue
    const dailyRevenue = await Payment.findAll({
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
        [sequelize.fn('DATE', sequelize.col('processedAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('Payment.amount')), 'revenue'],
        [sequelize.fn('COUNT', sequelize.col('Payment.id')), 'transactions']
      ],
      group: [sequelize.fn('DATE', sequelize.col('processedAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('processedAt')), 'ASC']]
    });

    // Get refund statistics
    const refundStats = await Payment.findAll({
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
        [sequelize.fn('COUNT', sequelize.col('Payment.id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('Payment.amount')), 'total']
      ]
    });

    return {
      paymentsByMethod,
      dailyRevenue,
      refundStats: refundStats[0] || { count: 0, total: 0 }
    };
  } catch (error) {
    logger.error('Get payment stats error:', error);
    return {};
  }
}

module.exports = router;