/**
 * Auto-print d'un PDF (Blob jsPDF) via iframe cache same-origin.
 *
 * Pourquoi pas `window.open(_blank, 'noopener,noreferrer')` ? Avec
 * `noopener`, on perd la reference au nouvel onglet et on ne peut plus
 * declencher `print()` cote opener. Sans `noopener`, on s'expose au
 * tabnabbing (le PDF viewer pourrait redefinir `window.opener.location`).
 *
 * L'iframe cache resout les deux problemes :
 *   - meme contexte same-origin (blob URL), donc on garde l'acces a
 *     `contentWindow.print()`
 *   - pas de nouvelle fenetre, donc pas de tabnabbing possible
 *
 * La blob URL et l'iframe sont nettoyes apres 60s pour eviter les fuites
 * memoire et les iframes orphelines accumulees.
 */
export function printPdfBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");

  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.setAttribute("aria-hidden", "true");
  iframe.src = url;

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      URL.revokeObjectURL(url);
    } catch {
      // noop
    }
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // Certains navigateurs bloquent print() si l'iframe n'est pas
      // completement parsée comme PDF natif. Dans ce cas on laisse
      // simplement le viewer ouvert dans l'iframe (qui est invisible) ;
      // le cleanup interviendra apres 60s.
    }
  };

  document.body.appendChild(iframe);

  // Filet de securite : on supprime l'iframe et libere la blob URL apres
  // 60 secondes meme si l'utilisateur n'a pas confirme la dialog d'impression.
  setTimeout(cleanup, 60_000);
}
