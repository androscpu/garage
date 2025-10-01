import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Chip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Hotel as HotelIcon,
  Bed as RoomIcon,
  BookOnline as BookingIcon,
  People as GuestIcon,
  CleaningServices as HousekeepingIcon,
  Payment as PaymentIcon,
  Phone as CallIcon,
  Settings as SettingsIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ onItemClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      roles: ['super_admin', 'hotel_admin', 'manager', 'receptionist', 'housekeeping']
    },
    {
      text: 'Hotels',
      icon: <HotelIcon />,
      path: '/hotels',
      roles: ['super_admin'],
      badge: 'Admin'
    },
    {
      text: 'Rooms',
      icon: <RoomIcon />,
      path: '/rooms',
      roles: ['super_admin', 'hotel_admin', 'manager', 'receptionist', 'housekeeping']
    },
    {
      text: 'Bookings',
      icon: <BookingIcon />,
      path: '/bookings',
      roles: ['super_admin', 'hotel_admin', 'manager', 'receptionist']
    },
    {
      text: 'Guests',
      icon: <GuestIcon />,
      path: '/guests',
      roles: ['super_admin', 'hotel_admin', 'manager', 'receptionist']
    },
    {
      text: 'Housekeeping',
      icon: <HousekeepingIcon />,
      path: '/housekeeping',
      roles: ['super_admin', 'hotel_admin', 'manager', 'receptionist', 'housekeeping']
    },
    {
      text: 'Payments',
      icon: <PaymentIcon />,
      path: '/payments',
      roles: ['super_admin', 'hotel_admin', 'manager', 'receptionist']
    },
    {
      text: 'Calls',
      icon: <CallIcon />,
      path: '/calls',
      roles: ['super_admin', 'hotel_admin', 'manager', 'receptionist']
    }
  ];

  const settingsItems = [
    {
      text: 'Settings',
      icon: <SettingsIcon />,
      path: '/settings',
      roles: ['super_admin', 'hotel_admin', 'manager', 'receptionist', 'housekeeping']
    }
  ];

  const handleItemClick = (path) => {
    navigate(path);
    if (onItemClick) {
      onItemClick();
    }
  };

  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  const canAccess = (roles) => {
    return roles.includes(user?.role);
  };

  const renderMenuItem = (item) => {
    if (!canAccess(item.roles)) {
      return null;
    }

    return (
      <ListItem key={item.text} disablePadding>
        <ListItemButton
          selected={isActive(item.path)}
          onClick={() => handleItemClick(item.path)}
          sx={{
            borderRadius: 2,
            mx: 1,
            mb: 0.5,
            '&.Mui-selected': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
              '& .MuiListItemIcon-root': {
                color: 'primary.contrastText',
              },
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 40,
              color: isActive(item.path) ? 'inherit' : 'text.secondary',
            }}
          >
            {item.icon}
          </ListItemIcon>
          <ListItemText 
            primary={item.text}
            primaryTypographyProps={{
              fontSize: '0.9rem',
              fontWeight: isActive(item.path) ? 600 : 400,
            }}
          />
          {item.badge && (
            <Chip
              label={item.badge}
              size="small"
              color="secondary"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          )}
        </ListItemButton>
      </ListItem>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo/Brand */}
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight="bold" color="primary">
          CloudHotel
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Management System
        </Typography>
      </Box>

      <Divider />

      {/* User Info */}
      <Box sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" mb={1}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'success.main',
              mr: 1,
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {user?.firstName} {user?.lastName}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {user?.role?.replace('_', ' ').toUpperCase()}
        </Typography>
        {user?.Hotel && (
          <Typography variant="caption" display="block" color="text.secondary">
            {user.Hotel.name}
          </Typography>
        )}
      </Box>

      <Divider />

      {/* Main Navigation */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List sx={{ pt: 1 }}>
          {menuItems.map(renderMenuItem)}
        </List>

        <Divider sx={{ mx: 2, my: 1 }} />

        <List>
          {settingsItems.map(renderMenuItem)}
        </List>
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          v1.0.0
        </Typography>
      </Box>
    </Box>
  );
};

export default Sidebar;