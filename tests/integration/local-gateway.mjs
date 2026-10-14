// Test-only loopback gateway and SMTP sink. No hosted credentials or external mail.
import http from 'node:http';import net from 'node:net';import {readFileSync,appendFileSync} from 'node:fs';
const root=process.env.LVZ_INTEGRATION_DIR;if(!root?.startsWith('/tmp/lvz-')||process.env.VERCEL)throw new Error('Disposable local integration only.');
const credentials=JSON.parse(readFileSync(root+'/credentials.json','utf8'));
http.createServer((req,res)=>{
 if(req.url==='/signup-template'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<a href="http://127.0.0.1:3000/auth/continue#token_hash={{ .TokenHash }}&amp;type=signup">Confirm email</a>');return;}
 const auth=req.headers.apikey;
 if(![credentials.anon,credentials.service].includes(auth)){res.writeHead(401);res.end('{}');return;}
 const target=req.url.startsWith('/auth/v1/')?{port:9999,prefix:'/auth/v1'}:req.url.startsWith('/rest/v1/')?{port:3001,prefix:'/rest/v1'}:null;
 if(!target){res.writeHead(404);res.end();return;}
 const upstream=http.request({hostname:'127.0.0.1',port:target.port,path:req.url.slice(target.prefix.length),method:req.method,headers:{...req.headers,host:'127.0.0.1:'+target.port}},r=>{res.writeHead(r.statusCode??500,r.headers);r.pipe(res);});
 upstream.on('error',()=>{res.writeHead(503);res.end();});req.pipe(upstream);
}).listen(54321,'127.0.0.1');
net.createServer(socket=>{
 socket.setTimeout(20000,()=>socket.destroy());socket.write('220 local-test-sink ESMTP\r\n');let buffer='',inData=false,lines=[],recipient='';
 socket.on('data',chunk=>{buffer+=chunk.toString();if(buffer.length>100000){socket.destroy();return;}while(buffer.includes('\r\n')){let i=buffer.indexOf('\r\n');const line=buffer.slice(0,i);buffer=buffer.slice(i+2);
 if(inData){if(line==='.') {appendFileSync(root+'/outbox.ndjson',JSON.stringify({recipient,mime:lines.join('\r\n')})+'\n',{mode:0o600});lines=[];inData=false;socket.write('250 queued in local test sink\r\n');}else lines.push(line.replace(/^\.\./,'.'));continue;}
 if(/^EHLO|^HELO/.test(line))socket.write('250-localhost\r\n250 SIZE 100000\r\n');
 else if(/^MAIL FROM:/i.test(line))socket.write('250 OK\r\n');
 else if(/^RCPT TO:/i.test(line)){const m=line.match(/<([^>]+)>/);if(!m?.[1].endsWith('@example.invalid'))socket.write('550 External mail prohibited\r\n');else{recipient=m[1];socket.write('250 OK\r\n');}}
 else if(line==='DATA'){inData=true;socket.write('354 End with dot\r\n');}
 else if(line==='QUIT'){socket.end('221 Bye\r\n');}
 else socket.write('250 OK\r\n');
 }});
}).listen(1025,'127.0.0.1');
