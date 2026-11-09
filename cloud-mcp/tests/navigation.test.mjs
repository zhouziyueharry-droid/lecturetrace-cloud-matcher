import test from 'node:test';
import assert from 'node:assert/strict';
import {readNavigation} from '../worker/navigation.js';
const version='sha256:'+'e'.repeat(64), check=(ok,msg)=>{if(!ok)throw Error(msg);};
const video={id:'123456abcdef',title:'Lecture',duration_s:20,status:'done',course_id:'1'.repeat(32)};
const page={id:'S001',jump:0,title:'Example',image:'keyframes/a.jpg'};
const section={id:'S001.1',page:'S001',jump:0,display_end:10,speech_start:0,speech_end:11,t_ids:['T0001','T0003']};
const nav={version,evidence:{pages:[page],sections:[section],speech:[{id:'T0001',jump:0,section:section.id},{id:'T0002',jump:1,section:section.id},{id:'T0003',jump:2,section:section.id}]},outline:{chapters:[{title:'Chapter',start:0}]},previews:{'S001.1':{unit_id:'S001.1',display_start:0,display_end:10,speech_start:0,speech_end:11,summary_status:'missing'}},rendered:{S001:'page','S001.1':'summary',T0001:'first',T0002:'excluded',T0003:'third'},image_hashes:{'keyframes/a.jpg':'a'.repeat(64)},image_labels:{S001:'[S001] 00:00 幻灯片截图','S001.1':'[S001.1] 00:00 幻灯片截图'},search:{documents:{T0001:{text:'alpha',terms:{alpha:1}},T0002:{text:'beta',terms:{beta:1}},T0003:{text:'alpha twice',terms:{alpha:2}}},df:{alpha:2,beta:1},avg_length:4/3,chapter_for:{S001:1,'S001.1':1,T0001:1,T0002:1,T0003:1},k:8,snippet_chars:200}};
function call(name,args={}){return readNavigation(name,{video_id:video.id,version,...args},video,{navigation:nav},check);}
test('navigation preserves noncontiguous speech membership and range expansion',()=>{
 assert.equal(call('read_video_unit',{unit_id:'S001.1'}).data.text,'first\n\nthird');
 assert.equal(call('read_evidence',{ids:['T0001-T0003','T0001']}).data.text,'first\n\nexcluded\n\nthird');
 assert.throws(()=>call('read_video_unit',{unit_id:'S001'}));
 assert.throws(()=>call('read_evidence',{ids:['T0003-T0001']}));
});
test('units preserve display/speech overlap and half-open boundaries',()=>{
 assert.deepEqual(call('get_video_units',{timestamp:9}).data.units[0].matched_by,['display','speech']);
 assert.deepEqual(call('get_video_units',{timestamp:10}).data.units[0].matched_by,['speech']);
 assert.equal(call('get_video_units',{timestamp:11}).data.units.length,0);
});
test('view_slide uses section image fallback and evidence versions',()=>{
 assert.equal(call('view_slide',{id:'S001.1'}).imageHash,'a'.repeat(64));
 assert.throws(()=>call('view_slide',{id:'T0001'}));
 assert.throws(()=>call('get_video_units',{timestamp:0,version:'sha256:'+'f'.repeat(64)}));
 assert.throws(()=>readNavigation('get_video_context',{},video,{},check),/evidence/);
});
test('search ranks terms and pages results',()=>{
 assert.equal(call('search_video',{queries:['alpha']}).data.results[0].id,'T0003');
 assert.equal(call('search_video',{queries:['alpha'],offset:1}).data.results[0].id,'T0001');
 assert.equal(call('search_video',{queries:['absent']}).data.total,0);
});
