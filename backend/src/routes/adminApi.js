import express from 'express';
import { authenticateAdminCredentials, requireAdminApi } from '../middleware/adminAuth.js';
import {
  getDashboardStats,
  getDetailedStats,
  listBidsForAdmin,
  listUsersForAdmin,
  updateUserBanStatus,
} from '../services/adminService.js';
import { cancelAuctionByAdmin, getAuctionAdminDetails, listAuctionsForAdmin } from '../services/auctionService.js';

const router = express.Router();

const handleError = (res, error) => {
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({ error: error.message || 'Unexpected error.' });
};

router.post('/session', (req, res) => {
  const { username, password } = req.body;

  if (!authenticateAdminCredentials({ username, password })) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  req.session.adminUser = {
    username,
    loggedInAt: new Date().toISOString(),
  };

  return res.json({ ok: true, adminUser: req.session.adminUser });
});

router.get('/session', (req, res) => {
  if (!req.session?.adminUser) {
    return res.status(401).json({ error: 'Admin authentication required.' });
  }

  return res.json({ ok: true, adminUser: req.session.adminUser });
});

router.delete('/session', requireAdminApi, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.status(204).end();
  });
});

router.get('/dashboard', requireAdminApi, async (req, res) => {
  try {
    return res.json(await getDashboardStats());
  } catch (error) {
    return handleError(res, error);
  }
});

router.get('/auctions', requireAdminApi, async (req, res) => {
  try {
    return res.json(await listAuctionsForAdmin(req.query));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get('/auctions/:id', requireAdminApi, async (req, res) => {
  try {
    const result = await getAuctionAdminDetails(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Auction not found.' });
    }

    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
});

router.put('/auctions/:id/cancel', requireAdminApi, async (req, res) => {
  try {
    const auction = await cancelAuctionByAdmin(req.params.id, {
      reason: req.body?.reason || '',
      adminLabel: req.session.adminUser?.username || 'Admin Panel',
    });

    return res.json({ ok: true, auction });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get('/users', requireAdminApi, async (req, res) => {
  try {
    return res.json(await listUsersForAdmin(req.query));
  } catch (error) {
    return handleError(res, error);
  }
});

router.put('/users/:id/ban', requireAdminApi, async (req, res) => {
  try {
    const user = await updateUserBanStatus(req.params.id, {
      banned: req.body?.banned,
      reason: req.body?.reason || '',
      adminLabel: req.session.adminUser?.username || 'Admin Panel',
    });

    return res.json({ ok: true, user });
  } catch (error) {
    return handleError(res, error);
  }
});

router.get('/bids', requireAdminApi, async (req, res) => {
  try {
    return res.json(await listBidsForAdmin(req.query));
  } catch (error) {
    return handleError(res, error);
  }
});

router.get('/stats', requireAdminApi, async (req, res) => {
  try {
    return res.json(await getDetailedStats());
  } catch (error) {
    return handleError(res, error);
  }
});

export default router;
