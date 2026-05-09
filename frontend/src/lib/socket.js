import { io } from 'socket.io-client';

let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
  }

  return socketInstance;
};

export const closeSocket = () => {
  if (socketInstance) {
    socketInstance.close();
    socketInstance = null;
  }
};

