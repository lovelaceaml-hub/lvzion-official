import {CalendarDays,ClipboardList,DoorOpen,Grid2X2,Heart,Monitor,Music,Sun,UsersRound} from './home-icons';
import {moduleStyleFor,type ModuleIconName} from '../lib/module-styles';
const icons={room:DoorOpen,people:UsersRound,sun:Sun,display:Monitor,calendar:CalendarDays,heart:Heart,music:Music,clipboard:ClipboardList,apps:Grid2X2};
/** The symbol for an app tile, from its route; unknown apps use the Apps grid. */
export default function ModuleIcon({route,size=22}:{route?:string;size?:number}){
 const Icon=icons[(route&&moduleStyleFor(route)?.icon)||'apps' as ModuleIconName];
 return <Icon size={size}/>;
}
