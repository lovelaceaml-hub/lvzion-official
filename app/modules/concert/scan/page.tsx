import ConcertScanner from '../../../../components/concert/scanner';
// Scanning is checked on every request by /api/concert/scan (concert managers only).
export const metadata={title:'Scan tickets · LV Zion',robots:{index:false,follow:false}};
export default function Page(){return <ConcertScanner/>;}
