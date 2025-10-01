module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define('Booking', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    bookingNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    checkInDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    checkOutDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isAfterCheckIn(value) {
          if (value <= this.checkInDate) {
            throw new Error('Check-out date must be after check-in date');
          }
        }
      }
    },
    actualCheckInTime: {
      type: DataTypes.DATE
    },
    actualCheckOutTime: {
      type: DataTypes.DATE
    },
    adults: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1
      }
    },
    children: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'),
      defaultValue: 'pending'
    },
    source: {
      type: DataTypes.ENUM('direct', 'booking_com', 'expedia', 'airbnb', 'phone', 'walk_in', 'other'),
      defaultValue: 'direct'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    paidAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD'
    },
    paymentStatus: {
      type: DataTypes.ENUM('pending', 'partial', 'paid', 'refunded', 'failed'),
      defaultValue: 'pending'
    },
    specialRequests: {
      type: DataTypes.TEXT
    },
    notes: {
      type: DataTypes.TEXT
    },
    cancellationReason: {
      type: DataTypes.TEXT
    },
    cancellationDate: {
      type: DataTypes.DATE
    },
    ratePlan: {
      type: DataTypes.JSONB,
      defaultValue: {
        name: 'Standard Rate',
        isRefundable: true,
        cancellationPolicy: 'Free cancellation up to 24 hours before check-in'
      }
    },
    extras: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    discounts: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    taxes: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    hotelId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    roomId: {
      type: DataTypes.UUID,
      allowNull: true // Can be null for room type bookings
    },
    guestId: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['bookingNumber']
      },
      {
        fields: ['hotelId']
      },
      {
        fields: ['guestId']
      },
      {
        fields: ['roomId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['checkInDate']
      },
      {
        fields: ['checkOutDate']
      },
      {
        fields: ['checkInDate', 'checkOutDate']
      }
    ],
    hooks: {
      beforeCreate: async (booking) => {
        if (!booking.bookingNumber) {
          const moment = require('moment');
          const prefix = 'BK';
          const timestamp = moment().format('YYYYMMDD');
          const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          booking.bookingNumber = `${prefix}${timestamp}${random}`;
        }
      }
    }
  });

  return Booking;
};