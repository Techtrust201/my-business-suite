-- Create function to handle organization creation atomically
CREATE OR REPLACE FUNCTION public.create_organization_for_user(
    _name TEXT,
    _legal_name TEXT DEFAULT NULL,
    _siret TEXT DEFAULT NULL,
    _vat_number TEXT DEFAULT NULL,
    _address_line1 TEXT DEFAULT NULL,
    _address_line2 TEXT DEFAULT NULL,
    _city TEXT DEFAULT NULL,
    _postal_code TEXT DEFAULT NULL,
    _country TEXT DEFAULT 'France',
    _phone TEXT DEFAULT NULL,
    _email TEXT DEFAULT NULL,
    _website TEXT DEFAULT NULL,
    _currency TEXT DEFAULT 'EUR',
    _timezone TEXT DEFAULT 'Europe/Paris',
    _invoice_prefix TEXT DEFAULT 'FAC',
    _quote_prefix TEXT DEFAULT 'DEV',
    _default_payment_terms INTEGER DEFAULT 30,
    _legal_mentions TEXT DEFAULT NULL,
    _bank_details TEXT DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _org_id UUID;
    _user_id UUID := auth.uid();
BEGIN
    -- 1. Create the organization
    INSERT INTO public.organizations (
        name, legal_name, siret, vat_number,
        address_line1, address_line2, city, postal_code, country,
        phone, email, website,
        currency, timezone,
        invoice_prefix, quote_prefix,
        default_payment_terms, legal_mentions, bank_details
    )
    VALUES (
        _name, _legal_name, _siret, _vat_number,
        _address_line1, _address_line2, _city, _postal_code, _country,
        _phone, _email, _website,
        _currency, _timezone,
        _invoice_prefix, _quote_prefix,
        _default_payment_terms, _legal_mentions, _bank_details
    )
    RETURNING id INTO _org_id;
    
    -- 2. Update user profile with organization_id
    UPDATE public.profiles 
    SET organization_id = _org_id 
    WHERE id = _user_id;
    
    -- 3. Create admin role for this user
    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (_user_id, _org_id, 'admin');
    
    -- 4. Create default tax rates
    INSERT INTO public.tax_rates (organization_id, name, rate, is_default) VALUES
    (_org_id, 'TVA 20%', 20.00, true),
    (_org_id, 'TVA 10%', 10.00, false),
    (_org_id, 'TVA 5.5%', 5.50, false),
    (_org_id, 'TVA 2.1%', 2.10, false),
    (_org_id, 'Exonéré', 0.00, false);
    
    RETURN _org_id;
END;
$$;