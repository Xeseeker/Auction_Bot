import express from 'express';
import bot from '../bot/instance.js';
import { authenticateAdminCredentials, requireAdminApi } from '../middleware/adminAuth.js';
import { validateObjectIdParam } from '../middleware/validateObjectId.js';
import Auction from '../models/Auction.js';
import {
  getDashboardStats,
  getDetailedStats,
  listBidsForAdmin,
  listPendingSellerApprovals,
  listUsersForAdmin,
  updateSellerApprovalStatus,
  updateUserBanStatus,
} from '../services/adminService.js';
import {
  approveAuctionByAdmin,
  cancelAuctionByAdmin,
  getAuctionAdminDetails,
  listAuctionsForAdmin,
  rejectAuctionByAdmin,
} from '../services/auctionService.js';

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

router.get('/auctions/:id', requireAdminApi, validateObjectIdParam('id'), async (req, res) => {
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

router.get('/auctions/:id/media/:mediaId', requireAdminApi, validateObjectIdParam('id'), async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id).select('mediaAssets imageUrl videoUrl');
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found.' });
    }

    const mediaAsset =
      auction.mediaAssets?.find((asset) => String(asset._id) === String(req.params.mediaId)) ||
      (auction.imageUrl && req.params.mediaId === 'legacy-image'
        ? { kind: 'photo', fileId: auction.imageUrl }
        : auction.videoUrl && req.params.mediaId === 'legacy-video'
          ? { kind: 'video', fileId: auction.videoUrl }
          : null);

    if (!mediaAsset) {
      return res.status(404).json({ error: 'Media asset not found.' });
    }

    if (mediaAsset.sourceUrl) {
      return res.redirect(mediaAsset.sourceUrl);
    }

    if (!bot) {
      return res.status(503).json({ error: 'Telegram bot is unavailable.' });
    }

    const fileUrl = await bot.getFileLink(mediaAsset.fileId);
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return res.status(502).json({ error: 'Could not fetch media from Telegram.' });
    }

    const mediaBuffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader(
      'Content-Type',
      response.headers.get('content-type') || (mediaAsset.kind === 'video' ? 'video/mp4' : 'image/jpeg')
    );
    return res.send(mediaBuffer);
  } catch (error) {
    return handleError(res, error);
  }
});

router.put('/auctions/:id/cancel', requireAdminApi, validateObjectIdParam('id'), async (req, res) => {
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

router.put('/auctions/:id/approve', requireAdminApi, validateObjectIdParam('id'), async (req, res) => {
  try {
    const auction = await approveAuctionByAdmin(req.params.id, {
      adminLabel: req.session.adminUser?.username || 'Admin Panel',
    });

    return res.json({ ok: true, auction });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put('/auctions/:id/reject', requireAdminApi, validateObjectIdParam('id'), async (req, res) => {
  try {
    const auction = await rejectAuctionByAdmin(req.params.id, {
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

router.get('/users/pending-approvals', requireAdminApi, async (req, res) => {
  try {
    return res.json(await listPendingSellerApprovals(req.query));
  } catch (error) {
    return handleError(res, error);
  }
});

router.put('/users/:id/ban', requireAdminApi, validateObjectIdParam('id'), async (req, res) => {
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

router.put('/users/:id/seller-approval', requireAdminApi, validateObjectIdParam('id'), async (req, res) => {
  try {
    const user = await updateSellerApprovalStatus(req.params.id, {
      approved: req.body?.approved,
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
