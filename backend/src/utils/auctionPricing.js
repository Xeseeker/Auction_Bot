export const getAuctionType = (auction) => auction.auctionType || 'standard';

export const isDutchAuction = (auction) => getAuctionType(auction) === 'dutch';

export const getCurrentDutchPrice = (auction, at = new Date()) => {
  const openingPrice = Number(auction.startingPrice) || 0;
  const floorPrice = Number(auction.dutchFloorPrice) || 0;
  const dropAmount = Number(auction.dutchDropAmount) || 0;
  const dropIntervalMinutes = Number(auction.dutchDropIntervalMinutes) || 0;

  if (!isDutchAuction(auction) || !dropAmount || !dropIntervalMinutes || auction.status !== 'active') {
    return Number(auction.currentBid) || openingPrice;
  }

  const elapsedMs = Math.max(new Date(at).getTime() - new Date(auction.createdAt).getTime(), 0);
  const completedSteps = Math.floor(elapsedMs / (dropIntervalMinutes * 60 * 1000));
  const droppedPrice = openingPrice - completedSteps * dropAmount;
  return Math.max(droppedPrice, floorPrice);
};
