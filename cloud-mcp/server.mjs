import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
import worker from './worker/index.js';
import {cloudBucket} from './bucket.mjs';
const HOME='https://lecturetrace-ai6102-mcp-20261108.zhouziyueharry.chatgpt.site';
const MAX_BODY=65536;
export function publicHandler(bucket,hostname){
 let active=0;
 const waiting=[];
 const busy=()=>new Response('Server busy; retry shortly',{status:429,headers:{'retry-after':'2'}});
 async function acquire(signal){
  if(signal.aborted)return false;
  if(active<4){active++;return true;}
  if(waiting.length>=28)return false;
  return new Promise(resolve=>{
   const finish=ok=>{clearTimeout(timer);signal.removeEventListener('abort',cancel);resolve(ok);};
   const cancel=()=>{const index=waiting.indexOf(finish);if(index>=0){waiting.splice(index,1);finish(false);}};
   const timer=setTimeout(cancel,20000);
   waiting.push(finish);signal.addEventListener('abort',cancel,{once:true});
  });
 }
 function release(){const next=waiting.shift();if(next)next(true);else active--;}
 const hosts=new Set([hostname,'localhost','127.0.0.1'].filter(Boolean));
 return async function(request){
  const url=new URL(request.url),host=(request.headers.get('host')||url.host).split(':')[0];
  if(!hosts.has(host))return new Response('Invalid host',{status:403});
  const origin=request.headers.get('origin');
  if(origin&&!['https://chatgpt.com','https://chat.openai.com',HOME,'https://'+hostname].includes(origin))return new Response('Invalid origin',{status:403});
  if(url.pathname==='/'&&request.method==='GET')return Response.redirect(HOME,302);
  if(url.pathname==='/health'&&request.method==='GET')return Response.json({ok:true,tools:9,mode:'public-read-only',image_reverse_lookup:false});
  if(url.pathname!=='/mcp')return new Response('Not found',{status:404});
  if(request.method!=='POST')return new Response(null,{status:405,headers:{allow:'POST'}});
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return new Response('Use application/json',{status:415});
  if(Number(request.headers.get('content-length')||0)>MAX_BODY)return new Response('Request too large',{status:413});
  // Bound simultaneous JSON parsing on the free instance; absorb short classroom bursts in a bounded queue.
  if(!await acquire(request.signal))return busy();
  try{
   let size=0;const chunks=[];
   if(request.body)for await(const chunk of request.body){size+=chunk.length;if(size>MAX_BODY)return new Response('Request too large',{status:413});chunks.push(chunk);}
   // Only MCP is forwarded: the imported worker's admin/data routes and secrets are unreachable.
   return await worker.fetch(new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:Buffer.concat(chunks,size)}),{BUCKET:bucket});
  }catch{return new Response('Request failed',{status:503});}finally{release();}
 };
}
export function serve(handler){
 const server=createServer({requestTimeout:20000,headersTimeout:10000,maxHeaderSize:8192},async(req,res)=>{
  try{
   const request=new Request('http://localhost'+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:req,duplex:'half'}:{})});
   const response=await handler(request);
   res.writeHead(response.status,Object.fromEntries(response.headers));
   res.end(Buffer.from(await response.arrayBuffer()));
  }catch{if(!res.headersSent)res.writeHead(503);res.end('Request failed');}
 });
 server.maxConnections=64;server.timeout=45000;return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const bucket=cloudBucket(process.env.DATA_ORIGIN,process.env.DATA_READ_TOKEN);
 const server=serve(publicHandler(bucket,process.env.RENDER_EXTERNAL_HOSTNAME));
 server.listen(Number(process.env.PORT||10000),'0.0.0.0',()=>console.log('Public read-only MCP ready; nine tools.'));
 process.on('SIGTERM',()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),10000).unref();});
}
