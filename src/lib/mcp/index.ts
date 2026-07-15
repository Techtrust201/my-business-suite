import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listContactsTool from "./tools/list-contacts";
import listInvoicesTool from "./tools/list-invoices";
import listQuotesTool from "./tools/list-quotes";
import listProspectsTool from "./tools/list-prospects";
import whoamiTool from "./tools/whoami";

// The OAuth issuer MUST be the direct Supabase host, built from the project
// ref (Vite inlines it at build time). See app-mcp-server-authoring knowledge.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "my-business-suite-mcp",
  title: "My Business Suite",
  version: "0.1.0",
  instructions:
    "Tools for My Business Suite (Factura). Each tool acts as the signed-in user: list their clients (contacts), invoices, quotes (devis), and CRM prospects. Use `whoami` to verify the connected identity.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoamiTool,
    listContactsTool,
    listInvoicesTool,
    listQuotesTool,
    listProspectsTool,
  ],
});
