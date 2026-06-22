
CREATE POLICY "admin_storage_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('bolle','invoices','dico','schemi') AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin_storage_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('bolle','invoices','dico','schemi') AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin_storage_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('bolle','invoices','dico','schemi') AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin_storage_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('bolle','invoices','dico','schemi') AND public.has_role(auth.uid(),'admin'));
