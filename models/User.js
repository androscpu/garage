module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
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
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 255]
      }
    },
    phone: {
      type: DataTypes.STRING,
      validate: {
        is: /^[\+]?[1-9][\d]{0,15}$/
      }
    },
    role: {
      type: DataTypes.ENUM('super_admin', 'hotel_admin', 'manager', 'receptionist', 'housekeeping', 'maintenance'),
      allowNull: false,
      defaultValue: 'receptionist'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastLogin: {
      type: DataTypes.DATE
    },
    profileImage: {
      type: DataTypes.STRING
    },
    hotelId: {
      type: DataTypes.UUID,
      allowNull: true // Super admin won't have hotelId
    },
    permissions: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {
        language: 'en',
        timezone: 'UTC',
        notifications: {
          email: true,
          push: true,
          sms: false
        }
      }
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['email']
      },
      {
        fields: ['hotelId']
      },
      {
        fields: ['role']
      }
    ],
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const bcrypt = require('bcryptjs');
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const bcrypt = require('bcryptjs');
          user.password = await bcrypt.hash(user.password, 12);
        }
      }
    }
  });

  User.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password;
    return values;
  };

  User.prototype.validatePassword = async function(password) {
    const bcrypt = require('bcryptjs');
    return bcrypt.compare(password, this.password);
  };

  return User;
};