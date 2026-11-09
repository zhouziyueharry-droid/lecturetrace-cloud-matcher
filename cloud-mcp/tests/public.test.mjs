import test from 'node:test';
import assert from 'node:assert/strict';
import {publicHandler,serve} from '../server.mjs';
import {cloudBucket} from '../bucket.mjs';
test('anonymous HTTP MCP works and write/admin, bad origins and oversized requests stay blocked',async t=>{
 let reads=0;const handler=publicHandler({list:async()=>{reads++;return {objects:[],truncated:false};}},'course.onrender.com');
 const server=serve(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
 const url='http://127.0.0.1:'+server.address().port;
 const rpc=async(method,params)=>{const r=await fetch(url+'/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});assert.equal(r.status,200);return r.json();};
 assert.match((await rpc('initialize',{protocolVersion:'2025-11-25'})).result.instructions,/下一部分/);
 const tools=(await rpc('tools/list')).result.tools;assert.equal(tools.length,10);assert(!tools.some(t=>t.name==='locate_slide'));
 assert.deepEqual((await rpc('tools/call',{name:'list_videos',arguments:{}})).result.structuredContent.videos,[]);
 assert.equal(reads,1);
 assert.equal((await fetch(url+'/admin/courses/test',{method:'PUT'})).status,404);
 assert.equal((await fetch(url+'/data-read/catalog')).status,404);
 assert.equal((await fetch(url+'/mcp',{method:'POST',headers:{origin:'https://evil.test'}})).status,403);
 assert.equal((await fetch(url+'/mcp',{method:'POST',headers:{'content-type':'application/json'},body:'x'.repeat(65537)})).status,413);
 assert.equal((await fetch(url+'/mcp')).status,405);
 assert.equal((await rpc('tools/call',{name:'locate_slide',arguments:{}})).result.isError,true);
 assert.equal(reads,1);
});
test('accepts 32 reads but executes only four at once, rejects overflow and releases capacity', {timeout:3000}, async()=>{
 let release,allStarted,reads=0;
 const gate=new Promise(resolve=>{release=resolve;});
 const started=new Promise(resolve=>{allStarted=resolve;});
 const handler=publicHandler({list:async()=>{if(++reads===4)allStarted();await gate;return {objects:[],truncated:false};}},'course.onrender.com');
 const request=()=>handler(new Request('https://course.onrender.com/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'list_videos',arguments:{}}})}));
 const admitted=Array.from({length:32},request);
 try{
  await started;
  const overflow=await request();assert.equal(overflow.status,429);assert.equal(overflow.headers.get('retry-after'),'2');assert.equal(reads,4);
 }finally{release();}
 for(const response of await Promise.all(admitted)){assert.equal(response.status,200);assert.equal((await response.json()).result.isError,undefined);}
 assert.equal((await request()).status,200);assert.equal(reads,33);
});

test('cancelled waiting requests free queue space without executing', {timeout:3000}, async()=>{
 let release,allStarted,reads=0;
 const gate=new Promise(resolve=>{release=resolve;});const started=new Promise(resolve=>{allStarted=resolve;});
 const handler=publicHandler({list:async()=>{if(++reads===4)allStarted();await gate;return {objects:[],truncated:false};}},'course.onrender.com');
 const request=signal=>handler(new Request('https://course.onrender.com/mcp',{method:'POST',signal,headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'list_videos',arguments:{}}})}));
 const running=Array.from({length:4},()=>request());await started;
 const controller=new AbortController();const cancelled=request(controller.signal);
 const queued=Array.from({length:27},()=>request());
 try{
  assert.equal((await request()).status,429);
  controller.abort();assert.equal((await cancelled).status,429);
  queued.push(request());assert.equal(reads,4);
 }finally{release();}
 for(const response of await Promise.all([...running,...queued]))assert.equal(response.status,200);
 assert.equal(reads,32);
});

test('cloud adapter is read-only, restricts keys and caches immutable objects',async()=>{
 let calls=0;const key='images/'+'a'.repeat(64);
 const bucket=cloudBucket('https://data.example','reader',async(url,options)=>{calls++;assert.equal(url.origin,'https://data.example');assert.equal(options.redirect,'error');assert.equal(options.headers['x-data-read-token'],'reader');assert.equal(options.method,undefined);return new Response(new Uint8Array([255,216,255]));});
 assert.equal((await (await bucket.get(key)).arrayBuffer()).byteLength,3);
 await bucket.get(key);assert.equal(calls,1);
 await assert.rejects(bucket.get('../../admin/key'));await assert.rejects(bucket.list({prefix:'secrets/'}));
 assert.equal(bucket.put,undefined);assert.equal(calls,1);
});
