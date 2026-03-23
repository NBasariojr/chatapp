import { Request, Response } from 'express';
import https from 'node:https';

/**
 * Sentry Tunnel Controller
 * 
 * Handles proxying Sentry events through your own backend domain to avoid ad blockers.
 * Ad blockers block sentry.io but won't block your own domain.
 * 
 * The frontend Sentry SDK is configured with:
 * tunnel: '/api/sentry-tunnel'
 * 
 * This controller forwards the envelope to Sentry's API.
 */
export class SentryController {
  /**
   * POST /api/sentry-tunnel
   * 
   * Proxies Sentry events to Sentry's API to bypass ad blockers
   */
  async tunnelSentryEvent(req: Request, res: Response): Promise<void> {
    try {
      // Extract the DSN from the request body to determine project ID
      // Sentry SDK sends the DSN in the envelope headers
      const envelope = req.body;
      if (!envelope || typeof envelope !== 'string') {
        res.status(400).json({ error: 'Invalid envelope' });
        return;
      }

      // Parse the envelope to get the DSN
      const lines = envelope.split('\n');
      const headerLine = lines[0];
      if (!headerLine) {
        res.status(400).json({ error: 'Missing envelope header' });
        return;
      }

      const header = JSON.parse(headerLine);
      const dsn = header.dsn;
      if (!dsn) {
        res.status(400).json({ error: 'Missing DSN in envelope header' });
        return;
      }

      // Extract project ID from DSN
      // DSN format: https://<key>@<host>/<project-id>
      const dsnUrl = new URL(dsn);
      const projectId = dsnUrl.pathname.replace(/^\//, '');
      
      if (!projectId) {
        res.status(400).json({ error: 'Invalid DSN format' });
        return;
      }

      // Forward to Sentry API using Node.js https module
      const sentryUrl = `https://sentry.io/api/${projectId}/envelope/`;
      const url = new URL(sentryUrl);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'Content-Length': Buffer.byteLength(req.body),
          ...req.headers,
          // Remove host header to avoid conflicts
          host: undefined,
        },
        timeout: 10000, // 10 second timeout
      };

      const proxyReq = https.request(options, (proxyRes) => {
        // Forward Sentry's response back to client
        res.status(proxyRes.statusCode || 200);
        
        // Copy headers
        Object.entries(proxyRes.headers).forEach(([key, value]) => {
          if (value) res.set(key, value);
        });
        
        // Pipe response body
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (error) => {
        console.error('[Sentry Tunnel] Proxy request error:', error);
        res.status(502).json({ error: 'Bad gateway' });
      });

      proxyReq.on('timeout', () => {
        console.error('[Sentry Tunnel] Request timeout');
        proxyReq.destroy();
        res.status(408).json({ error: 'Request timeout' });
      });

      // Send request body
      proxyReq.write(req.body);
      proxyReq.end();
    } catch (error) {
      console.error('[Sentry Tunnel] Error forwarding to Sentry:', error);
      
      // Type guard for unknown error
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          res.status(408).json({ error: 'Request timeout' });
        } else {
          res.status(500).json({ error: 'Internal server error' });
        }
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
}

// Export singleton instance for use in routes
export const sentryController = new SentryController();
