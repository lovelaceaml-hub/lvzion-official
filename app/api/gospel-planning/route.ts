/** Live backend is deliberately unavailable. Never fall back to fictional state. */
function unavailable(){return Response.json({error:'module_unavailable',message:'This application is not activated.'},{status:503,headers:{'Cache-Control':'private, no-store'}});}
export const GET=unavailable;
export const POST=unavailable;
export const PUT=unavailable;
export const PATCH=unavailable;
export const DELETE=unavailable;
