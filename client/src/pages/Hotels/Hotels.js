import React from 'react';
import { Typography, Box } from '@mui/material';

const Hotels = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Hotels Management
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Hotel management interface for super administrators.
      </Typography>
    </Box>
  );
};

export default Hotels;