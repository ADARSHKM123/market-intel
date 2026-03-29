import * as authService from '../services/auth.service.js';
import { success } from '../utils/apiResponse.js';

export async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    return success(res, result, 201);
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    return success(res, result);
  } catch (err) {
    next(err);
  }
}
