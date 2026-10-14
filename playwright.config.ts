import {defineConfig,devices} from '@playwright/test';
const port=Number(process.env.LVZ_BROWSER_TEST_PORT??3000);
if(![3000,3100].includes(port))throw new Error('Use an approved loopback test port.');
export default defineConfig({testDir:'./tests/browser',timeout:30000,use:{baseURL:`http://127.0.0.1:${port}`,...devices['iPhone 13'],defaultBrowserType:'chromium'},webServer:{command:`npm run start -- --hostname 127.0.0.1 --port ${port}`,url:`http://127.0.0.1:${port}/member-preview`,reuseExistingServer:true,timeout:120000},reporter:[['list']],projects:[{name:'phone-chromium',use:{browserName:'chromium'}}]});
