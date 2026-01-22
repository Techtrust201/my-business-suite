export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          margin: number | null
          margin_percent: number | null
          name: string
          organization_id: string
          purchase_price: number | null
          reference: string | null
          tax_rate_id: string | null
          type: Database["public"]["Enums"]["article_type"]
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          margin?: number | null
          margin_percent?: number | null
          name: string
          organization_id: string
          purchase_price?: number | null
          reference?: string | null
          tax_rate_id?: string | null
          type?: Database["public"]["Enums"]["article_type"]
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          margin?: number | null
          margin_percent?: number | null
          name?: string
          organization_id?: string
          purchase_price?: number | null
          reference?: string | null
          tax_rate_id?: string | null
          type?: Database["public"]["Enums"]["article_type"]
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          organization_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          bank_name: string | null
          bic: string | null
          chart_account_id: string | null
          created_at: string | null
          currency: string | null
          current_balance: number | null
          iban: string | null
          id: string
          initial_balance: number | null
          is_active: boolean | null
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          bic?: string | null
          chart_account_id?: string | null
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          iban?: string | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean | null
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          bic?: string | null
          chart_account_id?: string | null
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          iban?: string | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_account_id: string
          category: string | null
          created_at: string | null
          date: string
          description: string
          id: string
          import_hash: string | null
          is_reconciled: boolean | null
          matched_bill_id: string | null
          matched_invoice_id: string | null
          matched_payment_id: string | null
          notes: string | null
          organization_id: string
          reference: string | null
          type: string | null
        }
        Insert: {
          amount: number
          bank_account_id: string
          category?: string | null
          created_at?: string | null
          date: string
          description: string
          id?: string
          import_hash?: string | null
          is_reconciled?: boolean | null
          matched_bill_id?: string | null
          matched_invoice_id?: string | null
          matched_payment_id?: string | null
          notes?: string | null
          organization_id: string
          reference?: string | null
          type?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string
          category?: string | null
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          import_hash?: string | null
          is_reconciled?: boolean | null
          matched_bill_id?: string | null
          matched_invoice_id?: string | null
          matched_payment_id?: string | null
          notes?: string | null
          organization_id?: string
          reference?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_bill_id_fkey"
            columns: ["matched_bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_invoice_id_fkey"
            columns: ["matched_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_matched_payment_id_fkey"
            columns: ["matched_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_lines: {
        Row: {
          bill_id: string
          created_at: string | null
          description: string
          id: string
          item_id: string | null
          line_total: number | null
          position: number | null
          quantity: number
          tax_rate: number | null
          unit_price: number
        }
        Insert: {
          bill_id: string
          created_at?: string | null
          description: string
          id?: string
          item_id?: string | null
          line_total?: number | null
          position?: number | null
          quantity?: number
          tax_rate?: number | null
          unit_price?: number
        }
        Update: {
          bill_id?: string
          created_at?: string | null
          description?: string
          id?: string
          item_id?: string | null
          line_total?: number | null
          position?: number | null
          quantity?: number
          tax_rate?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_lines_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_payments: {
        Row: {
          amount: number
          bill_id: string
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          organization_id: string
          reference: string | null
        }
        Insert: {
          amount: number
          bill_id: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          organization_id: string
          reference?: string | null
        }
        Update: {
          amount?: number
          bill_id?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          organization_id?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          amount_paid: number | null
          attachment_url: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          date: string
          due_date: string | null
          id: string
          notes: string | null
          number: string | null
          organization_id: string
          paid_at: string | null
          status: Database["public"]["Enums"]["bill_status"]
          subject: string | null
          subtotal: number | null
          tax_amount: number | null
          total: number | null
          updated_at: string | null
          vendor_reference: string | null
        }
        Insert: {
          amount_paid?: number | null
          attachment_url?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          date?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          number?: string | null
          organization_id: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
          subject?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total?: number | null
          updated_at?: string | null
          vendor_reference?: string | null
        }
        Update: {
          amount_paid?: number | null
          attachment_url?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          date?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          number?: string | null
          organization_id?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
          subject?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total?: number | null
          updated_at?: string | null
          vendor_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_class: number
          account_number: string
          account_type: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          organization_id: string
          parent_account_number: string | null
          updated_at: string | null
        }
        Insert: {
          account_class: number
          account_number: string
          account_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          organization_id: string
          parent_account_number?: string | null
          updated_at?: string | null
        }
        Update: {
          account_class?: number
          account_number?: string
          account_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          organization_id?: string
          parent_account_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_country: string | null
          billing_postal_code: string | null
          company_name: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          legal_form: string | null
          mobile: string | null
          naf_code: string | null
          notes: string | null
          organization_id: string
          payment_terms: number | null
          phone: string | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_postal_code: string | null
          siren: string | null
          siret: string | null
          tags: string[] | null
          type: Database["public"]["Enums"]["contact_type"]
          updated_at: string | null
          vat_number: string | null
        }
        Insert: {
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          legal_form?: string | null
          mobile?: string | null
          naf_code?: string | null
          notes?: string | null
          organization_id: string
          payment_terms?: number | null
          phone?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          siren?: string | null
          siret?: string | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["contact_type"]
          updated_at?: string | null
          vat_number?: string | null
        }
        Update: {
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          legal_form?: string | null
          mobile?: string | null
          naf_code?: string | null
          notes?: string | null
          organization_id?: string
          payment_terms?: number | null
          phone?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          siren?: string | null
          siret?: string | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["contact_type"]
          updated_at?: string | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"] | null
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          id: string
          is_reimbursable: boolean | null
          matched_transaction_id: string | null
          notes: string | null
          organization_id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          receipt_url: string | null
          updated_at: string | null
          vendor_name: string | null
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"] | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          is_reimbursable?: boolean | null
          matched_transaction_id?: string | null
          notes?: string | null
          organization_id: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          receipt_url?: string | null
          updated_at?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"] | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          is_reimbursable?: boolean | null
          matched_transaction_id?: string | null
          notes?: string | null
          organization_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          receipt_url?: string | null
          updated_at?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_matched_transaction_id_fkey"
            columns: ["matched_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_years: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          end_date: string
          id: string
          is_closed: boolean | null
          name: string
          organization_id: string
          start_date: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          is_closed?: boolean | null
          name: string
          organization_id: string
          start_date: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          is_closed?: boolean | null
          name?: string
          organization_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_years_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_years_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          created_at: string | null
          description: string
          discount_percent: number | null
          id: string
          invoice_id: string
          item_id: string | null
          line_total: number | null
          position: number | null
          purchase_price: number | null
          quantity: number
          tax_rate: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          discount_percent?: number | null
          id?: string
          invoice_id: string
          item_id?: string | null
          line_total?: number | null
          position?: number | null
          purchase_price?: number | null
          quantity?: number
          tax_rate?: number | null
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          description?: string
          discount_percent?: number | null
          id?: string
          invoice_id?: string
          item_id?: string | null
          line_total?: number | null
          position?: number | null
          purchase_price?: number | null
          quantity?: number
          tax_rate?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          date: string
          due_date: string | null
          id: string
          notes: string | null
          number: string
          organization_id: string
          paid_at: string | null
          purchase_order_number: string | null
          quote_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subject: string | null
          subtotal: number | null
          tax_amount: number | null
          terms: string | null
          total: number | null
          updated_at: string | null
          viewed_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          date?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          number: string
          organization_id: string
          paid_at?: string | null
          purchase_order_number?: string | null
          quote_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subject?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          terms?: string | null
          total?: number | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          date?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          number?: string
          organization_id?: string
          paid_at?: string | null
          purchase_order_number?: string | null
          quote_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subject?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          terms?: string | null
          total?: number | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          category: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          sku: string | null
          tax_rate_id: string | null
          type: Database["public"]["Enums"]["item_type"]
          unit: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          sku?: string | null
          tax_rate_id?: string | null
          type?: Database["public"]["Enums"]["item_type"]
          unit?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          sku?: string | null
          tax_rate_id?: string | null
          type?: Database["public"]["Enums"]["item_type"]
          unit?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string
          description: string
          entry_number: string
          id: string
          is_balanced: boolean | null
          journal_type: string
          organization_id: string
          reference_id: string | null
          reference_type: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date: string
          description: string
          entry_number: string
          id?: string
          is_balanced?: boolean | null
          journal_type: string
          organization_id: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string
          entry_number?: string
          id?: string
          is_balanced?: boolean | null
          journal_type?: string
          organization_id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          created_at: string | null
          credit: number | null
          debit: number | null
          description: string | null
          id: string
          journal_entry_id: string
          position: number | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_entry_id: string
          position?: number | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_entry_id?: string
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          bank_details: string | null
          bic: string | null
          city: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          default_payment_terms: number | null
          email: string | null
          id: string
          invoice_next_number: number | null
          invoice_prefix: string | null
          journal_entry_next_number: number | null
          legal_mentions: string | null
          legal_name: string | null
          logo_url: string | null
          name: string
          phone: string | null
          postal_code: string | null
          quote_next_number: number | null
          quote_prefix: string | null
          rib: string | null
          settings: Json | null
          siret: string | null
          timezone: string | null
          updated_at: string | null
          vat_number: string | null
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          bank_details?: string | null
          bic?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          default_payment_terms?: number | null
          email?: string | null
          id?: string
          invoice_next_number?: number | null
          invoice_prefix?: string | null
          journal_entry_next_number?: number | null
          legal_mentions?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          quote_next_number?: number | null
          quote_prefix?: string | null
          rib?: string | null
          settings?: Json | null
          siret?: string | null
          timezone?: string | null
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          bank_details?: string | null
          bic?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          default_payment_terms?: number | null
          email?: string | null
          id?: string
          invoice_next_number?: number | null
          invoice_prefix?: string | null
          journal_entry_next_number?: number | null
          legal_mentions?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          quote_next_number?: number | null
          quote_prefix?: string | null
          rib?: string | null
          settings?: Json | null
          siret?: string | null
          timezone?: string | null
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          organization_id: string
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          invoice_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          organization_id: string
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          organization_id?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          organization_id: string | null
          phone: string | null
          totp_enabled: boolean | null
          totp_secret: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          organization_id?: string | null
          phone?: string | null
          totp_enabled?: boolean | null
          totp_secret?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization_id?: string | null
          phone?: string | null
          totp_enabled?: boolean | null
          totp_secret?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_contacts: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          is_primary: boolean
          last_name: string | null
          mobile: string | null
          notes: string | null
          phone: string | null
          prospect_id: string
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_primary?: boolean
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          prospect_id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_primary?: boolean
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          prospect_id?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_contacts_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_emails: {
        Row: {
          body: string
          created_at: string
          id: string
          organization_id: string
          prospect_contact_id: string | null
          prospect_id: string
          quote_id: string | null
          sent_at: string
          sent_by: string
          subject: string
          to_email: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          organization_id: string
          prospect_contact_id?: string | null
          prospect_id: string
          quote_id?: string | null
          sent_at?: string
          sent_by: string
          subject: string
          to_email: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          organization_id?: string
          prospect_contact_id?: string | null
          prospect_id?: string
          quote_id?: string | null
          sent_at?: string
          sent_by?: string
          subject?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_emails_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_emails_prospect_contact_id_fkey"
            columns: ["prospect_contact_id"]
            isOneToOne: false
            referencedRelation: "prospect_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_emails_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_emails_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_statuses: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          is_default: boolean
          is_final_negative: boolean
          is_final_positive: boolean
          name: string
          organization_id: string
          position: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_final_negative?: boolean
          is_final_positive?: boolean
          name: string
          organization_id: string
          position?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_final_negative?: boolean
          is_final_positive?: boolean
          name?: string
          organization_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_statuses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_visits: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          organization_id: string
          prospect_id: string
          status_after_id: string | null
          status_before_id: string | null
          visit_latitude: number | null
          visit_longitude: number | null
          visited_at: string
          visited_by: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          organization_id: string
          prospect_id: string
          status_after_id?: string | null
          status_before_id?: string | null
          visit_latitude?: number | null
          visit_longitude?: number | null
          visited_at?: string
          visited_by: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          organization_id?: string
          prospect_id?: string
          status_after_id?: string | null
          status_before_id?: string | null
          visit_latitude?: number | null
          visit_longitude?: number | null
          visited_at?: string
          visited_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_visits_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_visits_status_after_id_fkey"
            columns: ["status_after_id"]
            isOneToOne: false
            referencedRelation: "prospect_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_visits_status_before_id_fkey"
            columns: ["status_before_id"]
            isOneToOne: false
            referencedRelation: "prospect_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          assigned_to_user_id: string | null
          city: string | null
          company_name: string
          contact_id: string | null
          converted_at: string | null
          country: string | null
          created_at: string
          created_by: string | null
          email: string | null
          geocoded_at: string | null
          id: string
          latitude: number | null
          legal_form: string | null
          longitude: number | null
          naf_code: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          postal_code: string | null
          siren: string | null
          siret: string | null
          source: string | null
          status_id: string | null
          updated_at: string
          vat_number: string | null
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          assigned_to_user_id?: string | null
          city?: string | null
          company_name: string
          contact_id?: string | null
          converted_at?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          geocoded_at?: string | null
          id?: string
          latitude?: number | null
          legal_form?: string | null
          longitude?: number | null
          naf_code?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          siren?: string | null
          siret?: string | null
          source?: string | null
          status_id?: string | null
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          assigned_to_user_id?: string | null
          city?: string | null
          company_name?: string
          contact_id?: string | null
          converted_at?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          geocoded_at?: string | null
          id?: string
          latitude?: number | null
          legal_form?: string | null
          longitude?: number | null
          naf_code?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          siren?: string | null
          siret?: string | null
          source?: string | null
          status_id?: string | null
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "prospect_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_lines: {
        Row: {
          created_at: string | null
          description: string
          discount_percent: number | null
          id: string
          item_id: string | null
          line_total: number | null
          position: number | null
          quantity: number
          quote_id: string
          tax_rate: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          discount_percent?: number | null
          id?: string
          item_id?: string | null
          line_total?: number | null
          position?: number | null
          quantity?: number
          quote_id: string
          tax_rate?: number | null
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          description?: string
          discount_percent?: number | null
          id?: string
          item_id?: string | null
          line_total?: number | null
          position?: number | null
          quantity?: number
          quote_id?: string
          tax_rate?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          contact_id: string | null
          converted_to_invoice_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          date: string
          id: string
          notes: string | null
          number: string
          organization_id: string
          status: Database["public"]["Enums"]["quote_status"]
          subject: string | null
          subtotal: number | null
          tax_amount: number | null
          terms: string | null
          total: number | null
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          contact_id?: string | null
          converted_to_invoice_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          date?: string
          id?: string
          notes?: string | null
          number: string
          organization_id: string
          status?: Database["public"]["Enums"]["quote_status"]
          subject?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          terms?: string | null
          total?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          contact_id?: string | null
          converted_to_invoice_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          date?: string
          id?: string
          notes?: string | null
          number?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["quote_status"]
          subject?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          terms?: string | null
          total?: number | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          collected_account_id: string | null
          created_at: string | null
          deductible_account_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          organization_id: string
          rate: number
          updated_at: string | null
        }
        Insert: {
          collected_account_id?: string | null
          created_at?: string | null
          deductible_account_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          organization_id: string
          rate: number
          updated_at?: string | null
        }
        Update: {
          collected_account_id?: string | null
          created_at?: string | null
          deductible_account_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          organization_id?: string
          rate?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_collected_account_id_fkey"
            columns: ["collected_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_rates_deductible_account_id_fkey"
            columns: ["deductible_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          can_manage_prospects: boolean
          can_send_emails: boolean
          can_view_dashboard: boolean
          created_at: string | null
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          can_manage_prospects?: boolean
          can_send_emails?: boolean
          can_view_dashboard?: boolean
          created_at?: string | null
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          can_manage_prospects?: boolean
          can_send_emails?: boolean
          can_view_dashboard?: boolean
          created_at?: string | null
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization_for_user: {
        Args: {
          _address_line1?: string
          _address_line2?: string
          _bank_details?: string
          _city?: string
          _country?: string
          _currency?: string
          _default_payment_terms?: number
          _email?: string
          _invoice_prefix?: string
          _legal_mentions?: string
          _legal_name?: string
          _name: string
          _phone?: string
          _postal_code?: string
          _quote_prefix?: string
          _siret?: string
          _timezone?: string
          _vat_number?: string
          _website?: string
        }
        Returns: string
      }
      get_next_invoice_number: { Args: { _org_id: string }; Returns: string }
      get_next_journal_entry_number: {
        Args: { _org_id: string }
        Returns: string
      }
      get_next_quote_number: { Args: { _org_id: string }; Returns: string }
      get_user_organization_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      init_chart_of_accounts: { Args: { _org_id: string }; Returns: undefined }
      init_prospect_statuses: { Args: { _org_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "accountant" | "sales" | "readonly"
      article_type: "product" | "service"
      bill_status:
        | "draft"
        | "received"
        | "partially_paid"
        | "paid"
        | "overdue"
        | "cancelled"
      contact_type: "client" | "supplier" | "both"
      expense_category:
        | "restauration"
        | "transport"
        | "fournitures"
        | "telecom"
        | "abonnements"
        | "frais_bancaires"
        | "hebergement"
        | "marketing"
        | "formation"
        | "autre"
      invoice_status:
        | "draft"
        | "sent"
        | "viewed"
        | "partially_paid"
        | "paid"
        | "overdue"
        | "cancelled"
      item_type: "product" | "service"
      payment_method: "bank_transfer" | "card" | "cash" | "check" | "other"
      quote_status:
        | "draft"
        | "sent"
        | "viewed"
        | "accepted"
        | "rejected"
        | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "accountant", "sales", "readonly"],
      article_type: ["product", "service"],
      bill_status: [
        "draft",
        "received",
        "partially_paid",
        "paid",
        "overdue",
        "cancelled",
      ],
      contact_type: ["client", "supplier", "both"],
      expense_category: [
        "restauration",
        "transport",
        "fournitures",
        "telecom",
        "abonnements",
        "frais_bancaires",
        "hebergement",
        "marketing",
        "formation",
        "autre",
      ],
      invoice_status: [
        "draft",
        "sent",
        "viewed",
        "partially_paid",
        "paid",
        "overdue",
        "cancelled",
      ],
      item_type: ["product", "service"],
      payment_method: ["bank_transfer", "card", "cash", "check", "other"],
      quote_status: [
        "draft",
        "sent",
        "viewed",
        "accepted",
        "rejected",
        "expired",
      ],
    },
  },
} as const
