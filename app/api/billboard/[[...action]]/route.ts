export const dynamic='force-dynamic';
/** Deliberately closed until reviewed DB commands and hosted Auth/device tests are authorized. */
function unavailable(){return Response.json({available:false,code:'DISPLAY_NOT_ACTIVATED'},{status:403,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});}
export const GET=unavailable;export const POST=unavailable;export const PUT=unavailable;export const PATCH=unavailable;export const DELETE=unavailable;
