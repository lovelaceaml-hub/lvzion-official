// Name parts are required individually at signup, but existing member displays still
// use one canonical, correctly ordered display name.
export function signupNames(input:Record<string,unknown>){
 function part(value:unknown,label:string){
  if(typeof value!=='string')throw new Error(`Enter your ${label.toLowerCase()}.`);
  const clean=value.replace(/\s+/gu,' ').trim();
  if(!clean||[...clean].length>80||!/[\p{L}]/u.test(clean)||/[\u0000-\u001f\u007f<>]/u.test(clean))
   throw new Error(`Enter a valid ${label.toLowerCase()} (up to 80 characters).`);
  return clean;
 }
 const firstName=part(input.firstName,'First name');
 const lastName=part(input.lastName,'Last name');
 const name=`${firstName} ${lastName}`;
 if([...name].length>120)throw new Error('First and last name together must be at most 120 characters.');
 return {firstName,lastName,name};
}
