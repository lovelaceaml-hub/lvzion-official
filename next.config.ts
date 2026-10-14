import type {NextConfig} from 'next';
const config:NextConfig={async headers(){return[{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'same-origin'},{key:'Content-Security-Policy',value:"frame-ancestors 'none'; base-uri 'self'; object-src 'none'"}]},{source:'/auth/:path*',headers:[{key:'Referrer-Policy',value:'no-referrer'},{key:'Cache-Control',value:'private, no-store'}]}];}};
export default config;
