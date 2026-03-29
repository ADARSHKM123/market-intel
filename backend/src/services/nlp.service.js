import config from '../config/index.js';
import logger from '../utils/logger.js';

const NLP_BASE = config.nlpServiceUrl;

export async function processTexts(data) {
  try {
    const res = await fetch(`${NLP_BASE}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`NLP service error: ${res.status}`);
    return await res.json();
  } catch (err) {
    logger.warn({ err: err.message }, 'NLP service unavailable');
    return null;
  }
}

export async function clusterSignals(data) {
  try {
    const res = await fetch(`${NLP_BASE}/cluster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`NLP service error: ${res.status}`);
    return await res.json();
  } catch (err) {
    logger.warn({ err: err.message }, 'NLP service unavailable');
    return null;
  }
}
