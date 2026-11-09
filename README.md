# LectureTrace image matcher

Small Render service for the Sites course MCP. Native SIFT/RANSAC is vendored from MIT-licensed LectureTrace with unchanged matching thresholds. It uses no model API or GPU.

Deploy this directory as a Docker web service in Singapore with **plan=free**. The container listens on `PORT` (10000 by default). Required runtime secrets: `MATCHER_TOKEN`; required setting: `SITE_ORIGIN` (the exact HTTPS chatgpt.site origin). Optional `SITES_SERVICE_TOKEN` enables access if the Site is private. Configure the same secret and returned HTTPS origin as `MATCHER_TOKEN` / `MATCHER_URL` in Sites and redeploy the Worker.

`GET /health` reports readiness. `POST /locate` requires `X-Matcher-Token`, raw base64 image, immutable snapshot hash, video ID, evidence version and offset. Only fixed-origin, hash-verified R2 assets are fetched; redirects are rejected. Course data and credentials are never included in this source repository or image. Files are cached only on ephemeral disk; matching runs one request at a time to bound memory. Busy calls return 503. A free instance sleeps after inactivity: the first request may need retry. Cold course caches require downloading and processing target images; deployment acceptance must measure real latency and peak RAM.

Tests: `python -m unittest discover -s . -p test_server.py`. The pinned package versions match the local LectureTrace environment. Build on Render verifies Linux wheels separately.
