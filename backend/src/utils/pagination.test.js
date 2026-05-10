import { describe, expect, it } from 'vitest';
import { createPagination, parsePagination, toPositiveInt } from './pagination.js';

describe('toPositiveInt', () => {
  it('returns parsed positive integers', () => {
    expect(toPositiveInt('3', 1)).toBe(3);
    expect(toPositiveInt(8, 1)).toBe(8);
  });

  it('returns fallback for invalid or non-positive values', () => {
    expect(toPositiveInt('bad', 1)).toBe(1);
    expect(toPositiveInt(0, 1)).toBe(1);
    expect(toPositiveInt(-4, 1)).toBe(1);
  });
});

describe('parsePagination', () => {
  it('normalizes page, limit, and skip', () => {
    expect(parsePagination({ page: '3', limit: '15' })).toEqual({
      currentPage: 3,
      perPage: 15,
      skip: 30,
    });
  });

  it('caps limit at the configured maximum', () => {
    expect(parsePagination({ page: 1, limit: 500 }, { defaultLimit: 20, maxLimit: 50 })).toEqual({
      currentPage: 1,
      perPage: 50,
      skip: 0,
    });
  });
});

describe('createPagination', () => {
  it('creates page metadata', () => {
    expect(createPagination(2, 20, 45)).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      pages: 3,
    });
  });

  it('always reports at least one page', () => {
    expect(createPagination(1, 20, 0).pages).toBe(1);
  });
});
