import * as signalsService from '../services/signals.service.js';
import { success, paginated } from '../utils/apiResponse.js';

export async function getAll(req, res, next) {
  try {
    const { page, limit, type, minConfidence } = req.query;
    const result = await signalsService.getAll({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      type,
      minConfidence,
    });
    return paginated(res, result.data, result.total, result.page, result.limit);
  } catch (err) {
    next(err);
  }
}

export async function search(req, res, next) {
  try {
    const { q, page, limit } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'Search query required' });
    const result = await signalsService.search({
      q,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });
    return paginated(res, result.data, result.total, result.page, result.limit);
  } catch (err) {
    next(err);
  }
}
