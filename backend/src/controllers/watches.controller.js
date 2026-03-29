import * as watchesService from '../services/watches.service.js';
import { success } from '../utils/apiResponse.js';

export async function getAll(req, res, next) {
  try {
    const data = await watchesService.getAll(req.user.id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const data = await watchesService.create(req.user.id, req.body);
    return success(res, data, 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const data = await watchesService.update(req.params.id, req.user.id, req.body);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await watchesService.remove(req.params.id, req.user.id);
    return success(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}
