module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    transactionId: {
      type: DataTypes.STRING,
      unique: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD'
    },
    method: {
      type: DataTypes.ENUM('cash', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stripe', 'other'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'),
      defaultValue: 'pending'
    },
    type: {
      type: DataTypes.ENUM('payment', 'refund', 'chargeback'),
      defaultValue: 'payment'
    },
    gatewayResponse: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING
    },
    stripeChargeId: {
      type: DataTypes.STRING
    },
    paypalTransactionId: {
      type: DataTypes.STRING
    },
    cardLast4: {
      type: DataTypes.STRING(4)
    },
    cardBrand: {
      type: DataTypes.STRING
    },
    description: {
      type: DataTypes.TEXT
    },
    notes: {
      type: DataTypes.TEXT
    },
    processedAt: {
      type: DataTypes.DATE
    },
    refundedAt: {
      type: DataTypes.DATE
    },
    refundAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    fees: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    bookingId: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['transactionId']
      },
      {
        fields: ['bookingId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['method']
      },
      {
        fields: ['processedAt']
      },
      {
        fields: ['stripePaymentIntentId']
      }
    ],
    hooks: {
      beforeCreate: async (payment) => {
        if (!payment.transactionId) {
          const moment = require('moment');
          const prefix = 'TXN';
          const timestamp = moment().format('YYYYMMDDHHmmss');
          const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          payment.transactionId = `${prefix}${timestamp}${random}`;
        }
      }
    }
  });

  return Payment;
};