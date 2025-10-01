import React from 'react';
import { Typography, Box } from '@mui/material';

const Rooms = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Room Management
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Manage rooms, room types, and room status.
      </Typography>
    </Box>
  );
};

export default Rooms;