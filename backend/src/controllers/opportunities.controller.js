import * as opportunitiesService from '../services/opportunities.service.js';
import { success, paginated } from '../utils/apiResponse.js';

export async function getAll(req, res, next) {
  try {
    const { page, limit, status, category, minScore, sort } = req.query;
    const result = await opportunitiesService.getAll({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status,
      category,
      minScore,
      sort,
    });
    return paginated(res, result.data, result.total, result.page, result.limit);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const data = await opportunitiesService.getById(req.params.id);
    return success(res, data);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }
    next(err);
  }
}

export async function getSignals(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await opportunitiesService.getSignals(req.params.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });
    return paginated(res, result.data, result.total, result.page, result.limit);
  } catch (err) {
    next(err);
  }
}

export async function getTrend(req, res, next) {
  try {
    const { days } = req.query;
    const data = await opportunitiesService.getTrend(req.params.id, {
      days: parseInt(days) || 30,
    });
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const data = await opportunitiesService.updateStatus(req.params.id, req.body.status);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}
