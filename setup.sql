-- ============================================================
-- GB System / Elettro CRM — full schema setup
-- Combines all three migrations into one clean script.
-- Paste directly into the Supabase SQL editor on a fresh project.
-- ============================================================

-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'contractor');
CREATE TYPE public.job_status AS ENUM ('active', 'completed', 'invoiced');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid');
CREATE TYPE public.dico_status AS ENUM ('draft', 'ready_for_review', 'finalized_offline');
CREATE TYPE public.intervention_type AS ENUM ('nuovo_impianto','trasformazione','ampliamento','manutenzione_straordinaria');

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ CONTRACTORS ============
CREATE TABLE public.contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractors TO authenticated;
GRANT ALL ON public.contractors TO service_role;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER_ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_contractor_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT contractor_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ============ CLIENTS ============
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  partita_iva TEXT,
  codice_fiscale TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ============ JOBS ============
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  job_name TEXT NOT NULL,
  status job_status NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- ============ LOGGED HOURS ============
CREATE TABLE public.logged_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  hours NUMERIC(5,2) NOT NULL,
  description TEXT,
  client_missing_flag BOOLEAN NOT NULL DEFAULT false,
  client_missing_note TEXT,
  submitted BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ,
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logged_hours TO authenticated;
GRANT ALL ON public.logged_hours TO service_role;
ALTER TABLE public.logged_hours ENABLE ROW LEVEL SECURITY;

-- ============ WHOLESALERS ============
CREATE TABLE public.wholesalers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  system_type TEXT NOT NULL DEFAULT 'generic',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wholesalers TO authenticated;
GRANT ALL ON public.wholesalers TO service_role;
ALTER TABLE public.wholesalers ENABLE ROW LEVEL SECURITY;

-- ============ PURCHASES ============
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wholesaler_id UUID NOT NULL REFERENCES public.wholesalers(id) ON DELETE RESTRICT,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  bolla_number TEXT,
  purchase_date DATE NOT NULL,
  raw_file_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- ============ PURCHASE LINE ITEMS ============
CREATE TABLE public.purchase_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  manufacturer_code TEXT,
  technical_spec TEXT,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,4) NOT NULL DEFAULT 0,
  total_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_line_items TO authenticated;
GRANT ALL ON public.purchase_line_items TO service_role;
ALTER TABLE public.purchase_line_items ENABLE ROW LEVEL SECURITY;

-- ============ INVOICES ============
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE RESTRICT,
  invoice_number TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  labor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  materials_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  markup_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  markup_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  status invoice_status NOT NULL DEFAULT 'draft',
  sdi_xml_url TEXT,
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- ============ INVOICE LINE SOURCES ============
CREATE TABLE public.invoice_line_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('logged_hours','purchase_line_item')),
  source_id UUID NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_line_sources TO authenticated;
GRANT ALL ON public.invoice_line_sources TO service_role;
ALTER TABLE public.invoice_line_sources ENABLE ROW LEVEL SECURITY;

-- ============ DICO DRAFTS ============
CREATE TABLE public.dico_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  installer_company_name TEXT,
  installer_legal_rep_name TEXT,
  responsabile_tecnico_name TEXT,
  responsabile_tecnico_qualification TEXT,
  intervention_type intervention_type,
  client_name TEXT,
  client_address TEXT,
  property_use TEXT,
  technical_norms_followed TEXT,
  materials_report_generated BOOLEAN NOT NULL DEFAULT false,
  schema_planimetrico_url TEXT,
  status dico_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dico_drafts TO authenticated;
GRANT ALL ON public.dico_drafts TO service_role;
ALTER TABLE public.dico_drafts ENABLE ROW LEVEL SECURITY;

-- ============ COMPANY SETTINGS (singleton) ============
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT,
  legal_rep_name TEXT,
  responsabile_tecnico_name TEXT,
  responsabile_tecnico_qualification TEXT,
  partita_iva TEXT,
  codice_fiscale TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.company_settings (company_name) VALUES ('La Mia Azienda');

-- ============ UPDATED_AT TRIGGERS ============
CREATE TRIGGER trg_contractors_updated BEFORE UPDATE ON public.contractors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_logged_hours_updated BEFORE UPDATE ON public.logged_hours FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_wholesalers_updated BEFORE UPDATE ON public.wholesalers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_purchases_updated BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_dico_drafts_updated BEFORE UPDATE ON public.dico_drafts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_company_settings_updated BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SIGNUP TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ FUNCTION EXECUTE PERMISSIONS ============
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_contractor_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_contractor_id() TO authenticated;

-- ============ RLS POLICIES ============

-- profiles: users see/update their own; admins see all
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_admin_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR auth.uid() = id);
CREATE POLICY "profiles_admin_delete" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- user_roles: each user can read own roles; only admin manages
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles_admin_write" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- contractors: admins full; contractors can read minimal (own row) - allow read for own contractor_id
CREATE POLICY "contractors_admin_all" ON public.contractors FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "contractors_self_read" ON public.contractors FOR SELECT TO authenticated USING (id = public.current_contractor_id());

