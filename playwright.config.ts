import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 120_000, expect: { timeout: 90_000 },
  fullyParallel: false, retries: 0, reporter: 'list',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4173', browserName: 'chromium',
    launchOptions: { args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl'] },
    screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/IVI/', reuseExistingServer: !process.env.CI, timeout: 90_000 }
});
