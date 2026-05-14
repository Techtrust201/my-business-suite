import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildCorsHeaders,
  handlePreflight,
  isAuthorizedCron,
  jsonResponse,
} from "../_shared/security.ts";

const PAGE_SIZE = 1000;

// Pagine list() au-dela de PAGE_SIZE — sinon les fichiers du 1001eme
// sont silencieusement ignores. Cf. N4.
async function listAll(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
): Promise<Array<{ name: string; id: string | null; created_at: string | null }>> {
  const all: Array<{ name: string; id: string | null; created_at: string | null }> = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: PAGE_SIZE, offset });
    if (error) throw new Error(`list(${prefix}): ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

serve(async (req: Request): Promise<Response> => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (!isAuthorizedCron(req)) {
    return new Response("Unauthorized", {
      status: 401,
      headers: buildCorsHeaders(req),
    });
  }

  try {
    console.log("Starting cleanup-old-documents function");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    console.log(`Cutoff date: ${cutoffDate.toISOString()}`);

    const folders = await listAll(supabase, "documents", "");

    let deletedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const folder of folders) {
      if (!folder.name || folder.id === null) continue;

      const subfolders = await listAll(supabase, "documents", folder.name);

      for (const subfolder of subfolders) {
        if (!subfolder.name || subfolder.id === null) continue;

        const files = await listAll(
          supabase,
          "documents",
          `${folder.name}/${subfolder.name}`,
        );

        for (const file of files) {
          if (!file.created_at || file.id === null) continue;

          const fileDate = new Date(file.created_at);
          if (fileDate < cutoffDate) {
            const filePath = `${folder.name}/${subfolder.name}/${file.name}`;
            const { error: deleteError } = await supabase.storage
              .from("documents")
              .remove([filePath]);

            if (deleteError) {
              errorCount++;
              errors.push(
                `Failed to delete ${filePath}: ${deleteError.message}`,
              );
              console.error(`Failed to delete ${filePath}`);
            } else {
              deletedCount++;
            }
          }
        }
      }
    }

    console.log(
      `Cleanup complete: ${deletedCount} deleted, ${errorCount} errors`,
    );

    return jsonResponse(
      {
        success: true,
        deleted: deletedCount,
        errors: errorCount,
        cutoffDate: cutoffDate.toISOString(),
      },
      200,
      req,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("Cleanup error:", message);
    return jsonResponse({ error: "Internal error" }, 500, req);
  }
});
