import { useRef, useState, useCallback } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useInvoice,
  useRecordPayment,
  useCancelInvoicePayment,
  InvoiceStatus,
  calculateVatSummary,
} from "@/hooks/useInvoices";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Pencil,
  Printer,
  Loader2,
  CreditCard,
  Eye,
  Send,
  Undo2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { generateInvoicePDF } from "@/lib/pdfGenerator";
import { toast } from "sonner";
import { PdfPreviewModal } from "@/components/pdf/PdfPreviewModal";
import { SendEmailModal } from "@/components/email/SendEmailModal";

const STATUS_CONFIG: Record<
  InvoiceStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  draft: { label: "Brouillon", variant: "secondary" },
  sent: { label: "Envoyée", variant: "default" },
  viewed: { label: "Vue", variant: "default" },
  paid: { label: "Payée", variant: "outline" },
  partially_paid: { label: "Partielle", variant: "default" },
  overdue: { label: "En retard", variant: "destructive" },
  cancelled: { label: "Annulée", variant: "secondary" },
};

interface InvoiceDetailsProps {
  invoiceId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export const InvoiceDetails = ({
  invoiceId,
  open,
  onOpenChange,
  onEdit,
}: InvoiceDetailsProps) => {
  const { data: invoice, isLoading } = useInvoice(invoiceId ?? undefined);
  const { organization } = useOrganization();
  const recordPayment = useRecordPayment();
  const cancelPayment = useCancelInvoicePayment();
  const printRef = useRef<HTMLDivElement>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<jsPDF | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const handleCancelPayment = () => {
    if (invoice) {
      cancelPayment.mutate(invoice.id, {
        onSuccess: () => {
          onOpenChange(false);
        },
      });
    }
  };

  const generatePdf = useCallback(async (): Promise<jsPDF> => {
    if (!invoice || !organization) throw new Error("Missing data");
    return await generateInvoicePDF(invoice as any, organization as any);
  }, [invoice, organization]);

  const handlePreviewPDF = async () => {
    if (!invoice || !organization) return;

    setShowPdfPreview(true);
    setIsGeneratingPDF(true);
    setPdfDoc(null);

    try {
      const doc = await generateInvoicePDF(invoice as any, organization as any);
      setPdfDoc(doc);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
      setShowPdfPreview(false);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  const balanceDue = invoice
    ? Number(invoice.total || 0) - Number(invoice.amount_paid || 0)
    : 0;
  const vatSummary = invoice?.invoice_lines
    ? calculateVatSummary(invoice.invoice_lines)
    : [];

  const handleRecordPayment = () => {
    if (invoice && paymentAmount) {
      recordPayment.mutate(
        { id: invoice.id, amount: Number(paymentAmount) },
        {
          onSuccess: () => {
            setPaymentAmount("");
            setShowPaymentInput(false);
          },
        }
      );
    }
  };

  const handlePrint = async () => {
    if (!invoice || !organization) return;

    try {
      const doc = await generateInvoicePDF(invoice as any, organization as any);
      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);

      const printWindow = window.open(pdfUrl, "_blank");
      if (printWindow) {
        printWindow.addEventListener("load", () => {
          printWindow.print();
        });
      }
    } catch (error) {
      console.error("Error generating PDF for print:", error);
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] p-0 w-[95vw] sm:w-full">
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <DialogTitle className="text-lg sm:text-xl">Facture {invoice?.number}</DialogTitle>
              {invoice && (
                <Badge
                  variant={
                    STATUS_CONFIG[invoice.status as InvoiceStatus]?.variant ||
                    "secondary"
                  }
                >
                  {STATUS_CONFIG[invoice.status as InvoiceStatus]?.label ||
                    invoice.status}
                </Badge>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {invoice &&
                invoice.status !== "paid" &&
                invoice.status !== "cancelled" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPaymentInput(!showPaymentInput)}
                    className="flex-1 sm:flex-none"
                  >
                    <CreditCard className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Paiement</span>
                  </Button>
                )}
              {invoice &&
                (invoice.status === "paid" ||
                  invoice.status === "partially_paid") && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-orange-600 border-orange-200 hover:bg-orange-50 flex-1 sm:flex-none"
                      >
                        <Undo2 className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Annuler paiement</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Annuler le paiement ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action va remettre la facture en attente de
                          paiement. Le montant payé sera remis à zéro.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Non, garder</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancelPayment}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          Oui, annuler le paiement
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              {invoice?.contact?.email && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowEmailModal(true)}
                  className="flex-1 sm:flex-none"
                >
                  <Send className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Envoyer</span>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handlePreviewPDF} className="hidden sm:flex">
                <Eye className="mr-2 h-4 w-4" />
                Aperçu PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="hidden md:flex">
                <Printer className="mr-2 h-4 w-4" />
                Imprimer
              </Button>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit} className="flex-1 sm:flex-none">
                  <Pencil className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Modifier</span>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {showPaymentInput && invoice && (
          <div className="mx-4 sm:mx-6 p-3 sm:p-4 bg-muted/50 rounded-lg flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
            <div className="flex-1">
              <Label htmlFor="payment-amount">Montant du paiement</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                placeholder={`Max: ${formatPrice(balanceDue)}`}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRecordPayment}
                disabled={!paymentAmount || recordPayment.isPending}
                className="flex-1 sm:flex-none"
              >
                {recordPayment.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Enregistrer
              </Button>
              <Button variant="ghost" onClick={() => setShowPaymentInput(false)}>
                Annuler
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="h-[calc(95vh-100px)]">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : invoice ? (
            <div ref={printRef} className="p-4 sm:p-6 space-y-6">
              {/* Client & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Client
                  </h3>
                  {invoice.contact ? (
                    <div className="space-y-1">
                      <p className="font-medium">
                        {invoice.contact.company_name ||
                          `${invoice.contact.first_name || ""} ${
                            invoice.contact.last_name || ""
                          }`}
                      </p>
                      {invoice.contact.email && (
                        <p className="text-sm text-muted-foreground">
                          {invoice.contact.email}
                        </p>
                      )}
                      {(invoice.contact.phone || invoice.contact.mobile) && (
                        <p className="text-sm text-muted-foreground">
                          {invoice.contact.phone || invoice.contact.mobile}
                        </p>
                      )}
                      {(invoice.contact.billing_address_line1 ||
                        invoice.contact.billing_city) && (
                        <div className="text-sm text-muted-foreground">
                          {invoice.contact.billing_address_line1 && (
                            <p>{invoice.contact.billing_address_line1}</p>
                          )}
                          {invoice.contact.billing_address_line2 && (
                            <p>{invoice.contact.billing_address_line2}</p>
                          )}
                          {(invoice.contact.billing_postal_code ||
                            invoice.contact.billing_city) && (
                            <p>
                              {invoice.contact.billing_postal_code}{" "}
                              {invoice.contact.billing_city}
                            </p>
                          )}
                          {invoice.contact.billing_country && (
                            <p>{invoice.contact.billing_country}</p>
                          )}
                        </div>
                      )}
                      {invoice.contact.siret && (
                        <p className="text-sm text-muted-foreground">
                          SIRET: {invoice.contact.siret}
                        </p>
                      )}
                      {invoice.contact.vat_number && (
                        <p className="text-sm text-muted-foreground">
                          TVA: {invoice.contact.vat_number}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Aucun client</p>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Date: </span>
                    {format(new Date(invoice.date), "dd MMMM yyyy", {
                      locale: fr,
                    })}
                  </p>
                  {invoice.due_date && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Échéance: </span>
                      {format(new Date(invoice.due_date), "dd MMMM yyyy", {
                        locale: fr,
                      })}
                    </p>
                  )}
                  {invoice.sent_at && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">
                        Envoyée le:{" "}
                      </span>
                      {format(new Date(invoice.sent_at), "dd/MM/yyyy HH:mm", {
                        locale: fr,
                      })}
                    </p>
                  )}
                  {invoice.viewed_at && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Vue le: </span>
                      {format(new Date(invoice.viewed_at), "dd/MM/yyyy HH:mm", {
                        locale: fr,
                      })}
                    </p>
                  )}
                  {invoice.paid_at && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Payée le: </span>
                      {format(new Date(invoice.paid_at), "dd/MM/yyyy HH:mm", {
                        locale: fr,
                      })}
                    </p>
                  )}
                  {invoice.created_at && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Créée le: </span>
                      {format(
                        new Date(invoice.created_at),
                        "dd/MM/yyyy HH:mm",
                        { locale: fr }
                      )}
                    </p>
                  )}
                  {invoice.updated_at &&
                    invoice.updated_at !== invoice.created_at && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">
                          Modifiée le:{" "}
                        </span>
                        {format(
                          new Date(invoice.updated_at),
                          "dd/MM/yyyy HH:mm",
                          { locale: fr }
                        )}
                      </p>
                    )}
                </div>
              </div>

              {/* Created from quote badge */}
              {invoice.quote_id && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    📋 Créée depuis un devis
                  </span>
                </div>
              )}

              {invoice.purchase_order_number && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <span className="text-sm font-medium">
                    Référence commande:{" "}
                  </span>
                  <span className="text-sm">
                    {invoice.purchase_order_number}
                  </span>
                </div>
              )}

              {invoice.subject && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    Objet
                  </h3>
                  <p>{invoice.subject}</p>
                </div>
              )}

              <Separator />

              {/* Lines */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Détail
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">
                          Description
                        </th>
                        <th className="text-right p-3 font-medium w-20">Qté</th>
                        <th className="text-right p-3 font-medium w-28">
                          Prix HT
                        </th>
                        {invoice.invoice_lines?.some(
                          (l) =>
                            l.discount_percent && Number(l.discount_percent) > 0
                        ) && (
                          <th className="text-right p-3 font-medium w-20">
                            Remise
                          </th>
                        )}
                        <th className="text-right p-3 font-medium w-20">TVA</th>
                        <th className="text-right p-3 font-medium w-28">
                          Total HT
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.invoice_lines?.map((line, index) => (
                        <tr
                          key={line.id}
                          className={
                            index % 2 === 0 ? "bg-background" : "bg-muted/20"
                          }
                        >
                          <td className="p-3">{line.description}</td>
                          <td className="text-right p-3">{line.quantity}</td>
                          <td className="text-right p-3">
                            {formatPrice(Number(line.unit_price))}
                          </td>
                          {invoice.invoice_lines?.some(
                            (l) =>
                              l.discount_percent &&
                              Number(l.discount_percent) > 0
                          ) && (
                            <td className="text-right p-3">
                              {line.discount_percent &&
                              Number(line.discount_percent) > 0
                                ? `${line.discount_percent}%`
                                : "-"}
                            </td>
                          )}
                          <td className="text-right p-3">{line.tax_rate}%</td>
                          <td className="text-right p-3 font-medium">
                            {formatPrice(Number(line.line_total))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* VAT Summary */}
              {vatSummary.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Récapitulatif TVA
                  </h3>
                  <div className="border rounded-lg overflow-hidden w-fit ml-auto">
                    <table className="text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 font-medium w-24">
                            Taux
                          </th>
                          <th className="text-right p-2 font-medium w-28">
                            Base HT
                          </th>
                          <th className="text-right p-2 font-medium w-28">
                            TVA
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {vatSummary.map((v, index) => (
                          <tr
                            key={v.rate}
                            className={
                              index % 2 === 0 ? "bg-background" : "bg-muted/20"
                            }
                          >
                            <td className="p-2">TVA {v.rate}%</td>
                            <td className="text-right p-2">
                              {formatPrice(v.base)}
                            </td>
                            <td className="text-right p-2">
                              {formatPrice(v.vat)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total HT</span>
                    <span>{formatPrice(Number(invoice.subtotal))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total TVA</span>
                    <span>{formatPrice(Number(invoice.tax_amount))}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total TTC</span>
                    <span>{formatPrice(Number(invoice.total))}</span>
                  </div>
                  {Number(invoice.amount_paid || 0) > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Acompte reçu
                        </span>
                        <span className="text-green-600">
                          -{formatPrice(Number(invoice.amount_paid))}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium text-lg text-destructive">
                        <span>Solde à payer</span>
                        <span>{formatPrice(balanceDue)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Bank Info */}
              {(organization?.bank_details ||
                organization?.rib ||
                organization?.bic) && (
                <>
                  <Separator />
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                      Informations bancaires
                    </h3>
                    <div className="text-sm space-y-1">
                      {organization.bank_details && (
                        <p>{organization.bank_details}</p>
                      )}
                      {organization.rib && (
                        <p>
                          <strong>RIB:</strong> {organization.rib}
                        </p>
                      )}
                      {organization.bic && (
                        <p>
                          <strong>BIC:</strong> {organization.bic}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Notes & Terms */}
              {(invoice.notes || invoice.terms) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-6">
                    {invoice.notes && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                          Notes
                        </h3>
                        <p className="text-sm whitespace-pre-wrap">
                          {invoice.notes}
                        </p>
                      </div>
                    )}
                    {invoice.terms && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                          Conditions
                        </h3>
                        <p className="text-sm whitespace-pre-wrap">
                          {invoice.terms}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>

      <PdfPreviewModal
        open={showPdfPreview}
        onOpenChange={setShowPdfPreview}
        pdfDoc={pdfDoc}
        fileName={`Facture-${invoice?.number || "N-A"}.pdf`}
        title={`Aperçu Facture ${invoice?.number || ""}`}
        isGenerating={isGeneratingPDF}
      />

      {invoice && (
        <SendEmailModal
          open={showEmailModal}
          onOpenChange={setShowEmailModal}
          documentId={invoice.id}
          documentNumber={invoice.number}
          documentType="invoice"
          recipientEmail={invoice.contact?.email || ""}
          organizationName={organization?.name || ""}
          pdfGenerator={generatePdf}
        />
      )}
    </Dialog>
  );
};
