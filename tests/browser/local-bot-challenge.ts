import type {Page} from '@playwright/test';

// The pinned BotID 1.5.11 client loads this dependency before issuing protected
// POSTs. Mock it only for local UI tests; this is not hosted BotID verification.
const challengePath='/149e9513-01fa-4fb0-aad4-566afd725d1b/2d206a39-8ed7-437e-a3be-862e0f06eea3/a-4-a/c.js';

export async function mockLocalBotChallenge(page:Page,baseURL:string|undefined){
 if(!baseURL)throw new Error('The synthetic BotID fixture requires an explicit loopback base URL.');
 const origin=new URL(baseURL);
 if(origin.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(origin.hostname))
  throw new Error('The synthetic BotID fixture may only run against a loopback HTTP server.');
 await page.route(url=>url.origin===origin.origin&&url.pathname===challengePath,route=>route.fulfill({
  status:200,contentType:'application/javascript',headers:{'Cache-Control':'no-store'},
  body:'window.V_C.push({b:0,v:"synthetic-browser-fixture",e:"synthetic-browser-fixture",d:0});',
 }));
}
