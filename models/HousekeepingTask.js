module.exports = (sequelize, DataTypes) => {
  const HousekeepingTask = sequelize.define('HousekeepingTask', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    type: {
      type: DataTypes.ENUM('cleaning', 'maintenance', 'inspection', 'deep_clean', 'checkout_clean', 'checkin_prep'),
      allowNull: false
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium'
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled', 'on_hold'),
      defaultValue: 'pending'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    estimatedDuration: {
      type: DataTypes.INTEGER // in minutes
    },
    actualDuration: {
      type: DataTypes.INTEGER // in minutes
    },
    scheduledFor: {
      type: DataTypes.DATE
    },
    startedAt: {
      type: DataTypes.DATE
    },
    completedAt: {
      type: DataTypes.DATE
    },
    checklist: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    supplies: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    notes: {
      type: DataTypes.TEXT
    },
    images: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    issuesFound: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    rating: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 5
      }
    },
    hotelId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    roomId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    bookingId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['hotelId']
      },
      {
        fields: ['roomId']
      },
      {
        fields: ['assignedTo']
      },
      {
        fields: ['status']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['type']
      },
      {
        fields: ['scheduledFor']
      }
    ]
  });

  return HousekeepingTask;
};