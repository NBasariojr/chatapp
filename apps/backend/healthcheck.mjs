// apps/backend/healthcheck.js
import { get } from 'node:http';

const options = {
  host: 'localhost',
  port: 4000,
  path: '/health',
  timeout: 2000
};

const request = get(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.error('Healthcheck failed:', err.message);
  process.exit(1);
});

request.on('timeout', () => {
  console.error('Healthcheck timed out');
  request.abort();
  process.exit(1);
});