import * as sourcesService from '../services/sources.service.js';
import { success } from '../utils/apiResponse.js';

export async function getAll(req, res, next) {
  try {
    const data = await sourcesService.getAll();
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const data = await sourcesService.getById(req.params.id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const data = await sourcesService.create(req.body);
    return success(res, data, 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const data = await sourcesService.update(req.params.id, req.body);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await sourcesService.remove(req.params.id);
    return success(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}
