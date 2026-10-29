import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir:'tests/browser',fullyParallel:true,workers:3,retries:0,timeout:30000,
 reporter:[['list']],use:{baseURL:'http://127.0.0.1:5173',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[
  {name:'iPhone WebKit',use:{...devices['iPhone 13'],defaultBrowserType:'webkit'}},
  {name:'iPhone SE WebKit',use:{...devices['iPhone SE'],defaultBrowserType:'webkit'}},
  {name:'mobile Chromium',use:{...devices['Pixel 7'],viewport:{width:390,height:844},defaultBrowserType:'chromium'}},
 ],
 webServer:{command:'npm run dev -- --port 5173',url:'http://127.0.0.1:5173',reuseExistingServer:true,timeout:30000}
});
