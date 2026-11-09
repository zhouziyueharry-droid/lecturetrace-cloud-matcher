import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';

const hash = 'a'.repeat(64), imageHash = 'b'.repeat(64);
const version = 'sha256:' + 'c'.repeat(64), frameVersion = 'sha256:' + 'd'.repeat(64);
const video = {id:'123456abcdef',title:'Lecture',duration_s:20,status:'done',snapshot:hash};
const snapshot = {schema_version:1,video_id:video.id,transcript:{version,language:'en',segment_count:1,text:'A😀B'},keyframes:{version:frameVersion,frames:[{page_id:'S1',appearance_index:1,start:0,end:10,image_role:'appearance',image:imageHash},{page_id:'S2',appearance_index:1,start:5,end:15,image_role:'page_representative',image:imageHash}]}};
function env() {
 const objects = new Map([['courses/'+'1'.repeat(32)+'.json',JSON.stringify({schema_version:1,id:'1'.repeat(32),title:'AI6102',videos:[video]})],['snapshots/'+hash+'.json',JSON.stringify(snapshot)],['images/'+imageHash,new Uint8Array([255,216,255,217])]]);
 return {IMPORT_TOKEN:'secret',objects,BUCKET:{async get(k){if(!objects.has(k))return null;const v=objects.get(k);return {json:async()=>JSON.parse(v),arrayBuffer:async()=>new Uint8Array(v).buffer};},async head(k){return objects.has(k)?{}:null;},async put(k,v){objects.set(k,v);},async list(){return {objects:[...objects.keys()].filter(k=>k.startsWith('courses/')).map(key=>({key})),truncated:false};}}};
}
async function rpc(name,args={},e=env()) {const r=await worker.fetch(new Request('https://example.test/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})}),e);return (await r.json()).result;}
test('lists course and reads Unicode offsets as Python code points',async()=>{
 const listing=await rpc('list_videos');
 assert.equal(listing.structuredContent.videos[0].course_title,'AI6102');
 assert.equal(listing.structuredContent.next_offset,null);
 const guide=listing.structuredContent.service_guide;
 assert.equal(guide.project_url,'https://github.com/zhouziyueharry-droid/LectureTrace-OSS');
 assert.match(guide.recommended_use,/PPT.*Week/);
 assert.deepEqual(JSON.parse(listing.content[0].text).service_guide,guide);
 assert.equal((await rpc('read_video_transcript',{video_id:video.id})).structuredContent.total_chars,3);
 assert.equal((await rpc('read_video_transcript',{video_id:video.id,text_offset:2,version})).structuredContent.text,'B');
 assert.equal((await rpc('read_video_transcript',{video_id:video.id,text_offset:1})).isError,true);
 assert.equal((await rpc('read_video_transcript',{video_id:video.id,version:frameVersion})).isError,true);
});
test('complete outline preserves nested summaries and metadata without needing evidence',async()=>{
 const outline={chapters:[{node_id:'O1',title:'Chapter',summary:'完整总结😀'.repeat(300),start:2,evidence:['T0001'],children:[{node_id:'O2',title:'Child',summary:'子章节总结',start:3,evidence:['S001.1'],children:[]}]}],warnings:['Verify formula'],admin:{notice:'Course notice'},speech_categories:{teaching:true},revision:2};
 const e=env();e.objects.set('snapshots/'+hash+'.json',JSON.stringify({...snapshot,sources:{outline}}));
 const r=await rpc('read_video_outline',{video_id:video.id},e);
 assert.equal(r.isError,undefined);assert.deepEqual(r.structuredContent.outline,outline);
 assert.deepEqual(JSON.parse(r.content[0].text),r.structuredContent);
 assert.equal(r.structuredContent.complete,true);assert.equal(r.structuredContent.snapshot_version,'sha256:'+hash);
 assert.equal(r.structuredContent.source,'generated_outline');assert.equal(r.structuredContent.course_title,'AI6102');
 assert.equal((await rpc('read_video_outline',{video_id:video.id,offset:1},e)).isError,true);
});
test('missing or malformed outline is an explicit error rather than an empty fabricated outline',async()=>{
 const missing=await rpc('read_video_outline',{video_id:video.id});assert.equal(missing.isError,true);assert.match(missing.content[0].text,/outline.json is unavailable/);
 const e=env();e.objects.set('snapshots/'+hash+'.json',JSON.stringify({...snapshot,sources:{outline:{chapters:'invalid'}}}));
 assert.equal((await rpc('read_video_outline',{video_id:video.id},e)).isError,true);
 e.objects.set('snapshots/'+hash+'.json',JSON.stringify({...snapshot,sources:{outline:{chapters:[]}}}));
 assert.deepEqual((await rpc('read_video_outline',{video_id:video.id},e)).structuredContent.outline,{chapters:[]});
});
test('keyframes preserve overlap, half-open boundaries, gaps and independent versions',async()=>{
 const r=await rpc('view_keyframe',{video_id:video.id,timestamp:5});
 assert.equal(r.structuredContent.total_matches,2);assert.equal(r.structuredContent.next_offset,1);assert.equal(r.content[1].type,'image');
 assert.equal((await rpc('view_keyframe',{video_id:video.id,timestamp:5,offset:1,version:frameVersion})).structuredContent.matches[0].page_id,'S2');
 assert.equal((await rpc('view_keyframe',{video_id:video.id,timestamp:10})).structuredContent.total_matches,1);
 assert.equal((await rpc('view_keyframe',{video_id:video.id,timestamp:15})).structuredContent.total_matches,0);
 assert.equal((await rpc('view_keyframe',{video_id:video.id,timestamp:5,version})).isError,true);
});
test('rejects invalid inputs and fails missing images explicitly',async()=>{
 for(const a of [{video_id:'../secret'},{video_id:video.id,text_offset:true},{video_id:video.id,text_offset:100}])assert.equal((await rpc('read_video_transcript',a)).isError,true);
 const e=env();e.objects.delete('images/'+imageHash);
 assert.equal((await rpc('view_keyframe',{video_id:video.id,timestamp:0},e)).isError,true);
});
test('import auth and incomplete publication cannot change the live course',async()=>{
 const e=env(),path='https://example.test/admin/courses/'+'1'.repeat(32);
 const body=JSON.stringify({schema_version:1,id:'1'.repeat(32),title:'Replacement',videos:[{...video,snapshot:'e'.repeat(64)}]});
 assert.equal((await worker.fetch(new Request(path,{method:'PUT',body}),e)).status,401);
 assert.equal((await worker.fetch(new Request(path,{method:'PUT',headers:{'x-import-token':'secret'},body}),e)).status,400);
 assert.equal((await rpc('list_videos',{},e)).structuredContent.videos[0].course_title,'AI6102');
});
test('disabled matcher is not advertised and cannot run even with stale configuration',async()=>{
 const e={...env(),MATCHER_TOKEN:'old-token',MATCHER_URL:'https://example.onrender.com'};
 let fetched=false;const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>{fetched=true;throw Error('No external call expected');};
  const r=await rpc('locate_slide',{video_id:video.id,image_base64:'AAAA'},e);
  assert.equal(r.isError,true);assert.match(r.content[0].text,/暂时停用/);assert.equal(fetched,false);
  const list=await worker.fetch(new Request('https://example.test/mcp',{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/list'})}),e);
  const names=(await list.json()).result.tools.map(t=>t.name);assert.equal(names.length,10);assert.ok(names.includes('read_video_outline'));assert.ok(!names.includes('locate_slide'));
  assert.equal((await worker.fetch(new Request('https://example.test/matcher/images/'+imageHash,{headers:{'x-matcher-token':'old-token'}}),e)).status,410);
  assert.equal((await worker.fetch(new Request('https://example.test/health'),e)).status,200);
 }finally{globalThis.fetch=original;}
});
