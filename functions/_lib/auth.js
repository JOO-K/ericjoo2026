export async function sha256(str){
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str));
  return[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export async function isAdminRequest(request,env){
  const cookie=request.headers.get('cookie')||'';
  const match=cookie.match(/(?:^|;\s*)ds_admin=([^;]+)/);
  if(!match)return false;
  const expected=await sha256(env.ADMIN_PASSWORD||'');
  return match[1]===expected;
}
