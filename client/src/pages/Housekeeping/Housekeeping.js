import React from 'react';
import { Typography, Box } from '@mui/material';

const Housekeeping = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Housekeeping Management
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Manage cleaning tasks, maintenance requests, and staff assignments.
      </Typography>
    </Box>
  );
};

export default Housekeeping;