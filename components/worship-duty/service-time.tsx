import {serviceClock,serviceDay} from '../../lib/worship-duty/service-time';
/** Time first: the Las Vegas clock and day on the left of every scheduled row. */
export default function ServiceTime({startsAt}:{startsAt:string}){
 return <span className="wd-time"><strong>{serviceClock(startsAt)}</strong><small>{serviceDay(startsAt)}</small></span>;
}
