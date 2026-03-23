import { Router } from 'express';
import { sentryController } from '../controllers/sentry.controller';

const router: Router = Router();

/**
 * Sentry Tunnel Endpoint
 * 
 * Proxies Sentry events through your own backend domain to avoid ad blockers.
 * Ad blockers block sentry.io but won't block your own domain.
 * 
 * The frontend Sentry SDK is configured with:
 * tunnel: '/api/sentry-tunnel'
 * 
 * This endpoint forwards the envelope to Sentry's API.
 */
router.post('/sentry-tunnel', require('express').text({ type: '*/*' }), sentryController.tunnelSentryEvent.bind(sentryController));

export default router;
