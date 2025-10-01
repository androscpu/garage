module.exports = (sequelize, DataTypes) => {
  const ThreeCXCall = sequelize.define('ThreeCXCall', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    callId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    direction: {
      type: DataTypes.ENUM('inbound', 'outbound'),
      allowNull: false
    },
    fromNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    toNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('ringing', 'answered', 'busy', 'no_answer', 'failed', 'completed'),
      defaultValue: 'ringing'
    },
    duration: {
      type: DataTypes.INTEGER, // in seconds
      defaultValue: 0
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endTime: {
      type: DataTypes.DATE
    },
    recordingUrl: {
      type: DataTypes.STRING
    },
    notes: {
      type: DataTypes.TEXT
    },
    callType: {
      type: DataTypes.ENUM('reservation', 'inquiry', 'complaint', 'support', 'emergency', 'other'),
      defaultValue: 'inquiry'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium'
    },
    resolution: {
      type: DataTypes.ENUM('resolved', 'pending', 'escalated', 'callback_required'),
      defaultValue: 'pending'
    },
    followUpRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    followUpDate: {
      type: DataTypes.DATE
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    guestId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    bookingId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    handledBy: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['callId']
      },
      {
        fields: ['guestId']
      },
      {
        fields: ['bookingId']
      },
      {
        fields: ['handledBy']
      },
      {
        fields: ['status']
      },
      {
        fields: ['callType']
      },
      {
        fields: ['startTime']
      },
      {
        fields: ['fromNumber']
      },
      {
        fields: ['toNumber']
      }
    ]
  });

  return ThreeCXCall;
};