const KEY='gallery_items';
export async function onRequestGet({env}){
  try{
    const data=await env.GALLERY.get(KEY);
    return Response.json(data?JSON.parse(data):[]);
  }catch{return Response.json([]);}
}
export async function onRequestPost({request,env}){
  try{
    const{dataUrl}=await request.json();
    if(!dataUrl||!dataUrl.startsWith('data:image/'))
      return Response.json({ok:false},{status:400});
    const data=await env.GALLERY.get(KEY);
    const items=data?JSON.parse(data):[];
    items.unshift({id:Date.now(),ts:Date.now(),dataUrl});
    while(items.length>50)items.pop();
    await env.GALLERY.put(KEY,JSON.stringify(items));
    return Response.json({ok:true});
  }catch(e){return Response.json({ok:false,error:e.message},{status:500});}
}
