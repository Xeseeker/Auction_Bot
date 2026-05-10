export const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

export const createPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.max(Math.ceil(total / limit), 1),
});

export const parsePagination = ({ page, limit } = {}, { defaultLimit = 20, maxLimit = 100 } = {}) => {
  const currentPage = toPositiveInt(page, 1);
  const perPage = Math.min(toPositiveInt(limit, defaultLimit), maxLimit);

  return {
    currentPage,
    perPage,
    skip: (currentPage - 1) * perPage,
  };
};
