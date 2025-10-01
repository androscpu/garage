import React from 'react';
import { Typography, Box } from '@mui/material';

const Payments = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Payment Management
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Process payments, refunds, and view transaction history.
      </Typography>
    </Box>
  );
};

export default Payments;