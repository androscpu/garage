-- Initial database setup for Cloud Hotel System

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create initial super admin user (password: admin123)
-- This will be handled by the application's seeding process

-- Create sample amenities
INSERT INTO "Amenities" (id, name, description, category, icon, "isActive", "createdAt", "updatedAt") VALUES
(uuid_generate_v4(), 'WiFi', 'Free wireless internet access', 'technology', 'wifi', true, NOW(), NOW()),
(uuid_generate_v4(), 'Air Conditioning', 'Climate control system', 'comfort', 'ac_unit', true, NOW(), NOW()),
(uuid_generate_v4(), 'TV', 'Flat screen television', 'technology', 'tv', true, NOW(), NOW()),
(uuid_generate_v4(), 'Mini Bar', 'In-room refrigerated mini bar', 'food_beverage', 'local_bar', true, NOW(), NOW()),
(uuid_generate_v4(), 'Safe', 'In-room security safe', 'safety', 'security', true, NOW(), NOW()),
(uuid_generate_v4(), 'Balcony', 'Private balcony or terrace', 'room', 'balcony', true, NOW(), NOW()),
(uuid_generate_v4(), 'Ocean View', 'Room with ocean view', 'room', 'waves', true, NOW(), NOW()),
(uuid_generate_v4(), 'Jacuzzi', 'In-room jacuzzi or hot tub', 'bathroom', 'hot_tub', true, NOW(), NOW()),
(uuid_generate_v4(), 'Room Service', '24/7 room service available', 'food_beverage', 'room_service', true, NOW(), NOW()),
(uuid_generate_v4(), 'Gym Access', 'Access to fitness center', 'recreation', 'fitness_center', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_hotel_dates ON "Bookings" ("hotelId", "checkInDate", "checkOutDate");
CREATE INDEX IF NOT EXISTS idx_bookings_status ON "Bookings" ("status");
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_status ON "Rooms" ("hotelId", "status");
CREATE INDEX IF NOT EXISTS idx_payments_booking ON "Payments" ("bookingId");
CREATE INDEX IF NOT EXISTS idx_housekeeping_hotel_status ON "HousekeepingTasks" ("hotelId", "status");
CREATE INDEX IF NOT EXISTS idx_calls_booking ON "ThreeCXCalls" ("bookingId");
CREATE INDEX IF NOT EXISTS idx_guests_email ON "Guests" ("email");
CREATE INDEX IF NOT EXISTS idx_users_hotel ON "Users" ("hotelId");

-- Insert sample data notification
SELECT 'Database initialized successfully. Please run the application to create initial users and sample data.' as message;