import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  IconButton,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  Hotel as HotelIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  CleaningServices as CleaningIcon,
  Phone as PhoneIcon,
  CheckIn as CheckInIcon,
  CheckOut as CheckOutIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import axios from 'axios';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [quickStats, setQuickStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.hotelId || user?.role === 'super_admin') {
      fetchDashboardData();
      fetchQuickStats();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const hotelId = user.hotelId || user.hotels?.[0]?.id;
      if (!hotelId) return;

      const response = await axios.get(`/api/dashboard/hotel/${hotelId}`);
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    }
  };

  const fetchQuickStats = async () => {
    try {
      const hotelId = user.hotelId || user.hotels?.[0]?.id;
      if (!hotelId) return;

      const response = await axios.get(`/api/dashboard/quick-stats/${hotelId}`);
      setQuickStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch quick stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchDashboardData();
    fetchQuickStats();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!dashboardData || !quickStats) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="text.secondary">
          No dashboard data available
        </Typography>
      </Box>
    );
  }

  const roomStatusColors = {
    available: '#4caf50',
    occupied: '#ff9800',
    maintenance: '#f44336',
    cleaning: '#2196f3',
    out_of_order: '#9c27b0'
  };

  const roomStatusData = [
    { name: 'Available', value: quickStats.rooms.available, color: roomStatusColors.available },
    { name: 'Occupied', value: quickStats.rooms.occupied, color: roomStatusColors.occupied },
    { name: 'Maintenance', value: dashboardData.overview.rooms.maintenance || 0, color: roomStatusColors.maintenance },
    { name: 'Cleaning', value: dashboardData.overview.rooms.cleaning || 0, color: roomStatusColors.cleaning }
  ].filter(item => item.value > 0);

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Dashboard
        </Typography>
        <IconButton onClick={handleRefresh} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Quick Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card className="dashboard-card">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Occupancy Rate
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {quickStats.rooms.occupancyRate}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {quickStats.rooms.occupied} of {quickStats.rooms.total} rooms
                  </Typography>
                </Box>
                <HotelIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="dashboard-card">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Today's Arrivals
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {quickStats.today.arrivals}
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    Check-ins expected
                  </Typography>
                </Box>
                <CheckInIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="dashboard-card">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Today's Departures
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {quickStats.today.departures}
                  </Typography>
                  <Typography variant="body2" color="warning.main">
                    Check-outs expected
                  </Typography>
                </Box>
                <CheckOutIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="dashboard-card">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Pending Tasks
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {quickStats.tasks.pending}
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    Housekeeping tasks
                  </Typography>
                </Box>
                <CleaningIcon sx={{ fontSize: 40, color: 'error.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Room Status Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Room Status Distribution
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roomStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {roomStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Revenue Overview */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Revenue Overview
              </Typography>
              <Box mb={2}>
                <Typography variant="h4" color="primary" fontWeight="bold">
                  ${dashboardData.overview.revenue.totalRevenue?.toLocaleString() || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Revenue (30 days)
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mt={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Transactions
                  </Typography>
                  <Typography variant="h6">
                    {dashboardData.overview.revenue.totalTransactions || 0}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Average
                  </Typography>
                  <Typography variant="h6">
                    ${dashboardData.overview.revenue.averageTransaction?.toFixed(2) || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Today's Arrivals */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Today's Arrivals
              </Typography>
              <List dense>
                {dashboardData.today.arrivals?.slice(0, 5).map((booking) => (
                  <ListItem key={booking.id}>
                    <ListItemText
                      primary={`${booking.Guest.firstName} ${booking.Guest.lastName}`}
                      secondary={`Room ${booking.Room?.roomNumber || 'TBD'} • ${booking.bookingNumber}`}
                    />
                    <Chip
                      label={booking.Guest.vipStatus}
                      size="small"
                      color={booking.Guest.vipStatus !== 'regular' ? 'primary' : 'default'}
                    />
                  </ListItem>
                )) || (
                  <ListItem>
                    <ListItemText primary="No arrivals today" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Tasks */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pending Tasks
              </Typography>
              <List dense>
                {dashboardData.tasks.pending?.slice(0, 5).map((task) => (
                  <ListItem key={task.id}>
                    <ListItemIcon>
                      <CleaningIcon 
                        color={
                          task.priority === 'urgent' ? 'error' :
                          task.priority === 'high' ? 'warning' : 'primary'
                        }
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={task.title}
                      secondary={`Room ${task.Room?.roomNumber} • ${task.type}`}
                    />
                    <Chip
                      label={task.priority}
                      size="small"
                      color={
                        task.priority === 'urgent' ? 'error' :
                        task.priority === 'high' ? 'warning' : 'default'
                      }
                    />
                  </ListItem>
                )) || (
                  <ListItem>
                    <ListItemText primary="No pending tasks" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Bookings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Bookings
              </Typography>
              <List>
                {dashboardData.recent.bookings?.map((booking) => (
                  <React.Fragment key={booking.id}>
                    <ListItem>
                      <ListItemText
                        primary={`${booking.Guest.firstName} ${booking.Guest.lastName}`}
                        secondary={
                          <Box>
                            <Typography variant="body2" component="span">
                              {booking.bookingNumber} • Room {booking.Room?.roomNumber || 'TBD'}
                            </Typography>
                            <br />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(booking.createdAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={booking.status}
                          size="small"
                          className={`status-${booking.status}`}
                        />
                        {booking.Guest.vipStatus !== 'regular' && (
                          <Chip
                            label={booking.Guest.vipStatus}
                            size="small"
                            color="primary"
                          />
                        )}
                      </Box>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                )) || (
                  <ListItem>
                    <ListItemText primary="No recent bookings" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;