let ioInstance = null;

export const initLiveUpdates = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    socket.on('platform:subscribe', (payload = {}) => {
      const auctionId = payload.auctionId ? String(payload.auctionId) : '';
      if (auctionId) {
        socket.join(`auction:${auctionId}`);
      }
    });

    socket.on('platform:unsubscribe', (payload = {}) => {
      const auctionId = payload.auctionId ? String(payload.auctionId) : '';
      if (auctionId) {
        socket.leave(`auction:${auctionId}`);
      }
    });
  });

  return ioInstance;
};

export const emitPlatformUpdate = (event, payload = {}) => {
  if (!ioInstance) {
    return false;
  }

  ioInstance.emit(event, payload);
  return true;
};

export const emitAuctionRoomUpdate = (auctionId, event, payload = {}) => {
  if (!ioInstance || !auctionId) {
    return false;
  }

  ioInstance.to(`auction:${auctionId}`).emit(event, payload);
  return true;
};

