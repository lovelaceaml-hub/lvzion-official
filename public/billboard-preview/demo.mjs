const root=document.getElementById('billboard-root');
try{
 if(location.pathname.endsWith('/player')){const {mountPlayer}=await import('./player.mjs');mountPlayer(root);}
 else{
  const {mountStudio}=await import('./studio.mjs');const {mountStudioSummary}=await import('./studio-live.mjs');
  function attach(node){const runtime=mountStudio(node),disposeSummary=mountStudioSummary(node,runtime);node.addEventListener('click',event=>{const target=event.target instanceof Element?event.target.closest('[data-action="reset"]'):null;if(!target)return;event.preventDefault();event.stopImmediatePropagation();disposeSummary();runtime.dispose();const fresh=document.createElement('div');fresh.id='billboard-root';node.replaceWith(fresh);attach(fresh);},{capture:true});}
  attach(root);
 }
}catch{root.textContent='';const main=document.createElement('main');main.className='neutral';const title=document.createElement('h1');title.textContent='Welcome.';const message=document.createElement('p');message.textContent='The display is taking a quiet moment.';main.append(title,message);root.append(main);}
