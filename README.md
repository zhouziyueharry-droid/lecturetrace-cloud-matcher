# LectureTrace · AI6102 course MCP

当前供 AI6102 同学使用的公网 MCP 和使用说明位于 **[cloud-mcp/README.md](cloud-mcp/README.md)**。这是从 [LectureTrace](https://github.com/zhouziyueharry-droid/LectureTrace-OSS) 拆出的临时复习服务：先上传老师 PPT，明确 Week 对应章节，再用课堂转写补充讲解。接入时身份验证选 **None／无**，不要选 OAuth。

以下是已暂停的图片反查服务历史说明，不代表当前启用功能。

# LectureTrace image matcher

Small Render service for the Sites course MCP. Native SIFT/RANSAC is vendored from MIT-licensed LectureTrace with unchanged matching thresholds. It uses no model API or GPU.

Deploy this directory as a Docker web service in Singapore with **plan=free**. The container listens on `PORT` (10000 by default). Required runtime secrets: `MATCHER_TOKEN`; required setting: `SITE_ORIGIN` (the exact HTTPS chatgpt.site origin). Optional `SITES_SERVICE_TOKEN` enables access if the Site is private. Configure the same secret and returned HTTPS origin as `MATCHER_TOKEN` / `MATCHER_URL` in Sites and redeploy the Worker.

`GET /health` reports readiness. `POST /locate` requires `X-Matcher-Token`, raw base64 image, immutable snapshot hash, video ID, evidence version and offset. Only fixed-origin, hash-verified R2 assets are fetched; redirects are rejected. Course data and credentials are never included in this source repository or image. Files are cached only on ephemeral disk; matching runs one request at a time to bound memory. Busy calls return 503. A free instance sleeps after inactivity: the first request may need retry. Cold course caches require downloading and processing target images; deployment acceptance must measure real latency and peak RAM.

Tests: `python -m unittest discover -s . -p test_server.py`. The pinned package versions match the local LectureTrace environment. Build on Render verifies Linux wheels separately.
