import * as analyticsService from '../services/analytics.service.js';
import { success } from '../utils/apiResponse.js';

export async function getOverview(req, res, next) {
  try {
    const data = await analyticsService.getOverview();
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getTrends(req, res, next) {
  try {
    const { days } = req.query;
    const data = await analyticsService.getTrends({ days: parseInt(days) || 30 });
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getNiches(req, res, next) {
  try {
    const data = await analyticsService.getNiches();
    return success(res, data);
  } catch (err) {
    next(err);
  }
}
