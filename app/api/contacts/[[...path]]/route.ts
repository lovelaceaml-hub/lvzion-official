import {contactsRequest} from '../../../../lib/server/contacts';
export const dynamic='force-dynamic';
// The server-only release gate remains closed. No body/session/database is read until approval.
export const GET=contactsRequest,POST=contactsRequest,PUT=contactsRequest,PATCH=contactsRequest,DELETE=contactsRequest,OPTIONS=contactsRequest,HEAD=contactsRequest;
