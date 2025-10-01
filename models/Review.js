module.exports = (sequelize, DataTypes) => {
  const Review = sequelize.define('Review', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    title: {
      type: DataTypes.STRING,
      validate: {
        len: [0, 200]
      }
    },
    comment: {
      type: DataTypes.TEXT
    },
    ratings: {
      type: DataTypes.JSONB,
      defaultValue: {
        cleanliness: 5,
        comfort: 5,
        location: 5,
        service: 5,
        value: 5,
        facilities: 5
      }
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    response: {
      type: DataTypes.TEXT
    },
    respondedAt: {
      type: DataTypes.DATE
    },
    source: {
      type: DataTypes.ENUM('direct', 'booking_com', 'expedia', 'tripadvisor', 'google', 'other'),
      defaultValue: 'direct'
    },
    guestId: {
      type: DataTypes.UUID,
      allowNull: false
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
        fields: ['guestId']
      },
      {
        fields: ['rating']
      },
      {
        fields: ['isPublic']
      },
      {
        fields: ['isVerified']
      }
    ]
  });

  return Review;
};