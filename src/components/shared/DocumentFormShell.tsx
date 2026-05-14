import type { ReactNode } from "react";
import { Eye, FilePenLine, SlidersHorizontal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface DocumentFormShellProps {
  topbar: ReactNode;
  preview: ReactNode;
  edit: ReactNode;
  options?: ReactNode;
  footerActions: ReactNode;
  desktopFooterActions?: ReactNode;
  editLabel?: string;
  previewLabel?: string;
  optionsLabel?: string;
  className?: string;
}

export function DocumentFormShell({
  topbar,
  preview,
  edit,
  options,
  footerActions,
  desktopFooterActions,
  editLabel = "Édition",
  previewLabel = "Aperçu",
  optionsLabel = "Options",
  className,
}: DocumentFormShellProps) {
  return (
    <div className={cn("fixed inset-0 z-50 bg-background flex flex-col", className)}>
      <div className="shrink-0">{topbar}</div>

      <div className="hidden lg:flex flex-1 min-h-0">
        <div className="w-[60%] border-r bg-muted/20 overflow-y-auto p-6 xl:p-8">
          {preview}
        </div>
        <div className="w-[40%] flex flex-col bg-background min-w-[28rem]">
          <div className="flex-1 min-h-0 overflow-y-auto p-5 xl:p-6">
            {edit}
            {options && <div className="mt-6">{options}</div>}
          </div>
          {desktopFooterActions && (
            <div className="shrink-0 border-t bg-background p-4">
              <div className="flex justify-end gap-2">{desktopFooterActions}</div>
            </div>
          )}
        </div>
      </div>

      <div className="lg:hidden flex-1 min-h-0 flex flex-col">
        <Tabs defaultValue="edit" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="grid h-auto w-full shrink-0 grid-cols-3 rounded-none border-b bg-background p-0">
            <TabsTrigger
              value="edit"
              className="min-h-11 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none"
            >
              <FilePenLine className="mr-2 h-4 w-4" />
              {editLabel}
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="min-h-11 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none"
            >
              <Eye className="mr-2 h-4 w-4" />
              {previewLabel}
            </TabsTrigger>
            <TabsTrigger
              value="options"
              className="min-h-11 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none"
              disabled={!options}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              {optionsLabel}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="m-0 min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            {edit}
          </TabsContent>
          <TabsContent value="preview" className="m-0 min-h-0 flex-1 overflow-y-auto bg-muted/20 p-4 sm:p-5">
            {preview}
          </TabsContent>
          <TabsContent value="options" className="m-0 min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            {options}
          </TabsContent>
        </Tabs>

        <div className="shrink-0 border-t bg-background/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">{footerActions}</div>
        </div>
      </div>
    </div>
  );
}
