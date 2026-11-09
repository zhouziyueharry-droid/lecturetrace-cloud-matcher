const KEY=/^(courses\/[0-9a-f]{32}\.json|snapshots\/[0-9a-f]{64}\.json|images\/[0-9a-f]{64})$/;
export function cloudBucket(origin,token,fetcher=fetch){
 const source=new URL(origin);if(source.protocol!=='https:'||source.username||source.password||!token)throw Error('Cloud data configuration required');
 const cache=new Map(),pending=new Map();let total=0;
 async function read(path,mutable){
  const cached=cache.get(path);
  if(cached&&cached.expires>Date.now()){cache.delete(path);cache.set(path,cached);return cached.data;}
  if(cached){total-=cached.data.length;cache.delete(path);}
  if(pending.has(path))return pending.get(path);
  const job=(async()=>{
   const response=await fetcher(new URL('/data-read/'+path,source),{headers:{'x-data-read-token':token},redirect:'error',signal:AbortSignal.timeout(15000)});
   if(response.status===404)return null;
   if(!response.ok)throw Error('Cloud data unavailable');
   const chunks=[];let size=0;
   for await(const chunk of response.body){size+=chunk.length;if(size>8*1024*1024)throw Error('Cloud object too large');chunks.push(chunk);}
   const data=Buffer.concat(chunks,size);
   while(total+size>64*1024*1024&&cache.size){const oldest=cache.keys().next().value;total-=cache.get(oldest).data.length;cache.delete(oldest);}
   cache.set(path,{data,expires:mutable?Date.now()+60000:Infinity});total+=size;
   return data;
  })();
  pending.set(path,job);try{return await job;}finally{pending.delete(path);}
 }
 return {
  async list({prefix,cursor}){if(prefix!=='courses/'||cursor&&cursor.length>2048)throw Error('Invalid catalog request');return JSON.parse(await read('catalog'+(cursor?'?cursor='+encodeURIComponent(cursor):''),true));},
  async get(key){if(!KEY.test(key))throw Error('Invalid data key');const data=await read('object/'+key,key.startsWith('courses/'));return data===null?null:{json:async()=>JSON.parse(data),arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)};}
 };
}
