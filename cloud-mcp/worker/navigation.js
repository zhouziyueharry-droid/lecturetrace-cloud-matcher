import {casefold} from './casefold.js';
const compare=(a,b)=>a<b?-1:a>b?1:0;
const chars=s=>Array.from(s);
const slice=(s,start,end)=>chars(s).slice(start,end).join('');
function terms(text){return (casefold(text).match(/[a-z0-9_]+|[\u4e00-\u9fff]+/g)||[]).flatMap(w=>/^[\u4e00-\u9fff]{2,}$/.test(w)?Array.from({length:w.length-1},(_,i)=>w.slice(i,i+2)):[w]);}

export function readNavigation(name,args,video,snapshot,check){
 const nav=snapshot.navigation;check(nav,'evidence.json is unavailable; finish local evidence processing and import this course again');
 check(!args.version||args.version===nav.version,'Evidence changed; call get_video_context again');
 const {evidence,outline}=nav;
 const records=new Map([...evidence.pages,...evidence.sections,...evidence.speech].map(r=>[r.id,r]));
 const pages=new Map(evidence.pages.map(r=>[r.id,r])),sections=new Map(evidence.sections.map(r=>[r.id,r]));
 const ordered=[...sections.values()].sort((a,b)=>a.jump-b.jump||compare(a.id,b.id));
 const start=args.offset||0,begin=args.text_offset||0;
 const output=data=>({data:{video_id:video.id,version:nav.version,...data}});
 function read(ids){
  const expanded=[];
  for(const id of ids){
   const range=/^(T\d{4,})-(T\d{4,})$/.exec(id);
   if(range){const [,a,b]=range;check(records.has(a)&&records.has(b)&&Number(a.slice(1))<=Number(b.slice(1)),'Invalid evidence range');for(const key of records.keys())if(key.startsWith('T')&&Number(a.slice(1))<=Number(key.slice(1))&&Number(key.slice(1))<=Number(b.slice(1)))expanded.push(key);}
   else{check(records.has(id),'Evidence ID does not exist');expanded.push(id);}
  }
  return [...new Set(expanded)].map(id=>nav.rendered[id]).join('\n\n');
 }
 if(name==='get_video_context'){
  const chapters=(outline.chapters||[]).map(c=>({title:slice(String(c.title||''),0,nav.search.snippet_chars),start:c.start||0}));
  const timeline=ordered.map(s=>({...nav.previews[s.id],id:s.id,speech_first:s.t_ids?.[0]??null,speech_last:s.t_ids?.at(-1)??null}));
  const {id,title,duration_s,status,course_id}=video;
  return output({video:{id,title,duration_s,status,course_id},chapters:chapters.slice(start,start+50),timeline:timeline.slice(start,start+50),next_offset:start+50<Math.max(chapters.length,timeline.length)?start+50:null,note:'Navigation only. Read speech and images for evidence.'});
 }
 if(name==='get_video_units'){
  const units=[];
  for(const s of ordered){const p=nav.previews[s.id],matched=[];for(const kind of ['display','speech']){let a=p[kind+'_start'],b=p[kind+'_end'];if(a==null&&kind==='speech'&&b!=null)a=s.jump;if(a!=null&&b!=null&&a<=args.timestamp&&args.timestamp<b)matched.push(kind);}if(matched.length)units.push({...p,matched_by:matched});}
  return output({timestamp:args.timestamp,units:units.slice(start,start+50),next_offset:start+50<units.length?start+50:null,note:'Half-open display/speech intervals; overlaps return all units. Summaries are navigation, not evidence.'});
 }
 if(name==='read_video_unit'||name==='read_evidence'){
  let ids=args.ids;
  if(name==='read_video_unit'){
   const s=sections.get(args.unit_id);check(s,'Unit ID must identify one continuous appearance');ids=s.t_ids||[];
   const speech=new Set(evidence.speech.map(r=>r.id));check(ids.every(id=>speech.has(id)),'Unit speech records are missing; cannot return incomplete speech');
  }
  const text=read(ids),total=chars(text).length,end=begin+24000;
  return output({...(name==='read_video_unit'?{unit_id:args.unit_id,source:'asr_transcript'}:{}),text:slice(text,begin,end),text_offset:begin,total_chars:total,next_text_offset:end<total?end:null,note:name==='read_video_unit'?'All assigned speech records, not a new semantic boundary. Follow continuation before claiming full coverage.':'T: ASR transcript; S page: generated visual text; S/N section: generated summary. Transcription may be wrong; verify formulas with images. A chunk is not the full record.'});
 }
 if(name==='view_slide'){
  const r=records.get(args.id);check(r&&(pages.has(args.id)||sections.has(args.id)),'Invalid screenshot ID');
  const rel=r.image||pages.get(r.page)?.image;check(rel&&nav.image_hashes[rel],'Evidence has no available screenshot');
  return {...output({id:args.id,start:r.jump,source:'slide_image',label:nav.image_labels[args.id]}),imageHash:nav.image_hashes[rel]};
 }
 if(name==='search_video'){
  const index=nav.search,queryTerms=[...new Set(args.queries.flatMap(terms))],docs=Object.entries(index.documents),scores=[];
  for(const [id,doc] of docs){let score=0;const length=Object.values(doc.terms).reduce((a,b)=>a+b,0);for(const term of queryTerms){const freq=doc.terms[term]||0;if(freq)score+=Math.log(1+(docs.length-index.df[term]+0.5)/(index.df[term]+0.5))*freq*2.2/(freq+1.2*(0.25+0.75*length/index.avg_length));}if(score)scores.push([score,id]);}
  scores.sort((a,b)=>b[0]-a[0]||records.get(a[1]).jump-records.get(b[1]).jump||compare(a[1],b[1]));
  const groups=new Map();
  for(const [,id] of scores){const r=records.get(id),s=sections.get(r.section)||(sections.has(id)?r:{}),page=s.page||(pages.has(id)?id:(s.id||id)),key=JSON.stringify([index.chapter_for[id],page]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(id);}
  const selected=[],limit=start+index.k;
  while(selected.length<limit&&[...groups.values()].some(g=>g.length))for(const g of groups.values())if(g.length&&selected.length<limit)selected.push(g.shift());
  const results=selected.slice(start).map(id=>{const text=index.documents[id].text,folded=casefold(text),positions=queryTerms.map(t=>folded.indexOf(t)).filter(p=>p>=0).map(p=>chars(folded.slice(0,p)).length),at=positions.length?Math.max(0,Math.min(...positions)-Math.floor(index.snippet_chars/4)):0;return {id,start:records.get(id).jump,chapter:index.chapter_for[id],excerpt:slice(text,at,at+index.snippet_chars)};});
  const next=start+results.length;
  return output({results,total:scores.length,next_offset:next<scores.length?next:null,note:'Excerpts only locate evidence; read_evidence before quoting. Follow next_offset for more matches.'});
 }
 check(false,'Unknown evidence tool');
}
