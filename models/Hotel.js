module.exports = (sequelize, DataTypes) => {
  const Hotel = sequelize.define('Hotel', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    description: {
      type: DataTypes.TEXT
    },
    address: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        isValidAddress(value) {
          if (!value.street || !value.city || !value.country) {
            throw new Error('Address must include street, city, and country');
          }
        }
      }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^[\+]?[1-9][\d]{0,15}$/
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    website: {
      type: DataTypes.STRING,
      validate: {
        isUrl: true
      }
    },
    starRating: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 5
      }
    },
    checkInTime: {
      type: DataTypes.TIME,
      defaultValue: '15:00:00'
    },
    checkOutTime: {
      type: DataTypes.TIME,
      defaultValue: '11:00:00'
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
      validate: {
        len: [3, 3]
      }
    },
    timezone: {
      type: DataTypes.STRING,
      defaultValue: 'UTC'
    },
    images: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    policies: {
      type: DataTypes.JSONB,
      defaultValue: {
        cancellation: 'Free cancellation up to 24 hours before check-in',
        pets: false,
        smoking: false,
        children: true,
        extraBed: true,
        breakfast: false
      }
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {
        autoConfirmBookings: false,
        allowOnlineBooking: true,
        requireDeposit: true,
        depositPercentage: 20,
        taxRate: 0,
        serviceFeeRate: 0
      }
    },
    coordinates: {
      type: DataTypes.JSONB, // {lat: number, lng: number}
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    subscription: {
      type: DataTypes.JSONB,
      defaultValue: {
        plan: 'basic',
        status: 'active',
        expiresAt: null,
        features: []
      }
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['name']
      },
      {
        fields: ['isActive']
      },
      {
        fields: [sequelize.literal("(address->>'city')")]
      },
      {
        fields: [sequelize.literal("(address->>'country')")]
      }
    ]
  });

  return Hotel;
};