import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Hotels from './pages/Hotels/Hotels';
import Rooms from './pages/Rooms/Rooms';
import Bookings from './pages/Bookings/Bookings';
import Guests from './pages/Guests/Guests';
import Housekeeping from './pages/Housekeeping/Housekeeping';
import Payments from './pages/Payments/Payments';
import Calls from './pages/Calls/Calls';
import Settings from './pages/Settings/Settings';
import LoadingSpinner from './components/Common/LoadingSpinner';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <LoadingSpinner />
      </Box>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Hotel Management - Super Admin only */}
        {user.role === 'super_admin' && (
          <Route path="/hotels/*" element={<Hotels />} />
        )}
        
        {/* Core PMS Features */}
        <Route path="/rooms/*" element={<Rooms />} />
        <Route path="/bookings/*" element={<Bookings />} />
        <Route path="/guests/*" element={<Guests />} />
        
        {/* Housekeeping */}
        <Route path="/housekeeping/*" element={<Housekeeping />} />
        
        {/* Payments */}
        <Route path="/payments/*" element={<Payments />} />
        
        {/* 3CX Calls */}
        <Route path="/calls/*" element={<Calls />} />
        
        {/* Settings */}
        <Route path="/settings/*" element={<Settings />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;