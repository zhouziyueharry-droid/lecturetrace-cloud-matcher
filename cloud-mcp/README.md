# LectureTrace · AI6102 临时复习 MCP

这是从 [LectureTrace 开源项目](https://github.com/zhouziyueharry-droid/LectureTrace-OSS)拆出的只读 MCP。这里的课程资料全部由 LectureTrace 原项目处理；完整处理流程较重，因此本服务只提供处理好的转写、时间位置、关键帧截图和现有目录／索引。

这个 MCP 和介绍页临时面向同样在学习 **AI6102** 的同学，方便大家复习、整理笔记，以及生成开卷考试参考资料。它不是完整的 LectureTrace 应用，也不承诺覆盖其他课程或全部考试内容。

## 推荐怎么用

**先把老师的 PPT／PDF 给 ChatGPT，再让它使用 MCP，参考老师上课的思路给你讲解或生成资料。不建议只靠这个 MCP 复习。**

1. 以老师的 PPT 为学习主线，把课件上传到同一个聊天。
2. 自己先确认 **Week 对应哪些章节／页码**，明确告诉 AI；跨周的章节列出多个 Week。Week 编号不能当作章节编号，AI 不清楚时应先问，不能猜。
3. 再让 AI 调用 MCP 读取相应课堂转写，把它视为**老师课堂语音信息的补充**，补上 PPT 中没有展开的口头解释、推导和例子。需要核对图表时取对应时间的截图。
4. 按知识点逐部分讲，标注核对过的 PPT 页码和课堂时间，区分课件内容、老师讲解和 AI 自己的补充。说“下一部分”再继续，也可要求整理复习笔记、公式表或开卷参考资料。
5. 对生成资料自行核对；转写可能识别错误，缺失内容不代表老师没讲。考试允许携带的内容和形式以课程要求为准。

可复制的提问（先把方括号补齐）：

> 我正在复习 AI6102，已上传老师的 PPT／PDF。我确认这份课件的【章节名称、页码范围】对应【Week X；如跨周请列出多个 Week】。请以 PPT 为主，调用 LectureTrace MCP 读取对应课堂转写，参考老师的讲解思路，补充课件里没有展开的口头解释。先确认课程和讲次；如果我没有说清 Week 与章节的对应关系，请先问我，不要猜。按知识点分部分讲，每次一部分，标注核对过的 PPT 页码和课堂时间，区分课件、老师讲解和你的补充；需要时取截图核对。等我说“下一部分”再继续。最后可按我的要求整理复习笔记或开卷参考资料；缺失或不确定之处请注明。

## 接入：身份验证必须选「无／None」

- MCP 地址：`https://lecturetrace-course-mcp.onrender.com/mcp`
- 类型：Streamable HTTP（流式 HTTP）。
- **身份验证选 None／无身份验证，不要选 OAuth。** 如果界面默认是 OAuth，需要手动切换。
- 不需要 OAuth Client ID、Client Secret、Bearer token 或 API Key；相关字段留空。
- 在 ChatGPT 添加自定义 MCP 服务器，创建后确认九个只读工具，再在聊天中选择或 @ 提及该插件。仅在 Codex 添加只供相应客户端使用。
- 免费 Render 实例会休眠。超时时先打开 [状态页](https://lecturetrace-course-mcp.onrender.com/health)，等 `ok: true` 后重试。

## 工具与数据边界

九个工具分别用于列出课程（`list_videos`）、读整讲转写（`read_video_transcript`）、按时间取图（`view_keyframe`）、读目录（`get_video_context`）、按时间找单元（`get_video_units`）、读单元原文（`read_video_unit`）、搜关键词（`search_video`）、读指定证据（`read_evidence`）和按证据 ID 取图（`view_slide`）。目录／摘要和搜索片段用于定位，不能代替读取原始转写。

图片反查 `locate_slide` 已停用；本服务不接收新视频、不重新处理媒体、不播放录像，也不自行调用模型。课件阅读、讲解与资料生成由你使用的 ChatGPT／agent 完成。已提供的讲次以 `list_videos` 实际返回为准；未生成的目录／索引会明确报缺失。

## Deployment and maintenance

Run Node 22+: `node cloud-mcp/server.mjs`. Set `DATA_ORIGIN` to the existing cloud Site and `DATA_READ_TOKEN` to its separate read-only credential using Render secrets. `PORT` and `RENDER_EXTERNAL_HOSTNAME` come from Render. Never provision the import token, Sites bypass token, local credentials or model keys to this service.

The HTTP adapter permits only `/mcp`, `/health` and a homepage redirect. The copied Worker contract preserves all nine tool behaviors. Its administrative routes cannot be reached through this adapter. Requests are size/concurrency bounded; object keys are allowlisted; upstream redirects are rejected; in-memory data cache is capped at 64 MiB.

Course data stays in cloud R2, outside Git and the ephemeral Render filesystem. Existing authenticated imports publish a course manifest only after all images and snapshots are present. New manifests become visible within 60 seconds; content-addressed images/snapshots are immutable. No live access to the owner's computer is required.

Source: `lecturetrace-mcp/worker/` at the Sites checkout, with the same copied contract tests. When changing shared tools, update this copy and run `node --test cloud-mcp/tests/*.test.mjs`. The separate Python image-matcher service stays suspended on `main`.

Free Render instances sleep when idle; wake `/health` before adding the MCP if the client times out. Do not promise continuous availability or that a successful direct protocol check proves a friend's ChatGPT connection.
