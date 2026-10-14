import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest{
 return {id:'/',name:'LV Zion',short_name:'LV Zion',description:'Your LV Zion member space.',start_url:'/members',scope:'/',display:'standalone',background_color:'#f8f8f3',theme_color:'#3f6650',lang:'en',icons:[{src:'/icons/lvz-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icons/lvz-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/icons/lvz-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]};
}
