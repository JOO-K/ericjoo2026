import{isAdminRequest}from'../../_lib/auth.js';
const KEY='gallery_items';
export async function onRequestDelete({params,request,env}){
  if(!await isAdminRequest(request,env))
    return Response.json({ok:false},{status:401});
  try{
    const id=parseInt(params.id);
    const data=await env.GALLERY.get(KEY);
    const items=(data?JSON.parse(data):[]).filter(i=>i.id!==id);
    await env.GALLERY.put(KEY,JSON.stringify(items));
    return Response.json({ok:true});
  }catch(e){return Response.json({ok:false,error:e.message},{status:500});}
}
