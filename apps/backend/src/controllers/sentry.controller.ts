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

      // Validate projectId against configured value
      const allowedProjectId = process.env.SENTRY_PROJECT_ID;
      if (allowedProjectId && projectId !== allowedProjectId) {
        console.error(`[Sentry Tunnel] Rejected project ID: ${projectId} (allowed: ${allowedProjectId})`);
        res.status(403).json({ error: 'Project ID not allowed' });
        return;
      }

      // Forward to Sentry API using dynamic DSN host
      const sentryUrl = `${dsnUrl.protocol}//${dsnUrl.host}/api/${projectId}/envelope/`;
      const url = new URL(sentryUrl);
      
      // Build headers with explicit allowlist to prevent security leaks
      const allowedHeaders = [
        'user-agent',
        'accept',
        'accept-encoding',
        'sentry-trace',
        'baggage',
        'x-request-id',
      ];
      
      const headers: Record<string, string | number | undefined> = {};
      
      // Copy only allowed headers
      allowedHeaders.forEach(headerName => {
        const value = req.headers[headerName];
        if (value !== undefined && typeof value === 'string') {
          headers[headerName] = value;
        }
      });
      
      // Set required headers explicitly
      headers['Content-Type'] = 'application/x-sentry-envelope';
      headers['Content-Length'] = Buffer.byteLength(req.body);
      // Ensure host is undefined to avoid conflicts
      headers['host'] = undefined;
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers,
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
