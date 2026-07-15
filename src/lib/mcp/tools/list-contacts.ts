declare const process: { env: Record<string, string | undefined> };
import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_contacts",
  title: "List clients / contacts",
  description:
    "List the clients (contacts) belonging to the signed-in user's organization. Optionally filter by a search term matching name or email.",
  inputSchema: {
    search: z
      .string()
      .trim()
      .optional()
      .describe("Optional substring to search in name or email."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("contacts")
      .select("id, name, email, phone, city, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (search && search.length > 0) {
      q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { contacts: data ?? [] },
    };
  },
});
