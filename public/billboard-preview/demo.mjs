const root=document.getElementById('billboard-root');
const player=location.pathname.endsWith('/player');
try {
 if(player){const {mountPlayer}=await import('./player.mjs');mountPlayer(root);}
 else {const {mountStudio}=await import('./studio.mjs');mountStudio(root);}
} catch {
 root.textContent='';const main=document.createElement('main');main.className='neutral';const title=document.createElement('h1');title.textContent='Welcome.';const message=document.createElement('p');message.textContent='The display is taking a quiet moment.';main.append(title,message);root.append(main);
}
