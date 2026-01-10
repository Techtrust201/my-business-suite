import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SendEmailParams {
  invoiceId: string;
  recipientEmail: string;
  pdfBase64: string;
  documentType: 'invoice' | 'quote';
  documentNumber: string;
  subject?: string;
  message?: string;
}

export function useSendEmail() {
  const [isSending, setIsSending] = useState(false);

  const sendEmail = async (params: SendEmailParams): Promise<boolean> => {
    setIsSending(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: params,
      });

      if (error) {
        console.error('Error sending email:', error);
        toast.error('Erreur lors de l\'envoi de l\'email');
        return false;
      }

      toast.success('Email envoyé avec succès !');
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Erreur lors de l\'envoi de l\'email');
      return false;
    } finally {
      setIsSending(false);
    }
  };

  return { sendEmail, isSending };
}
