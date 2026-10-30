import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
export function hashPassword(password){const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(password,salt,64).toString('hex')}`;}
export function verifyPassword(password,stored){if(typeof stored!=='string'||!password||!stored.includes(':'))return false;try{const [salt,hash]=stored.split(':');const actual=Buffer.from(hash,'hex');return actual.length===64&&timingSafeEqual(scryptSync(password,salt,64),actual);}catch{return false;}}
export function validOrigin(request){
  if(['GET','HEAD','OPTIONS'].includes(request.method))return true;
  const origin=request.headers.get('origin');if(!origin)return false;
  try {const u=new URL(origin);return u.host===(request.headers.get('host')||new URL(request.url).host)&&['https:','http:'].includes(u.protocol)&&request.headers.get('sec-fetch-site')!=='cross-site';}catch{return false;}
}
export function authorized(){return true;}
