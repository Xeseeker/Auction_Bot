import { describe, expect, it } from 'vitest';
import { getCurrentDutchPrice } from '../utils/auctionPricing.js';

describe('getCurrentDutchPrice', () => {
  it('returns currentBid for non-Dutch auctions', () => {
    expect(
      getCurrentDutchPrice({
        auctionType: 'standard',
        status: 'active',
        startingPrice: 100,
        currentBid: 125,
      })
    ).toBe(125);
  });

  it('drops the Dutch price by completed intervals', () => {
    const createdAt = new Date('2026-01-01T10:00:00.000Z');
    const at = new Date('2026-01-01T10:31:00.000Z');

    expect(
      getCurrentDutchPrice(
        {
          auctionType: 'dutch',
          status: 'active',
          startingPrice: 100,
          currentBid: 100,
          dutchFloorPrice: 40,
          dutchDropAmount: 10,
          dutchDropIntervalMinutes: 15,
          createdAt,
        },
        at
      )
    ).toBe(80);
  });

  it('does not drop below the Dutch floor price', () => {
    const createdAt = new Date('2026-01-01T10:00:00.000Z');
    const at = new Date('2026-01-01T12:00:00.000Z');

    expect(
      getCurrentDutchPrice(
        {
          auctionType: 'dutch',
          status: 'active',
          startingPrice: 100,
          currentBid: 100,
          dutchFloorPrice: 55,
          dutchDropAmount: 10,
          dutchDropIntervalMinutes: 15,
          createdAt,
        },
        at
      )
    ).toBe(55);
  });
});
