const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'hotel_system',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Import models
const User = require('./User')(sequelize, Sequelize.DataTypes);
const Hotel = require('./Hotel')(sequelize, Sequelize.DataTypes);
const Room = require('./Room')(sequelize, Sequelize.DataTypes);
const RoomType = require('./RoomType')(sequelize, Sequelize.DataTypes);
const Guest = require('./Guest')(sequelize, Sequelize.DataTypes);
const Booking = require('./Booking')(sequelize, Sequelize.DataTypes);
const Payment = require('./Payment')(sequelize, Sequelize.DataTypes);
const HousekeepingTask = require('./HousekeepingTask')(sequelize, Sequelize.DataTypes);
const Amenity = require('./Amenity')(sequelize, Sequelize.DataTypes);
const Review = require('./Review')(sequelize, Sequelize.DataTypes);
const ThreeCXCall = require('./ThreeCXCall')(sequelize, Sequelize.DataTypes);

// Define associations
const models = {
  User,
  Hotel,
  Room,
  RoomType,
  Guest,
  Booking,
  Payment,
  HousekeepingTask,
  Amenity,
  Review,
  ThreeCXCall
};

// User associations
User.belongsTo(Hotel, { foreignKey: 'hotelId' });
Hotel.hasMany(User, { foreignKey: 'hotelId' });

// Hotel associations
Hotel.hasMany(Room, { foreignKey: 'hotelId' });
Hotel.hasMany(RoomType, { foreignKey: 'hotelId' });
Hotel.hasMany(Booking, { foreignKey: 'hotelId' });
Hotel.hasMany(HousekeepingTask, { foreignKey: 'hotelId' });
Hotel.belongsToMany(Amenity, { through: 'HotelAmenities' });

// Room associations
Room.belongsTo(Hotel, { foreignKey: 'hotelId' });
Room.belongsTo(RoomType, { foreignKey: 'roomTypeId' });
Room.hasMany(Booking, { foreignKey: 'roomId' });
Room.hasMany(HousekeepingTask, { foreignKey: 'roomId' });

// RoomType associations
RoomType.belongsTo(Hotel, { foreignKey: 'hotelId' });
RoomType.hasMany(Room, { foreignKey: 'roomTypeId' });
RoomType.belongsToMany(Amenity, { through: 'RoomTypeAmenities' });

// Guest associations
Guest.hasMany(Booking, { foreignKey: 'guestId' });
Guest.hasMany(Review, { foreignKey: 'guestId' });
Guest.hasMany(ThreeCXCall, { foreignKey: 'guestId' });

// Booking associations
Booking.belongsTo(Hotel, { foreignKey: 'hotelId' });
Booking.belongsTo(Room, { foreignKey: 'roomId' });
Booking.belongsTo(Guest, { foreignKey: 'guestId' });
Booking.hasMany(Payment, { foreignKey: 'bookingId' });
Booking.hasMany(HousekeepingTask, { foreignKey: 'bookingId' });
Booking.hasMany(ThreeCXCall, { foreignKey: 'bookingId' });

// Payment associations
Payment.belongsTo(Booking, { foreignKey: 'bookingId' });

// HousekeepingTask associations
HousekeepingTask.belongsTo(Hotel, { foreignKey: 'hotelId' });
HousekeepingTask.belongsTo(Room, { foreignKey: 'roomId' });
HousekeepingTask.belongsTo(Booking, { foreignKey: 'bookingId' });
HousekeepingTask.belongsTo(User, { foreignKey: 'assignedTo', as: 'AssignedUser' });

// Amenity associations
Amenity.belongsToMany(Hotel, { through: 'HotelAmenities' });
Amenity.belongsToMany(RoomType, { through: 'RoomTypeAmenities' });

// Review associations
Review.belongsTo(Guest, { foreignKey: 'guestId' });
Review.belongsTo(Hotel, { foreignKey: 'hotelId' });

// ThreeCXCall associations
ThreeCXCall.belongsTo(Guest, { foreignKey: 'guestId' });
ThreeCXCall.belongsTo(Booking, { foreignKey: 'bookingId' });
ThreeCXCall.belongsTo(User, { foreignKey: 'handledBy', as: 'Handler' });

module.exports = {
  sequelize,
  Sequelize,
  ...models
};