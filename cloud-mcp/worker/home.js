export const studyPrompt = '请结合我上传的课程 PDF 和对应课程的完整课堂转写，按知识点分成几个部分，每次讲一部分。标出 PDF 页码和课堂时间，补充老师课堂上的解释，需要核对图表时取对应时间的截图。区分课件内容、老师补充和你的解释；没有读到或无法对应的内容请说明。等我说“下一部分”再继续。';

export const homeHtml = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="description" content="LectureTrace 工具与课程资料的关系图。推荐在 ChatGPT 上传课程 PDF，结合课堂转写和截图分部分学习。"><title>LectureTrace · 课程 MCP</title><style>
*{box-sizing:border-box}body{margin:0;background:#fff;color:#222;font:15px/1.7 system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif}main{max-width:1050px;margin:44px auto 32px;padding:0 28px}header{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 16px;margin-bottom:10px}h1{font-size:24px;font-weight:600;margin:0;letter-spacing:-.6px}header span{font-size:13px;color:#666}.star-link{margin-left:auto;color:#666;font-size:12px;text-decoration:none}.star-link:hover{color:#222;text-decoration:underline}.provenance{font-size:12px;color:#777}.setup{font-size:13px;margin:8px 0 24px;color:#555}.setup summary{cursor:pointer;color:#444;min-height:32px}.setup ol{padding-left:22px;margin:8px 0}.setup li{margin:8px 0}.setup a{color:inherit;text-underline-offset:3px}p{margin:8px 0}h2{font-size:17px;font-weight:600;margin:0 0 10px}.intro{color:#666;font-size:14px}.diagram{margin:26px 0 10px;overflow-x:auto;overscroll-behavior-x:contain}.diagram svg{width:100%;min-width:730px;display:block}a:focus-visible,summary:focus-visible,.diagram:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid #333;outline-offset:4px}.diagram text{fill:#222;font-family:system-ui,"Microsoft YaHei",sans-serif;font-size:15px}.diagram .tool{font-family:ui-monospace,Consolas,monospace;font-size:15px}.diagram .small{font-size:13px;fill:#666}.diagram .muted{fill:#777}.diagram .box{fill:#fff;stroke:#333;stroke-width:1.5}.diagram .derived{fill:none;stroke:#aaa;stroke-width:1.2;stroke-dasharray:4 4}.diagram .arrow{fill:none;stroke:#333;stroke-width:1.1;marker-end:url(#arrow)}.diagram .guide{stroke:#ddd;stroke-width:1}.diagram .segment{fill:#f4f4f4;stroke:#333;stroke-width:1.2}.note{font-size:12px;color:#777;margin-bottom:28px}.usage{border-top:1px solid #ddd;padding-top:22px}.steps{font-size:14px;margin-bottom:14px}.steps span{color:#999;padding:0 10px}.prompt{margin:0;border-left:2px solid #555;padding:2px 0 2px 16px;max-width:900px;font-size:14px;line-height:1.9}.copy-prompt{margin:12px 0 0 18px}button{background:white;color:#333;border:1px solid #bbb;border-radius:3px;font:12px/1.5 system-ui;padding:6px 12px;cursor:pointer;white-space:nowrap;min-height:32px}button:hover{background:#f4f4f4}.source-note{font-size:12px;color:#777;margin-top:14px}.connection{display:flex;align-items:center;gap:12px;margin-top:25px;padding-top:20px;border-top:1px solid #ddd}.connection label{font-size:12px;white-space:nowrap}input{min-width:0;flex:1;border:0;background:#f6f6f6;padding:9px 10px;font:12px/1.5 ui-monospace,Consolas,monospace;color:#444;border-radius:2px}.status{min-height:24px;color:#555;font-size:12px;margin-top:4px}footer{font-size:12px;color:#777;margin-top:8px}footer b{font-weight:500;color:#555}@media(max-width:600px){main{margin-top:25px;padding:0 18px}header span{order:3;width:100%}.star-link{max-width:145px;text-align:right;font-size:11px}.intro{font-size:13px}.diagram{margin-top:22px}.steps span{padding:0 5px}.connection{flex-wrap:wrap;gap:8px}.connection label{width:100%}.prompt{font-size:13px}.note{margin-bottom:22px}}
</style><script src="/home.js" defer></script></head><body><main>
<header><h1>LectureTrace</h1><span>课程 MCP · 工具能取到什么</span><a class="star-link" href="https://github.com/zhouziyueharry-droid/LectureTrace-OSS" target="_blank" rel="noopener noreferrer">觉得有帮助？给项目点个 Star ↗</a></header>
<p class="intro">给 agent 读取已处理的课堂资料：文字、时间位置和截图。</p>
<p class="provenance">资料均由 LectureTrace 处理。完整处理流程较重，这里只提供处理好的元数据、转写与截图。</p>
<div class="diagram" role="region" tabindex="0" aria-label="工具与课程资料关系图，窄屏可左右滚动">
<svg viewBox="0 0 1000 540" role="img" aria-labelledby="diagram-title diagram-desc">
<title id="diagram-title">九个工具分别读取哪些课程资料</title>
<desc id="diagram-desc">list_videos 返回课程列表和视频 ID。视频是资料的处理来源，不提供播放。read_video_transcript 返回带时间戳的整讲原文；read_video_unit 返回一个单元的原文；read_evidence 返回指定证据内容。get_video_context 返回目录和单元简介；get_video_units 返回指定时间的单元；search_video 返回匹配片段和证据 ID。view_keyframe 按时间读取截图；view_slide 按证据 ID 读取截图。</desc>
<defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1L7 4L1 7" fill="none" stroke="#333" stroke-width="1.2"/></marker></defs>
<text x="12" y="40">课程列表</text><rect class="box" x="125" y="17" width="465" height="38"/><text x="147" y="41">Lecture 1　 ·　 Lecture 2　 ·　 Lecture 3　 …</text>
<path class="arrow" d="M674 36H595"/><text class="tool" x="694" y="29">list_videos</text><text class="small" x="694" y="49">课程、视频名称与 video_id</text>

<text x="12" y="114" class="muted">课程视频</text><rect x="125" y="91" width="465" height="38" fill="#fafafa" stroke="#aaa" stroke-dasharray="5 4"/><text x="266" y="115" class="small">mp4 · 资料的处理来源</text><text class="small" x="694" y="114">MCP 不提供视频播放</text>
<path class="derived" d="M115 110H104V469H119"/><path class="derived" d="M104 208H119M104 345H119"/>

<text x="12" y="204">转写文本</text><text class="small" x="12" y="226">带时间戳</text><rect class="box" x="125" y="182" width="465" height="55"/>
<path class="guide" d="M202 182V237M279 182V237M356 182V237M433 182V237M510 182V237"/><rect x="280" y="183" width="75" height="53" fill="#ededed"/>
<text x="144" y="205" class="small">00:00</text><text x="220" y="205" class="small">00:28</text><text x="297" y="205" class="small">01:06</text><text x="374" y="205" class="small">01:42</text><text x="451" y="205" class="small">02:15</text><text x="537" y="205" class="small">…</text>
<path d="M144 218H183M220 218H259M297 218H336M374 218H413M451 218H490M529 218H568" stroke="#aaa"/>
<path class="arrow" d="M674 172H630V192H595"/><text class="tool" x="694" y="166">read_video_transcript</text><text class="small" x="694" y="185">整讲原文 ＋ 时间戳</text>
<path class="arrow" d="M674 219H595"/><text class="tool" x="694" y="212">read_video_unit</text><text class="small" x="694" y="231">一个讲解单元的原文</text>
<path class="arrow" d="M674 264H645V230H595"/><path class="arrow" d="M645 264V298H550V317"/><text class="tool" x="694" y="258">read_evidence</text><text class="small" x="694" y="277">指定证据：转写 / 页文字 / 单元摘要</text>

<text x="12" y="342">目录 / 索引</text><text class="small" x="12" y="364">导航与简介</text><rect class="box" x="125" y="321" width="465" height="50"/>
<path class="guide" d="M280 321V371M435 321V371"/><text x="152" y="351">章节 · 单元 1</text><text x="307" y="351">章节 · 单元 2</text><text x="463" y="351">章节 · 单元 3</text>
<path class="arrow" d="M674 310H630V333H595"/><text class="tool" x="694" y="304">get_video_context</text><text class="small" x="694" y="323">章节目录 ＋ 单元简介 ＋ 时间线</text>
<path class="arrow" d="M674 353H595"/><text class="tool" x="694" y="347">get_video_units</text><text class="small" x="694" y="366">某个时间对应的单元与简介</text>
<path class="arrow" d="M674 396H645V364H595"/><text class="tool" x="694" y="390">search_video</text><text class="small" x="694" y="409">关键词匹配片段 ＋ 证据 ID ＋ 时间</text>

<text x="12" y="473">关键帧</text><text class="small" x="12" y="495">已保存的截图</text>
<g class="box"><rect x="125" y="451" width="47" height="34"/><rect x="185" y="451" width="47" height="34"/><rect x="245" y="451" width="47" height="34"/><rect x="305" y="451" width="47" height="34"/><rect x="365" y="451" width="47" height="34"/><rect x="425" y="451" width="47" height="34"/><rect x="485" y="451" width="47" height="34"/><rect x="545" y="451" width="45" height="34"/></g>
<rect x="306" y="452" width="45" height="32" fill="#ededed"/><path class="derived" d="M329 371V445"/>
<path class="arrow" d="M674 455H595"/><text class="tool" x="694" y="449">view_keyframe</text><text class="small" x="694" y="468">给一个时间 → 对应的截图</text>
<path class="arrow" d="M674 504H630V476H595"/><text class="tool" x="694" y="498">view_slide</text><text class="small" x="694" y="517">给一个页面 / 单元 ID → 对应的截图</text>
</svg></div>
<p class="note">示意图，时间与分段不代表实际课程。目录和摘要用于定位；原文与截图用于核对。窄屏可左右滑动。</p>
<section class="usage" aria-labelledby="usage-title"><h2 id="usage-title">建议这样用</h2><p class="steps">接入 ChatGPT <span>→</span> 上传课程 PDF <span>→</span> 结合课堂原文，分部分学习</p><blockquote class="prompt" id="study-prompt">${studyPrompt}</blockquote><button class="copy-prompt" data-copy="study-prompt" type="button">复制这段提问</button><p class="source-note">PDF 由 ChatGPT 的文件工具读取；本 MCP 提供对应课堂的转写与截图，不接收 PDF。</p></section>
<div class="connection"><label for="endpoint">Sites MCP 地址（需授权）</label><input id="endpoint" readonly spellcheck="false" value="https://lecturetrace-ai6102-mcp-20261108.zhouziyueharry.chatgpt.site/mcp"><button data-copy="endpoint" type="button">复制地址</button></div><p class="status" id="status" role="status" aria-live="polite"></p>
<details class="setup" open><summary>ChatGPT 接入状态：暂不支持其他个人账号直接添加</summary>
<p>此网站可以公开浏览，但 Sites 自动生成的插件有独立的访问权限。OpenAI 当前不支持个人／Pro 账号把 Site 插件直接分享给其他 ChatGPT 用户。上面的 /mcp 地址仍需要 Sites 认证，并不是可匿名添加的公共 MCP。</p>
<p>如果添加时出现“请输入 OAuth 客户端 ID”，请先停止这条配置流程；此前本站“选 OAuth 后直接授权”的教程不适用于同学的独立账号。不要随意填写 Client ID，也不要使用作者的密钥。</p>
<p>作者可在 <b>Plugins → Personal → Created by you</b> 安装并连接已有插件。Business／Enterprise 的同一工作区成员需由作者分享插件，并分别完成连接；仅分享网站地址不够。</p>
<p>面向同学独立账号的接入方式尚未完成。接入成功后，再上传课程 PDF，按上面的示例结合课堂原文分部分学习。</p>
<p class="source-note"><a href="https://help.openai.com/en/articles/20001547-hosting-a-plugin-with-chatgpt-sites" target="_blank" rel="noopener noreferrer">OpenAI 官方说明：Sites 插件的使用与分享限制 ↗</a> · 核对于 2026-11-09</p></details>
<footer><b>图片反查已停用。</b> 按时间取图仍可用。原始转写可能有识别错误，未完成处理的资料会提示缺失。</footer>
</main></body></html>`;

export const homeScript = `document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{const target=document.getElementById(button.dataset.copy),text=target.value??target.textContent,status=document.getElementById('status');try{await navigator.clipboard.writeText(text);status.textContent=button.dataset.copy==='endpoint'?'MCP 地址已复制。':'提问示例已复制。';}catch{status.textContent='未能自动复制，请手动选择文字复制。';if(target.select){target.focus();target.select();}}}));`;
