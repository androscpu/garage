module.exports = (sequelize, DataTypes) => {
  const Room = sequelize.define('Room', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    roomNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    floor: {
      type: DataTypes.INTEGER,
      validate: {
        min: 0
      }
    },
    status: {
      type: DataTypes.ENUM('available', 'occupied', 'maintenance', 'cleaning', 'out_of_order'),
      defaultValue: 'available'
    },
    condition: {
      type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor'),
      defaultValue: 'good'
    },
    lastCleaned: {
      type: DataTypes.DATE
    },
    lastMaintenance: {
      type: DataTypes.DATE
    },
    notes: {
      type: DataTypes.TEXT
    },
    images: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    features: {
      type: DataTypes.JSONB,
      defaultValue: {
        balcony: false,
        oceanView: false,
        cityView: false,
        mountainView: false,
        kitchenette: false,
        jacuzzi: false,
        fireplace: false
      }
    },
    hotelId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    roomTypeId: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['hotelId', 'roomNumber']
      },
      {
        fields: ['status']
      },
      {
        fields: ['roomTypeId']
      },
      {
        fields: ['floor']
      }
    ]
  });

  return Room;
};