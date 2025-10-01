module.exports = (sequelize, DataTypes) => {
  const Guest = sequelize.define('Guest', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 50]
      }
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 50]
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING,
      validate: {
        is: /^[\+]?[1-9][\d]{0,15}$/
      }
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY
    },
    nationality: {
      type: DataTypes.STRING
    },
    passportNumber: {
      type: DataTypes.STRING
    },
    address: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {
        roomType: null,
        floor: null,
        smoking: false,
        specialRequests: []
      }
    },
    vipStatus: {
      type: DataTypes.ENUM('regular', 'silver', 'gold', 'platinum'),
      defaultValue: 'regular'
    },
    loyaltyPoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    totalStays: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    totalSpent: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    blacklisted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    blacklistReason: {
      type: DataTypes.TEXT
    },
    notes: {
      type: DataTypes.TEXT
    },
    profileImage: {
      type: DataTypes.STRING
    },
    emergencyContact: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['email']
      },
      {
        fields: ['phone']
      },
      {
        fields: ['vipStatus']
      },
      {
        fields: ['blacklisted']
      },
      {
        fields: ['firstName', 'lastName']
      }
    ]
  });

  return Guest;
};