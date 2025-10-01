module.exports = (sequelize, DataTypes) => {
  const RoomType = sequelize.define('RoomType', {
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
    basePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    maxOccupancy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 20
      }
    },
    bedConfiguration: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        singleBeds: 0,
        doubleBeds: 1,
        queenBeds: 0,
        kingBeds: 0,
        sofaBeds: 0
      }
    },
    size: {
      type: DataTypes.INTEGER, // in square meters
      validate: {
        min: 10
      }
    },
    images: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    amenities: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    hotelId: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['hotelId']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['basePrice']
      }
    ]
  });

  return RoomType;
};