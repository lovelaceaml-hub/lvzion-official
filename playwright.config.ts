import {defineConfig,devices} from '@playwright/test';
const port=Number(process.env.LVZ_BROWSER_TEST_PORT||3017);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local browser test port.');
const baseURL='http://127.0.0.1:'+port;
export default defineConfig({testDir:'./tests/browser',timeout:30000,use:{baseURL,...devices['iPhone 13'],defaultBrowserType:'chromium'},webServer:{command:'npm run start -- --hostname 127.0.0.1 --port '+port,url:baseURL+'/member-preview',reuseExistingServer:false,env:{LVZ_MEMBER_SYSTEM_ENABLED:'false',LVZ_SELF_SERVICE_SIGNUP_ENABLED:'false'},timeout:120000},reporter:[['list']],projects:[{name:'phone-chromium',use:{browserName:'chromium'}}]});
