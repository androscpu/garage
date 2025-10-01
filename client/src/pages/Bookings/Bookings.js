import React from 'react';
import { Typography, Box } from '@mui/material';

const Bookings = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Booking Management
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Manage reservations, check-ins, check-outs, and booking status.
      </Typography>
    </Box>
  );
};

export default Bookings;