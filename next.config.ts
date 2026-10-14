import type {NextConfig} from 'next';
const privateHeaders=[{key:'Cache-Control',value:'private, no-store'},{key:'Referrer-Policy',value:'no-referrer'}];
const config:NextConfig={async headers(){return[
 {source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'same-origin'},{key:'Content-Security-Policy',value:"frame-ancestors 'none'; base-uri 'self'; object-src 'none'"}]},
 {source:'/auth/:path*',headers:privateHeaders},
 {source:'/api/:path*',headers:privateHeaders},
 {source:'/members/:path*',headers:privateHeaders},
 {source:'/sign-in',headers:privateHeaders},
 {source:'/activate',headers:privateHeaders},
 {source:'/sign-up',headers:privateHeaders},
 {source:'/signup/:path*',headers:privateHeaders},
 {source:'/reset-password',headers:privateHeaders},
 {source:'/sw.js',headers:[{key:'Cache-Control',value:'no-store, max-age=0'},{key:'Service-Worker-Allowed',value:'/'},{key:'Content-Type',value:'application/javascript; charset=utf-8'}]}
];}};
export default config;
