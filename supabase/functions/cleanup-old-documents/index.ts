import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting cleanup-old-documents function");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculer la date limite (90 jours)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    console.log(`Cutoff date: ${cutoffDate.toISOString()}`);

    // Lister tous les dossiers du bucket
    const { data: folders, error: listError } = await supabase.storage
      .from("documents")
      .list("", { limit: 1000 });

    if (listError) {
      throw new Error(`Error listing folders: ${listError.message}`);
    }

    let deletedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Parcourir chaque dossier d'organisation
    for (const folder of folders || []) {
      if (!folder.name || folder.id === null) continue;

      const { data: subfolders } = await supabase.storage
        .from("documents")
        .list(folder.name, { limit: 1000 });

      for (const subfolder of subfolders || []) {
        if (!subfolder.name || subfolder.id === null) continue;

        const { data: files } = await supabase.storage
          .from("documents")
          .list(`${folder.name}/${subfolder.name}`, { limit: 1000 });

        for (const file of files || []) {
          if (!file.created_at || file.id === null) continue;

          const fileDate = new Date(file.created_at);
          if (fileDate < cutoffDate) {
            const filePath = `${folder.name}/${subfolder.name}/${file.name}`;
            const { error: deleteError } = await supabase.storage
              .from("documents")
              .remove([filePath]);

            if (deleteError) {
              errorCount++;
              errors.push(`Failed to delete ${filePath}: ${deleteError.message}`);
              console.error(`Failed to delete ${filePath}:`, deleteError.message);
            } else {
              deletedCount++;
              console.log(`Deleted: ${filePath}`);
            }
          }
        }
      }
    }

    console.log(`Cleanup complete: ${deletedCount} deleted, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        deleted: deletedCount,
        errors: errorCount,
        errorDetails: errors.slice(0, 10),
        cutoffDate: cutoffDate.toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
