import { describe, expect, it, vi } from 'vitest';
import { validateObjectIdParam } from './validateObjectId.js';

describe('validateObjectIdParam', () => {
  it('continues for valid ObjectId params', () => {
    const next = vi.fn();

    validateObjectIdParam('id')({ params: { id: '507f1f77bcf86cd799439011' } }, {}, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('returns a 400 for invalid ObjectId params', () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));

    validateObjectIdParam('id')({ params: { id: 'not-an-id' } }, { status }, vi.fn());

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'Invalid id.' });
  });
});