-- clients: admin only
CREATE POLICY "clients_admin_all" ON public.clients FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
-- contractors need to read client names to pick a job; allow read for authenticated
CREATE POLICY "clients_read_for_hour_logging" ON public.clients FOR SELECT TO authenticated USING (true);

-- jobs: admin all; contractors can read active jobs to log hours
CREATE POLICY "jobs_admin_all" ON public.jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "jobs_contractor_read" ON public.jobs FOR SELECT TO authenticated USING (true);

-- logged_hours: contractors manage own rows (only when not submitted); admins full
CREATE POLICY "logged_hours_admin_all" ON public.logged_hours FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "logged_hours_contractor_select" ON public.logged_hours FOR SELECT TO authenticated USING (contractor_id = public.current_contractor_id());
CREATE POLICY "logged_hours_contractor_insert" ON public.logged_hours FOR INSERT TO authenticated WITH CHECK (contractor_id = public.current_contractor_id());
CREATE POLICY "logged_hours_contractor_update" ON public.logged_hours FOR UPDATE TO authenticated USING (contractor_id = public.current_contractor_id() AND submitted = false) WITH CHECK (contractor_id = public.current_contractor_id());
CREATE POLICY "logged_hours_contractor_delete" ON public.logged_hours FOR DELETE TO authenticated USING (contractor_id = public.current_contractor_id() AND submitted = false);

-- wholesalers / purchases / invoices / dico / company_settings: admin-only
CREATE POLICY "wholesalers_admin_all" ON public.wholesalers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "purchases_admin_all" ON public.purchases FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "purchase_line_items_admin_all" ON public.purchase_line_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "invoices_admin_all" ON public.invoices FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "invoice_line_sources_admin_all" ON public.invoice_line_sources FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "dico_drafts_admin_all" ON public.dico_drafts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "company_settings_read_all" ON public.company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "company_settings_admin_write" ON public.company_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ INDEXES ============
CREATE INDEX idx_jobs_client ON public.jobs(client_id);
CREATE INDEX idx_logged_hours_contractor ON public.logged_hours(contractor_id);
CREATE INDEX idx_logged_hours_job ON public.logged_hours(job_id);
CREATE INDEX idx_logged_hours_date ON public.logged_hours(date);
CREATE INDEX idx_purchases_job ON public.purchases(job_id);
CREATE INDEX idx_purchases_wholesaler ON public.purchases(wholesaler_id);
CREATE INDEX idx_purchase_line_items_purchase ON public.purchase_line_items(purchase_id);
CREATE INDEX idx_invoices_job ON public.invoices(job_id);
CREATE INDEX idx_invoices_client ON public.invoices(client_id);

-- ============ STORAGE POLICIES ============
CREATE POLICY "admin_storage_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('bolle','invoices','dico','schemi') AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin_storage_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('bolle','invoices','dico','schemi') AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin_storage_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('bolle','invoices','dico','schemi') AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin_storage_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('bolle','invoices','dico','schemi') AND public.has_role(auth.uid(),'admin'));

-- ============ PAGAMENTI OPERAI ============
CREATE TABLE public.pagamenti_operai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  mese DATE NOT NULL, -- first day of the month this covers
  ore_approvate NUMERIC(6,2) NOT NULL DEFAULT 0,
  importo_dovuto NUMERIC(10,2) NOT NULL DEFAULT 0,
  importo_pagato NUMERIC(10,2),
  data_pagamento DATE,
  metodo_pagamento TEXT CHECK (metodo_pagamento IN ('contanti','bonifico')),
  status TEXT NOT NULL DEFAULT 'da_pagare' CHECK (status IN ('da_pagare','pagato')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamenti_operai TO authenticated;
GRANT ALL ON public.pagamenti_operai TO service_role;
ALTER TABLE public.pagamenti_operai ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON public.pagamenti_operai
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============ TRANSAZIONI (future Nordigen integration) ============
CREATE TABLE public.transazioni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nordigen_transaction_id TEXT UNIQUE,
  data DATE NOT NULL,
  importo NUMERIC(10,2) NOT NULL,
  valuta TEXT NOT NULL DEFAULT 'EUR',
  controparte_nome TEXT,
  controparte_iban TEXT,
  descrizione TEXT,
  matched_fattura_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  matched_pagamento_id UUID REFERENCES public.pagamenti_operai(id) ON DELETE SET NULL,
  riconciliato BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transazioni TO authenticated;
GRANT ALL ON public.transazioni TO service_role;
ALTER TABLE public.transazioni ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON public.transazioni
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============ PUSH SUBSCRIPTIONS ============
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_subscriptions_own" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ REALTIME (logged_hours submission notifications) ============
ALTER TABLE public.logged_hours REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.logged_hours;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
