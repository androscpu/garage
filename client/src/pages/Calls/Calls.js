import React from 'react';
import { Typography, Box } from '@mui/material';

const Calls = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Call Management
      </Typography>
      <Typography variant="body1" color="text.secondary">
        3CX phone system integration - view calls, make calls, and manage call logs.
      </Typography>
    </Box>
  );
};

export default Calls;