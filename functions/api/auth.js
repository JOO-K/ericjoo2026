import{sha256,isAdminRequest}from'../_lib/auth.js';
export async function onRequestGet({request,env}){
  const admin=await isAdminRequest(request,env);
  return Response.json({admin});
}
export async function onRequestPost({request,env}){
  const{password}=await request.json().catch(()=>({}));
  if(!password||password!==env.ADMIN_PASSWORD)
    return Response.json({ok:false},{status:401});
  const hash=await sha256(env.ADMIN_PASSWORD);
  const h=new Headers({'Content-Type':'application/json'});
  h.append('Set-Cookie',`ds_admin=${hash}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000`);
  return new Response(JSON.stringify({ok:true}),{headers:h});
}
export async function onRequestDelete(){
  const h=new Headers({'Content-Type':'application/json'});
  h.append('Set-Cookie','ds_admin=; Path=/; Max-Age=0');
  return new Response(JSON.stringify({ok:true}),{headers:h});
}
