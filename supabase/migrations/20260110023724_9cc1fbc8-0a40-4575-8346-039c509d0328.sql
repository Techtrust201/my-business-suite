-- Enable REPLICA IDENTITY FULL for real-time updates
ALTER TABLE invoices REPLICA IDENTITY FULL;
ALTER TABLE quotes REPLICA IDENTITY FULL;
ALTER TABLE contacts REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;