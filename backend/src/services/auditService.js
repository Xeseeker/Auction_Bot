import AuditLog from '../models/AuditLog.js';
import { createPagination, parsePagination } from '../utils/pagination.js';

export const recordAuditLog = async ({
  actor = 'system',
  action,
  entityType,
  entityId = null,
  reason = '',
  metadata = {},
}) => {
  if (!action || !entityType) {
    return null;
  }

  return AuditLog.create({
    actor,
    action,
    entityType,
    entityId,
    reason,
    metadata,
  });
};

export const listAuditLogs = async ({ actor, action, entityType, entityId, page, limit } = {}) => {
  const { currentPage, perPage, skip } = parsePagination({ page, limit }, { defaultLimit: 25, maxLimit: 100 });
  const query = {};

  if (actor) {
    query.actor = actor;
  }

  if (action) {
    query.action = action;
  }

  if (entityType) {
    query.entityType = entityType;
  }

  if (entityId) {
    query.entityId = entityId;
  }

  const [items, total] = await Promise.all([
    AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(perPage),
    AuditLog.countDocuments(query),
  ]);

  return {
    items,
    pagination: createPagination(currentPage, perPage, total),
  };
};
