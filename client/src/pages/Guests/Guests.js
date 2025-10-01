import React from 'react';
import { Typography, Box } from '@mui/material';

const Guests = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Guest Management
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Manage guest profiles, preferences, and loyalty programs.
      </Typography>
    </Box>
  );
};

export default Guests;