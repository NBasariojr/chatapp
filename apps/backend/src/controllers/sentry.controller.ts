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
      // express.raw() delivers a Buffer — not a string
      const bodyBuffer = req.body as Buffer;
      if (!Buffer.isBuffer(bodyBuffer) || bodyBuffer.length === 0) {
        res.status(400).json({ error: 'Invalid envelope' });
        return;
      }

      // Parse only the first line (envelope header) as UTF-8
      const firstNewline = bodyBuffer.indexOf(0x0a); // '\n'
      const headerLine = (firstNewline === -1 ? bodyBuffer : bodyBuffer.subarray(0, firstNewline)).toString('utf8');

      if (!headerLine) {
        res.status(400).json({ error: 'Missing envelope header' });
        return;
      }

      let header: { dsn?: string };
      try {
        header = JSON.parse(headerLine) as { dsn?: string };
      } catch {
        res.status(400).json({ error: 'Malformed envelope header' });
        return;
      }

      const dsn = header.dsn;
      if (!dsn) {
        res.status(400).json({ error: 'Missing DSN in envelope header' });
        return;
      }

      const dsnUrl = new URL(dsn);
      const projectId = dsnUrl.pathname.replace(/^\//, '');

      if (!projectId) {
        res.status(400).json({ error: 'Invalid DSN format' });
        return;
      }

      // Validate projectId against configured value — early, before any forwarding
      const allowedProjectId = process.env.SENTRY_PROJECT_ID;
      if (allowedProjectId && projectId !== allowedProjectId) {
        console.error(`[SentryTunnel] Rejected projectId: ${projectId}`);
        res.status(403).json({ error: 'Project ID not allowed' });
        return;
      }

      // Build URL from parsed DSN host — supports self-hosted Sentry
      const sentryUrl = `${dsnUrl.protocol}//${dsnUrl.host}/api/${projectId}/envelope/`;
      const url = new URL(sentryUrl);

      // Explicit header allowlist — never spread req.headers
      const allowedHeaders = [
        'user-agent',
        'accept',
        'accept-encoding',
        'sentry-trace',
        'baggage',
        'x-request-id',
      ];

      const headers: Record<string, string | number | undefined> = {};
      allowedHeaders.forEach((headerName) => {
        const value = req.headers[headerName];
        if (typeof value === 'string') headers[headerName] = value;
      });

      headers['Content-Type'] = 'application/x-sentry-envelope';
      headers['Content-Length'] = bodyBuffer.length;
      // Do NOT touch or remove 'host' header here.
      // Let Node.js set it automatically from the options.hostname

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers,
        timeout: 10000,
      };

      // Single-response guard — prevents both error and timeout from replying
      let replied = false;

      const proxyReq = https.request(options, (proxyRes) => {
        if (replied) return;
        replied = true;

        if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
          console.warn(`[SentryTunnel] Sentry responded with ${proxyRes.statusCode} — check DSN/projectId`);
        }

        res.status(proxyRes.statusCode ?? 200);
        Object.entries(proxyRes.headers).forEach(([key, value]) => {
          if (value) res.set(key, value as string);
        });
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (error) => {
        if (replied) return;
        replied = true;
        console.error('[SentryTunnel] Proxy error:', error.message);
        // Optional: log more context
        console.error('[SentryTunnel] Target URL was:', sentryUrl);
        proxyReq.destroy();
        res.status(502).json({ error: 'Bad gateway' });
      });

      proxyReq.on('timeout', () => {
        if (replied) return;
        replied = true;
        console.error('[SentryTunnel] Request timeout');
        proxyReq.destroy();
        res.status(408).json({ error: 'Request timeout' });
      });

      // Write raw buffer — preserves binary envelope data
      proxyReq.write(bodyBuffer);
      proxyReq.end();
    } catch (error) {
      console.error('[SentryTunnel] Unexpected error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
}

// Export singleton instance for use in routes
export const sentryController = new SentryController();
