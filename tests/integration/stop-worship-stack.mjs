import{readFile}from'node:fs/promises';import{execFileSync}from'node:child_process';
const dir='/tmp/lvz-worship-integration';if(process.env.VERCEL)throw new Error('Local test cleanup only.');
for(const name of ['auth','postgrest','gateway','next']){try{const pid=Number(await readFile(dir+'/'+name+'.pid','utf8'));if(!Number.isSafeInteger(pid)||pid<2)continue;const cmd=process.platform==='darwin'?execFileSync('ps',['-p',String(pid),'-o','command='],{encoding:'utf8'}):await readFile('/proc/'+pid+'/cmdline','utf8');if(cmd.includes('next')||cmd.includes(dir)||cmd.includes('local-gateway.mjs'))process.kill(pid,'SIGTERM');}catch{}}
try{execFileSync('pg_ctl',['-D',dir+'/pg','stop','-m','fast'],{stdio:'ignore'});}catch{}
console.log('Stopped local test processes. The private /tmp test directory is retained for inspection; never commit its credentials or outbox.');
