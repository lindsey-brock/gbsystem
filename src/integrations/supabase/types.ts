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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          codice_fiscale: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          partita_iva: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          codice_fiscale?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          partita_iva?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          codice_fiscale?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          partita_iva?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          codice_fiscale: string | null
          company_name: string | null
          email: string | null
          id: string
          legal_rep_name: string | null
          partita_iva: string | null
          phone: string | null
          responsabile_tecnico_name: string | null
          responsabile_tecnico_qualification: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          codice_fiscale?: string | null
          company_name?: string | null
          email?: string | null
          id?: string
          legal_rep_name?: string | null
          partita_iva?: string | null
          phone?: string | null
          responsabile_tecnico_name?: string | null
          responsabile_tecnico_qualification?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          codice_fiscale?: string | null
          company_name?: string | null
          email?: string | null
          id?: string
          legal_rep_name?: string | null
          partita_iva?: string | null
          phone?: string | null
          responsabile_tecnico_name?: string | null
          responsabile_tecnico_qualification?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contractors: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          hourly_rate: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          hourly_rate?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          hourly_rate?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      dico_drafts: {
        Row: {
          client_address: string | null
          client_name: string | null
          created_at: string
          id: string
          installer_company_name: string | null
          installer_legal_rep_name: string | null
          intervention_type:
            | Database["public"]["Enums"]["intervention_type"]
            | null
          job_id: string
          materials_report_generated: boolean
          notes: string | null
          pdf_url: string | null
          property_use: string | null
          responsabile_tecnico_name: string | null
          responsabile_tecnico_qualification: string | null
          schema_planimetrico_url: string | null
          status: Database["public"]["Enums"]["dico_status"]
          technical_norms_followed: string | null
          updated_at: string
        }
        Insert: {
          client_address?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          installer_company_name?: string | null
          installer_legal_rep_name?: string | null
          intervention_type?:
            | Database["public"]["Enums"]["intervention_type"]
            | null
          job_id: string
          materials_report_generated?: boolean
          notes?: string | null
          pdf_url?: string | null
          property_use?: string | null
          responsabile_tecnico_name?: string | null
          responsabile_tecnico_qualification?: string | null
          schema_planimetrico_url?: string | null
          status?: Database["public"]["Enums"]["dico_status"]
          technical_norms_followed?: string | null
          updated_at?: string
        }
        Update: {
          client_address?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          installer_company_name?: string | null
          installer_legal_rep_name?: string | null
          intervention_type?:
            | Database["public"]["Enums"]["intervention_type"]
            | null
          job_id?: string
          materials_report_generated?: boolean
          notes?: string | null
          pdf_url?: string | null
          property_use?: string | null
          responsabile_tecnico_name?: string | null
          responsabile_tecnico_qualification?: string | null
          schema_planimetrico_url?: string | null
          status?: Database["public"]["Enums"]["dico_status"]
          technical_norms_followed?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dico_drafts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_sources: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          source_id: string
          source_type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id: string
          source_id: string
          source_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          source_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_sources_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string
          grand_total: number
          id: string
          invoice_date: string
          invoice_number: string | null
          job_id: string
          labor_total: number
          markup_percentage: number
          markup_total: number
          materials_total: number
          notes: string | null
          pdf_url: string | null
          sdi_xml_url: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          job_id: string
          labor_total?: number
          markup_percentage?: number
          markup_total?: number
          materials_total?: number
          notes?: string | null
          pdf_url?: string | null
          sdi_xml_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          job_id?: string
          labor_total?: number
          markup_percentage?: number
          markup_total?: number
          materials_total?: number
          notes?: string | null
          pdf_url?: string | null
          sdi_xml_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          client_id: string
          created_at: string
          end_date: string | null
          id: string
          job_name: string
          notes: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          job_name: string
          notes?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          job_name?: string
          notes?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      logged_hours: {
        Row: {
          approved: boolean
          approved_at: string | null
          client_missing_flag: boolean
          client_missing_note: string | null
          contractor_id: string
          created_at: string
          date: string
          description: string | null
          hours: number
          id: string
          job_id: string | null
          submitted: boolean
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          client_missing_flag?: boolean
          client_missing_note?: string | null
          contractor_id: string
          created_at?: string
          date: string
          description?: string | null
          hours: number
          id?: string
          job_id?: string | null
          submitted?: boolean
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          client_missing_flag?: boolean
          client_missing_note?: string | null
          contractor_id?: string
          created_at?: string
          date?: string
          description?: string | null
          hours?: number
          id?: string
          job_id?: string | null
          submitted?: boolean
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logged_hours_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logged_hours_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          contractor_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          contractor_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          contractor_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_line_items: {
        Row: {
          created_at: string
          id: string
          item_description: string
          manufacturer_code: string | null
          purchase_id: string
          quantity: number
          technical_spec: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_description: string
          manufacturer_code?: string | null
          purchase_id: string
          quantity?: number
          technical_spec?: string | null
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_description?: string
          manufacturer_code?: string | null
          purchase_id?: string
          quantity?: number
          technical_spec?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_line_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          bolla_number: string | null
          created_at: string
          id: string
          job_id: string | null
          notes: string | null
          purchase_date: string
          raw_file_url: string | null
          updated_at: string
          wholesaler_id: string
        }
        Insert: {
          bolla_number?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          notes?: string | null
          purchase_date: string
          raw_file_url?: string | null
          updated_at?: string
          wholesaler_id: string
        }
        Update: {
          bolla_number?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          notes?: string | null
          purchase_date?: string
          raw_file_url?: string | null
          updated_at?: string
          wholesaler_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_wholesaler_id_fkey"
            columns: ["wholesaler_id"]
            isOneToOne: false
            referencedRelation: "wholesalers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wholesalers: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          system_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          system_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          system_type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_contractor_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "contractor"
      dico_status: "draft" | "ready_for_review" | "finalized_offline"
      intervention_type:
        | "nuovo_impianto"
        | "trasformazione"
        | "ampliamento"
        | "manutenzione_straordinaria"
      invoice_status: "draft" | "sent" | "paid"
      job_status: "active" | "completed" | "invoiced"
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
      app_role: ["admin", "contractor"],
      dico_status: ["draft", "ready_for_review", "finalized_offline"],
      intervention_type: [
        "nuovo_impianto",
        "trasformazione",
        "ampliamento",
        "manutenzione_straordinaria",
      ],
      invoice_status: ["draft", "sent", "paid"],
      job_status: ["active", "completed", "invoiced"],
    },
  },
} as const
