import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Initialize socket connection
      const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:3000', {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setConnected(true);
        
        // Join hotel room for real-time updates
        if (user.hotelId) {
          newSocket.emit('join-hotel', user.hotelId);
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setConnected(false);
      });

      // Real-time notifications
      newSocket.on('new-booking', (data) => {
        toast.success(`New booking: ${data.bookingNumber} by ${data.guestName}`);
      });

      newSocket.on('booking-updated', (data) => {
        toast.info(`Booking ${data.bookingNumber} updated by ${data.updatedBy}`);
      });

      newSocket.on('guest-checkedin', (data) => {
        toast.success(`${data.guestName} checked in to room ${data.roomNumber}`);
      });

      newSocket.on('guest-checkedout', (data) => {
        toast.info(`${data.guestName} checked out from room ${data.roomNumber}`);
      });

      newSocket.on('room-updated', (data) => {
        toast.info(`Room ${data.roomNumber} status updated to ${data.status}`);
      });

      newSocket.on('new-housekeeping-task', (data) => {
        toast.info(`New ${data.type} task for room ${data.roomNumber}`);
      });

      newSocket.on('housekeeping-task-updated', (data) => {
        toast.info(`Task for room ${data.roomNumber} updated to ${data.status}`);
      });

      newSocket.on('task-assigned', (data) => {
        if (user.id === data.assignedTo) {
          toast.info(`New task assigned: ${data.title}`);
        }
      });

      newSocket.on('incoming-call', (data) => {
        const guestInfo = data.guestName ? ` from ${data.guestName}` : '';
        toast.info(`Incoming ${data.direction} call${guestInfo}`);
      });

      newSocket.on('payment-received', (data) => {
        toast.success(`Payment received: ${data.amount} ${data.currency}`);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  const emit = (event, data) => {
    if (socket) {
      socket.emit(event, data);
    }
  };

  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  const value = {
    socket,
    connected,
    emit,
    on,
    off
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};