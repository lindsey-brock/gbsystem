-- Worker payment tracking
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

-- Bank transaction storage (for future Nordigen integration)
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
