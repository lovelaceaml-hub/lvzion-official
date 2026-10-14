import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
// Hard release lock. Never read request bodies, make backend calls or log contact input.
function unavailable(){return NextResponse.json({error:'Contacts is not activated.'},{status:403,headers:{'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});}
export const GET=unavailable,POST=unavailable,PUT=unavailable,PATCH=unavailable,DELETE=unavailable,OPTIONS=unavailable,HEAD=unavailable;
