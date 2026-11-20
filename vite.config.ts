/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// Latest commit (local date/time + subject), shown small on the sale screen so it is obvious which build the iPad runs.
function latestCommit(): string {
  try {
    const out = execSync('git log -1 --format=%ci%n%s', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const [date, ...subject] = out.trim().split('\n');
    return `${date.slice(0, 16)} · ${subject.join(' ')}`;
  } catch { return ''; }
}

export default defineConfig({
  base: './',
  define: { __BUILD_COMMIT__: JSON.stringify(latestCommit()) },
  server: { host: true, port: 5175, strictPort: true },
  test: { environment: 'jsdom', include: ['src/**/*.test.ts'] },
});
