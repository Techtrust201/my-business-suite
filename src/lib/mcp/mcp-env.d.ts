// Ambient types for MCP tool files. The MCP entry and its tools are bundled
// into a Deno edge function at build time; `process.env.*` is read at runtime
// inside handlers on that Deno target. This declaration keeps the Vite/TS
// build (which never executes these handlers) happy.
declare const process: { env: Record<string, string | undefined> };
