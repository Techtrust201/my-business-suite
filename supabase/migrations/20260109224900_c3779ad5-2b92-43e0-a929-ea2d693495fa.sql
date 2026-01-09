-- Fix RLS policies for quote_lines, invoice_lines, and bill_lines
-- The issue: ALL policies with only USING expression don't work for INSERT (needs WITH CHECK)

-- ============== QUOTE_LINES ==============
DROP POLICY IF EXISTS "Users can manage quote lines" ON quote_lines;

CREATE POLICY "Users can select quote lines" ON quote_lines
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_lines.quote_id AND q.organization_id = get_user_organization_id())
  );

CREATE POLICY "Users can insert quote lines" ON quote_lines
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND q.organization_id = get_user_organization_id())
  );

CREATE POLICY "Users can update quote lines" ON quote_lines
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_lines.quote_id AND q.organization_id = get_user_organization_id())
  );

CREATE POLICY "Users can delete quote lines" ON quote_lines
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_lines.quote_id AND q.organization_id = get_user_organization_id())
  );

-- ============== INVOICE_LINES ==============
DROP POLICY IF EXISTS "Users can manage invoice lines" ON invoice_lines;

CREATE POLICY "Users can select invoice lines" ON invoice_lines
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_lines.invoice_id AND i.organization_id = get_user_organization_id())
  );

CREATE POLICY "Users can insert invoice lines" ON invoice_lines
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND i.organization_id = get_user_organization_id())
  );

CREATE POLICY "Users can update invoice lines" ON invoice_lines
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_lines.invoice_id AND i.organization_id = get_user_organization_id())
  );

CREATE POLICY "Users can delete invoice lines" ON invoice_lines
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_lines.invoice_id AND i.organization_id = get_user_organization_id())
  );

-- ============== BILL_LINES ==============
DROP POLICY IF EXISTS "Users can manage bill lines" ON bill_lines;

CREATE POLICY "Users can select bill lines" ON bill_lines
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM bills b WHERE b.id = bill_lines.bill_id AND b.organization_id = get_user_organization_id())
  );

CREATE POLICY "Users can insert bill lines" ON bill_lines
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM bills b WHERE b.id = bill_id AND b.organization_id = get_user_organization_id())
  );

CREATE POLICY "Users can update bill lines" ON bill_lines
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM bills b WHERE b.id = bill_lines.bill_id AND b.organization_id = get_user_organization_id())
  );

CREATE POLICY "Users can delete bill lines" ON bill_lines
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM bills b WHERE b.id = bill_lines.bill_id AND b.organization_id = get_user_organization_id())
  );