import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_TTL_SECONDS = 60 * 60;

// Permet de gerer la transition de "receipt_url contient l'URL publique"
// vers "receipt_url contient un path". On extrait le path interne au bucket
// si on detecte la forme /storage/v1/object/public/<bucket>/<path>, sinon
// on suppose que c'est deja un path.
export function extractStoragePath(bucket: string, urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = urlOrPath.indexOf(marker);
  if (idx >= 0) {
    return urlOrPath.slice(idx + marker.length);
  }
  const signedMarker = `/storage/v1/object/sign/${bucket}/`;
  const sIdx = urlOrPath.indexOf(signedMarker);
  if (sIdx >= 0) {
    const tail = urlOrPath.slice(sIdx + signedMarker.length);
    const qIdx = tail.indexOf("?");
    return qIdx >= 0 ? tail.slice(0, qIdx) : tail;
  }
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    // URL externe non geree.
    return null;
  }
  return urlOrPath.replace(/^\/+/, "");
}

export async function createSignedUrl(
  bucket: string,
  path: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, ttlSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

interface UseSignedUrlOptions {
  bucket: string;
  urlOrPath: string | null | undefined;
  ttlSeconds?: number;
  enabled?: boolean;
}

export function useSignedUrl({
  bucket,
  urlOrPath,
  ttlSeconds = DEFAULT_TTL_SECONDS,
  enabled = true,
}: UseSignedUrlOptions) {
  const path = extractStoragePath(bucket, urlOrPath);

  return useQuery({
    queryKey: ["signed-url", bucket, path, ttlSeconds],
    queryFn: async () => {
      if (!path) return null;
      return createSignedUrl(bucket, path, ttlSeconds);
    },
    enabled: enabled && !!path,
    // Refresh peu avant l'expiration.
    staleTime: Math.max(0, (ttlSeconds - 60) * 1000),
    gcTime: ttlSeconds * 1000,
    refetchOnWindowFocus: false,
  });
}
