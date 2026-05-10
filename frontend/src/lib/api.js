const request = async (path, options = {}) => {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const apiError = new Error(payload?.error || 'Request failed.');
    apiError.status = response.status;
    throw apiError;
  }

  return payload;
};

export const adminApi = {
  session: () => request('/api/admin/session'),
  login: (body) =>
    request('/api/admin/session', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  logout: () =>
    request('/api/admin/session', {
      method: 'DELETE',
    }),
  dashboard: () => request('/api/admin/dashboard'),
  auctions: (query = '') => request(`/api/admin/auctions${query ? `?${query}` : ''}`),
  auction: (id) => request(`/api/admin/auctions/${id}`),
  cancelAuction: (id, body) =>
    request(`/api/admin/auctions/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  approveAuction: (id) =>
    request(`/api/admin/auctions/${id}/approve`, {
      method: 'PUT',
    }),
  rejectAuction: (id, body) =>
    request(`/api/admin/auctions/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  users: (query = '') => request(`/api/admin/users${query ? `?${query}` : ''}`),
  pendingSellerApprovals: (query = '') => request(`/api/admin/users/pending-approvals${query ? `?${query}` : ''}`),
  banUser: (id, body) =>
    request(`/api/admin/users/${id}/ban`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  reviewSeller: (id, body) =>
    request(`/api/admin/users/${id}/seller-approval`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  stats: () => request('/api/admin/stats'),
  auctionMediaUrl: (auctionId, mediaId) => `/api/admin/auctions/${auctionId}/media/${mediaId}`,
};
