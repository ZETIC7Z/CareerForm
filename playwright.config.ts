import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'./tests/e2e',
  timeout:45_000,
  retries:process.env.CI?2:1,
  expect:{timeout:8_000},
  fullyParallel:false,
  reporter:[['list'],['html',{outputFolder:'playwright-report',open:'never'}]],
  use:{
    baseURL:'http://127.0.0.1:3000',
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
    video:'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer:{
    command:'npm run dev -- --hostname 127.0.0.1 --port 3000',
    url:'http://127.0.0.1:3000',
    reuseExistingServer:true,
    timeout:120_000,
  },
});
