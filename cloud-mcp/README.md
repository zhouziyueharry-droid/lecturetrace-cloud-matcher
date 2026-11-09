# LectureTrace public course MCP

Nine read-only tools, public HTTPS `/mcp`, authentication **None**. Image reverse lookup remains disabled. No Python/OpenCV, video processing, model calls or local-computer connection.

Run Node 22+: `node cloud-mcp/server.mjs`. Set `DATA_ORIGIN` to the existing cloud Site and `DATA_READ_TOKEN` to its separate read-only credential using Render secrets. `PORT` and `RENDER_EXTERNAL_HOSTNAME` come from Render. Never provision the import token, Sites bypass token, local credentials or model keys to this service.

The HTTP adapter permits only `/mcp`, `/health` and a homepage redirect. The copied Worker contract preserves all nine tool behaviors. Its administrative routes cannot be reached through this adapter. Requests are size/concurrency bounded; object keys are allowlisted; upstream redirects are rejected; in-memory data cache is capped at 64 MiB.

Course data stays in cloud R2, outside Git and the ephemeral Render filesystem. Existing authenticated imports publish a course manifest only after all images and snapshots are present. New manifests become visible within 60 seconds; content-addressed images/snapshots are immutable. No live access to the owner's computer is required.

Source: `lecturetrace-mcp/worker/` at the Sites checkout, with the same copied contract tests. When changing shared tools, update this copy and run `node --test cloud-mcp/tests/*.test.mjs`. The separate Python image-matcher service stays suspended on `main`.

Free Render instances sleep when idle; wake `/health` before adding the MCP if the client times out. Do not promise continuous availability or that a successful direct protocol check proves a friend's ChatGPT connection.
