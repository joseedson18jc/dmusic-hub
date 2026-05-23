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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          alimentacao: string | null
          briefing_musical: string | null
          cidade: string | null
          comissao: number | null
          contato_responsavel_pagamento: string | null
          contatos_local: string | null
          created_at: string
          custo_total: number | null
          data_evento: string | null
          data_pagamento: string | null
          data_sinal: string | null
          dj_id: string | null
          evento_nome: string | null
          evento_status: Database["public"]["Enums"]["evento_status"] | null
          evento_tipo: string | null
          fee_acordado: number | null
          fuso_horario: string | null
          gcal_sync_mode: string
          google_calendar_event_id: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          logistica: Json | null
          motivo_perda: string | null
          notas_internas: string | null
          pais: string | null
          prioridade_comercial: string | null
          probabilidade_fechamento: number | null
          producer_id: string
          proximo_passo: string | null
          reembolso_uber: number | null
          responsavel_id: string | null
          responsavel_pagamento: string | null
          saldo: number | null
          sinal: number | null
          status: Database["public"]["Enums"]["booking_status"]
          status_pagamento: Database["public"]["Enums"]["payment_status"] | null
          titulo: string
          transporte: string | null
          updated_at: string
          valor_liquido: number | null
          venue: string | null
        }
        Insert: {
          alimentacao?: string | null
          briefing_musical?: string | null
          cidade?: string | null
          comissao?: number | null
          contato_responsavel_pagamento?: string | null
          contatos_local?: string | null
          created_at?: string
          custo_total?: number | null
          data_evento?: string | null
          data_pagamento?: string | null
          data_sinal?: string | null
          dj_id?: string | null
          evento_nome?: string | null
          evento_status?: Database["public"]["Enums"]["evento_status"] | null
          evento_tipo?: string | null
          fee_acordado?: number | null
          fuso_horario?: string | null
          gcal_sync_mode?: string
          google_calendar_event_id?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          logistica?: Json | null
          motivo_perda?: string | null
          notas_internas?: string | null
          pais?: string | null
          prioridade_comercial?: string | null
          probabilidade_fechamento?: number | null
          producer_id: string
          proximo_passo?: string | null
          reembolso_uber?: number | null
          responsavel_id?: string | null
          responsavel_pagamento?: string | null
          saldo?: number | null
          sinal?: number | null
          status?: Database["public"]["Enums"]["booking_status"]
          status_pagamento?:
            | Database["public"]["Enums"]["payment_status"]
            | null
          titulo: string
          transporte?: string | null
          updated_at?: string
          valor_liquido?: number | null
          venue?: string | null
        }
        Update: {
          alimentacao?: string | null
          briefing_musical?: string | null
          cidade?: string | null
          comissao?: number | null
          contato_responsavel_pagamento?: string | null
          contatos_local?: string | null
          created_at?: string
          custo_total?: number | null
          data_evento?: string | null
          data_pagamento?: string | null
          data_sinal?: string | null
          dj_id?: string | null
          evento_nome?: string | null
          evento_status?: Database["public"]["Enums"]["evento_status"] | null
          evento_tipo?: string | null
          fee_acordado?: number | null
          fuso_horario?: string | null
          gcal_sync_mode?: string
          google_calendar_event_id?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          logistica?: Json | null
          motivo_perda?: string | null
          notas_internas?: string | null
          pais?: string | null
          prioridade_comercial?: string | null
          probabilidade_fechamento?: number | null
          producer_id?: string
          proximo_passo?: string | null
          reembolso_uber?: number | null
          responsavel_id?: string | null
          responsavel_pagamento?: string | null
          saldo?: number | null
          sinal?: number | null
          status?: Database["public"]["Enums"]["booking_status"]
          status_pagamento?:
            | Database["public"]["Enums"]["payment_status"]
            | null
          titulo?: string
          transporte?: string | null
          updated_at?: string
          valor_liquido?: number | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "djs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "public_djs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_producers"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_history: {
        Row: {
          action: string
          contract_id: string
          created_at: string
          details: Json | null
          id: string
          new_status: Database["public"]["Enums"]["contract_status"] | null
          old_status: Database["public"]["Enums"]["contract_status"] | null
          performed_by: string | null
          version: number | null
        }
        Insert: {
          action: string
          contract_id: string
          created_at?: string
          details?: Json | null
          id?: string
          new_status?: Database["public"]["Enums"]["contract_status"] | null
          old_status?: Database["public"]["Enums"]["contract_status"] | null
          performed_by?: string | null
          version?: number | null
        }
        Update: {
          action?: string
          contract_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          new_status?: Database["public"]["Enums"]["contract_status"] | null
          old_status?: Database["public"]["Enums"]["contract_status"] | null
          performed_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signatures: {
        Row: {
          contract_id: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          ip_address: string | null
          signature_data: string | null
          signed_at: string | null
          signer_email: string | null
          signer_name: string | null
          signer_role: string | null
          token: string
          user_agent: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signer_email?: string | null
          signer_name?: string | null
          signer_role?: string | null
          token: string
          user_agent?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signer_email?: string | null
          signer_name?: string | null
          signer_role?: string | null
          token?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          booking_id: string | null
          created_at: string
          created_by: string | null
          dj_id: string | null
          file_path: string | null
          file_url: string | null
          form_data: Json
          html_content: string | null
          id: string
          last_sent_at: string | null
          producer_id: string | null
          send_attempts: number
          status: Database["public"]["Enums"]["contract_status"]
          template_id: string
          template_name: string
          updated_at: string
          version: number
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          dj_id?: string | null
          file_path?: string | null
          file_url?: string | null
          form_data?: Json
          html_content?: string | null
          id?: string
          last_sent_at?: string | null
          producer_id?: string | null
          send_attempts?: number
          status?: Database["public"]["Enums"]["contract_status"]
          template_id: string
          template_name: string
          updated_at?: string
          version?: number
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          dj_id?: string | null
          file_path?: string | null
          file_url?: string | null
          form_data?: Json
          html_content?: string | null
          id?: string
          last_sent_at?: string | null
          producer_id?: string | null
          send_attempts?: number
          status?: Database["public"]["Enums"]["contract_status"]
          template_id?: string
          template_name?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "djs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "public_djs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_producers"
            referencedColumns: ["id"]
          },
        ]
      }
      djs: {
        Row: {
          bio_completa: string | null
          cidade: string | null
          comissao_gestao: number | null
          created_at: string
          dados_bancarios: Json | null
          data_nascimento: string | null
          documento: string | null
          email: string | null
          endereco: string | null
          equipamentos_necessarios: string | null
          equipamentos_proprios: string | null
          estilo_performance: string | null
          foto_url: string | null
          generos_musicais: string[] | null
          id: string
          idiomas: string[] | null
          instagram: string | null
          mini_bio: string | null
          nome_artistico: string
          nome_civil: string | null
          notas_internas: string | null
          observacoes_estrategicas: string | null
          pais: string | null
          pix: string | null
          preferencias_viagem: string | null
          press_kit_url: string | null
          restricoes: string | null
          rider_hospitalidade_url: string | null
          rider_tecnico_url: string | null
          score_confiabilidade: number | null
          soundcloud: string | null
          spotify: string | null
          status: Database["public"]["Enums"]["dj_status"]
          telefone: string | null
          tiktok: string | null
          updated_at: string
          user_id: string | null
          valor_cache_padrao: number | null
          valor_minimo: number | null
          whatsapp: string | null
          whatsapp_opt_in: boolean | null
          youtube: string | null
        }
        Insert: {
          bio_completa?: string | null
          cidade?: string | null
          comissao_gestao?: number | null
          created_at?: string
          dados_bancarios?: Json | null
          data_nascimento?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          equipamentos_necessarios?: string | null
          equipamentos_proprios?: string | null
          estilo_performance?: string | null
          foto_url?: string | null
          generos_musicais?: string[] | null
          id?: string
          idiomas?: string[] | null
          instagram?: string | null
          mini_bio?: string | null
          nome_artistico: string
          nome_civil?: string | null
          notas_internas?: string | null
          observacoes_estrategicas?: string | null
          pais?: string | null
          pix?: string | null
          preferencias_viagem?: string | null
          press_kit_url?: string | null
          restricoes?: string | null
          rider_hospitalidade_url?: string | null
          rider_tecnico_url?: string | null
          score_confiabilidade?: number | null
          soundcloud?: string | null
          spotify?: string | null
          status?: Database["public"]["Enums"]["dj_status"]
          telefone?: string | null
          tiktok?: string | null
          updated_at?: string
          user_id?: string | null
          valor_cache_padrao?: number | null
          valor_minimo?: number | null
          whatsapp?: string | null
          whatsapp_opt_in?: boolean | null
          youtube?: string | null
        }
        Update: {
          bio_completa?: string | null
          cidade?: string | null
          comissao_gestao?: number | null
          created_at?: string
          dados_bancarios?: Json | null
          data_nascimento?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          equipamentos_necessarios?: string | null
          equipamentos_proprios?: string | null
          estilo_performance?: string | null
          foto_url?: string | null
          generos_musicais?: string[] | null
          id?: string
          idiomas?: string[] | null
          instagram?: string | null
          mini_bio?: string | null
          nome_artistico?: string
          nome_civil?: string | null
          notas_internas?: string | null
          observacoes_estrategicas?: string | null
          pais?: string | null
          pix?: string | null
          preferencias_viagem?: string | null
          press_kit_url?: string | null
          restricoes?: string | null
          rider_hospitalidade_url?: string | null
          rider_tecnico_url?: string | null
          score_confiabilidade?: number | null
          soundcloud?: string | null
          spotify?: string | null
          status?: Database["public"]["Enums"]["dj_status"]
          telefone?: string | null
          tiktok?: string | null
          updated_at?: string
          user_id?: string | null
          valor_cache_padrao?: number | null
          valor_minimo?: number | null
          whatsapp?: string | null
          whatsapp_opt_in?: boolean | null
          youtube?: string | null
        }
        Relationships: []
      }
      financial_records: {
        Row: {
          booking_id: string | null
          categoria: string | null
          centro_custo: string | null
          comissao: number | null
          comprovante_url: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string | null
          dj_id: string | null
          id: string
          metodo_pagamento: string | null
          moeda: string | null
          notas: string | null
          payment_url: string | null
          producer_id: string | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          tipo: Database["public"]["Enums"]["financial_type"]
          updated_at: string
          valor_bruto: number
          valor_liquido: number | null
        }
        Insert: {
          booking_id?: string | null
          categoria?: string | null
          centro_custo?: string | null
          comissao?: number | null
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          dj_id?: string | null
          id?: string
          metodo_pagamento?: string | null
          moeda?: string | null
          notas?: string | null
          payment_url?: string | null
          producer_id?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          tipo: Database["public"]["Enums"]["financial_type"]
          updated_at?: string
          valor_bruto?: number
          valor_liquido?: number | null
        }
        Update: {
          booking_id?: string | null
          categoria?: string | null
          centro_custo?: string | null
          comissao?: number | null
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          dj_id?: string | null
          id?: string
          metodo_pagamento?: string | null
          moeda?: string | null
          notas?: string | null
          payment_url?: string | null
          producer_id?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          tipo?: Database["public"]["Enums"]["financial_type"]
          updated_at?: string
          valor_bruto?: number
          valor_liquido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_records_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "djs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "public_djs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_producers"
            referencedColumns: ["id"]
          },
        ]
      }
      gcal_sync_queue: {
        Row: {
          action: string
          attempts: number
          booking_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          last_http_status: number | null
          max_attempts: number
          next_retry_at: string
          payload: Json
          status: string
          target_user_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          attempts?: number
          booking_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_http_status?: number | null
          max_attempts?: number
          next_retry_at?: string
          payload?: Json
          status?: string
          target_user_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          attempts?: number
          booking_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_http_status?: number | null
          max_attempts?: number
          next_retry_at?: string
          payload?: Json
          status?: string
          target_user_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_sync_logs: {
        Row: {
          action: string
          booking_id: string | null
          created_at: string
          details: Json | null
          error_message: string | null
          google_event_id: string | null
          http_status: number | null
          id: string
          success: boolean
          timezone: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          booking_id?: string | null
          created_at?: string
          details?: Json | null
          error_message?: string | null
          google_event_id?: string | null
          http_status?: number | null
          id?: string
          success?: boolean
          timezone?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          booking_id?: string | null
          created_at?: string
          details?: Json | null
          error_message?: string | null
          google_event_id?: string | null
          http_status?: number | null
          id?: string
          success?: boolean
          timezone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          id: string
          refresh_token: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      manager_goals: {
        Row: {
          created_at: string
          id: string
          meta_bookings: number
          meta_receita: number
          updated_at: string
          user_id: string
          year_month: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta_bookings?: number
          meta_receita?: number
          updated_at?: string
          user_id: string
          year_month: string
        }
        Update: {
          created_at?: string
          id?: string
          meta_bookings?: number
          meta_receita?: number
          updated_at?: string
          user_id?: string
          year_month?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          lida: boolean | null
          mensagem: string | null
          tipo: string | null
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          lida?: boolean | null
          mensagem?: string | null
          tipo?: string | null
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          lida?: boolean | null
          mensagem?: string | null
          tipo?: string | null
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      producer_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
          notas: string | null
          papel: Database["public"]["Enums"]["contact_role"]
          producer_id: string
          telefone: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          notas?: string | null
          papel: Database["public"]["Enums"]["contact_role"]
          producer_id: string
          telefone?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          notas?: string | null
          papel?: Database["public"]["Enums"]["contact_role"]
          producer_id?: string
          telefone?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producer_contacts_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producer_contacts_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_producers"
            referencedColumns: ["id"]
          },
        ]
      }
      producers: {
        Row: {
          cidade: string | null
          condicoes_comerciais: string | null
          contato_principal: string | null
          created_at: string
          dados_bancarios: Json | null
          dados_fiscais: Json | null
          email: string | null
          empresa: string | null
          forma_pagamento: string | null
          id: string
          idiomas: string[] | null
          instagram: string | null
          nome: string
          notas_internas: string | null
          origem_relacionamento: string | null
          owner_id: string | null
          pais: string | null
          papeis_comerciais:
            | Database["public"]["Enums"]["producer_commercial_role"][]
            | null
          proxima_acao: string | null
          score_confiabilidade: number | null
          score_saude: number | null
          site: string | null
          status_relacionamento: string | null
          stripe_customer_id: string | null
          tags: string[] | null
          telefone: string | null
          tipo_produtor: string | null
          ultimo_contato: string | null
          updated_at: string
          whatsapp: string | null
          whatsapp_opt_in: boolean | null
        }
        Insert: {
          cidade?: string | null
          condicoes_comerciais?: string | null
          contato_principal?: string | null
          created_at?: string
          dados_bancarios?: Json | null
          dados_fiscais?: Json | null
          email?: string | null
          empresa?: string | null
          forma_pagamento?: string | null
          id?: string
          idiomas?: string[] | null
          instagram?: string | null
          nome: string
          notas_internas?: string | null
          origem_relacionamento?: string | null
          owner_id?: string | null
          pais?: string | null
          papeis_comerciais?:
            | Database["public"]["Enums"]["producer_commercial_role"][]
            | null
          proxima_acao?: string | null
          score_confiabilidade?: number | null
          score_saude?: number | null
          site?: string | null
          status_relacionamento?: string | null
          stripe_customer_id?: string | null
          tags?: string[] | null
          telefone?: string | null
          tipo_produtor?: string | null
          ultimo_contato?: string | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_opt_in?: boolean | null
        }
        Update: {
          cidade?: string | null
          condicoes_comerciais?: string | null
          contato_principal?: string | null
          created_at?: string
          dados_bancarios?: Json | null
          dados_fiscais?: Json | null
          email?: string | null
          empresa?: string | null
          forma_pagamento?: string | null
          id?: string
          idiomas?: string[] | null
          instagram?: string | null
          nome?: string
          notas_internas?: string | null
          origem_relacionamento?: string | null
          owner_id?: string | null
          pais?: string | null
          papeis_comerciais?:
            | Database["public"]["Enums"]["producer_commercial_role"][]
            | null
          proxima_acao?: string | null
          score_confiabilidade?: number | null
          score_saude?: number | null
          site?: string | null
          status_relacionamento?: string | null
          stripe_customer_id?: string | null
          tags?: string[] | null
          telefone?: string | null
          tipo_produtor?: string | null
          ultimo_contato?: string | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_opt_in?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rider_equipment: {
        Row: {
          artista_traz: boolean
          categoria: string
          created_at: string
          descricao: string | null
          fornecido_venue: boolean
          id: string
          nome: string
          notas: string | null
          obrigatorio: boolean
          ordem: number
          quantidade: number
          rider_id: string
        }
        Insert: {
          artista_traz?: boolean
          categoria?: string
          created_at?: string
          descricao?: string | null
          fornecido_venue?: boolean
          id?: string
          nome: string
          notas?: string | null
          obrigatorio?: boolean
          ordem?: number
          quantidade?: number
          rider_id: string
        }
        Update: {
          artista_traz?: boolean
          categoria?: string
          created_at?: string
          descricao?: string | null
          fornecido_venue?: boolean
          id?: string
          nome?: string
          notas?: string | null
          obrigatorio?: boolean
          ordem?: number
          quantidade?: number
          rider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_equipment_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "technical_riders"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      tasks: {
        Row: {
          booking_id: string | null
          concluida_em: string | null
          created_at: string
          descricao: string | null
          dj_id: string | null
          id: string
          prazo: string | null
          prioridade: Database["public"]["Enums"]["task_priority"]
          producer_id: string | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          concluida_em?: string | null
          created_at?: string
          descricao?: string | null
          dj_id?: string | null
          id?: string
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["task_priority"]
          producer_id?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          concluida_em?: string | null
          created_at?: string
          descricao?: string | null
          dj_id?: string | null
          id?: string
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["task_priority"]
          producer_id?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "djs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "public_djs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "public_producers"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_riders: {
        Row: {
          created_at: string
          dj_id: string
          id: string
          nome: string
          notas: string | null
          stage_plot_data: Json | null
          stage_plot_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dj_id: string
          id?: string
          nome?: string
          notas?: string | null
          stage_plot_data?: Json | null
          stage_plot_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dj_id?: string
          id?: string
          nome?: string
          notas?: string | null
          stage_plot_data?: Json | null
          stage_plot_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_riders_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "djs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_riders_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "public_djs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          booking_id: string | null
          created_at: string
          dj_id: string | null
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          id: string
          producer_id: string | null
          recipient_name: string | null
          recipient_phone: string
          sent_by: string | null
          status: string
          template_id: string
          twilio_sid: string | null
          variables: Json | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          dj_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          producer_id?: string | null
          recipient_name?: string | null
          recipient_phone: string
          sent_by?: string | null
          status?: string
          template_id: string
          twilio_sid?: string | null
          variables?: Json | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          dj_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          producer_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          sent_by?: string | null
          status?: string
          template_id?: string
          twilio_sid?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      whatsapp_queue: {
        Row: {
          attempts: number
          booking_id: string | null
          created_at: string
          created_by: string | null
          dj_id: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          last_error: string | null
          max_attempts: number
          message_id: string | null
          next_retry_at: string | null
          producer_id: string | null
          recipient_name: string | null
          recipient_phone: string
          scheduled_for: string
          status: string
          template_id: string
          updated_at: string
          variables: Json
        }
        Insert: {
          attempts?: number
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          dj_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number
          message_id?: string | null
          next_retry_at?: string | null
          producer_id?: string | null
          recipient_name?: string | null
          recipient_phone: string
          scheduled_for?: string
          status?: string
          template_id: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          attempts?: number
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          dj_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number
          message_id?: string | null
          next_retry_at?: string | null
          producer_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          scheduled_for?: string
          status?: string
          template_id?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
    }
    Views: {
      public_djs: {
        Row: {
          bio_completa: string | null
          cidade: string | null
          created_at: string | null
          estilo_performance: string | null
          foto_url: string | null
          generos_musicais: string[] | null
          id: string | null
          idiomas: string[] | null
          instagram: string | null
          mini_bio: string | null
          nome_artistico: string | null
          pais: string | null
          press_kit_url: string | null
          score_confiabilidade: number | null
          soundcloud: string | null
          spotify: string | null
          status: Database["public"]["Enums"]["dj_status"] | null
          tiktok: string | null
          youtube: string | null
        }
        Insert: {
          bio_completa?: string | null
          cidade?: string | null
          created_at?: string | null
          estilo_performance?: string | null
          foto_url?: string | null
          generos_musicais?: string[] | null
          id?: string | null
          idiomas?: string[] | null
          instagram?: string | null
          mini_bio?: string | null
          nome_artistico?: string | null
          pais?: string | null
          press_kit_url?: string | null
          score_confiabilidade?: number | null
          soundcloud?: string | null
          spotify?: string | null
          status?: Database["public"]["Enums"]["dj_status"] | null
          tiktok?: string | null
          youtube?: string | null
        }
        Update: {
          bio_completa?: string | null
          cidade?: string | null
          created_at?: string | null
          estilo_performance?: string | null
          foto_url?: string | null
          generos_musicais?: string[] | null
          id?: string | null
          idiomas?: string[] | null
          instagram?: string | null
          mini_bio?: string | null
          nome_artistico?: string | null
          pais?: string | null
          press_kit_url?: string | null
          score_confiabilidade?: number | null
          soundcloud?: string | null
          spotify?: string | null
          status?: Database["public"]["Enums"]["dj_status"] | null
          tiktok?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      public_producers: {
        Row: {
          cidade: string | null
          created_at: string | null
          empresa: string | null
          id: string | null
          instagram: string | null
          nome: string | null
          pais: string | null
          papeis_comerciais:
            | Database["public"]["Enums"]["producer_commercial_role"][]
            | null
          site: string | null
          status_relacionamento: string | null
          tags: string[] | null
          tipo_produtor: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string | null
          empresa?: string | null
          id?: string | null
          instagram?: string | null
          nome?: string | null
          pais?: string | null
          papeis_comerciais?:
            | Database["public"]["Enums"]["producer_commercial_role"][]
            | null
          site?: string | null
          status_relacionamento?: string | null
          tags?: string[] | null
          tipo_produtor?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string | null
          empresa?: string | null
          id?: string | null
          instagram?: string | null
          nome?: string | null
          pais?: string | null
          papeis_comerciais?:
            | Database["public"]["Enums"]["producer_commercial_role"][]
            | null
          site?: string | null
          status_relacionamento?: string | null
          tags?: string[] | null
          tipo_produtor?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      contract_register_send: {
        Args: { _contract_id: string; _cooldown_seconds?: number }
        Returns: Json
      }
      get_automation_rules: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_automation_enabled: { Args: { _channel: string }; Returns: boolean }
      supported_timezones: { Args: never; Returns: string[] }
      upsert_contract_template: {
        Args: { _html: string; _id: string; _name: string }
        Returns: Json
      }
      validate_contract_templates: {
        Args: { _value: Json }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "finance" | "dj"
      booking_status:
        | "novo_lead"
        | "qualificado"
        | "briefing_recebido"
        | "proposta_enviada"
        | "negociacao"
        | "aguardando_aprovacao"
        | "contrato_enviado"
        | "assinatura_pendente"
        | "sinal_pendente"
        | "confirmado"
        | "planejamento"
        | "pronto_para_evento"
        | "evento_realizado"
        | "pagamento_final_pendente"
        | "repasse_pendente"
        | "fechado_ganho"
        | "fechado_perdido"
      contact_role:
        | "financeiro"
        | "operacional"
        | "booking"
        | "juridico"
        | "assistente"
        | "socio"
      contract_status:
        | "rascunho"
        | "enviado"
        | "assinado"
        | "cancelado"
        | "expirado"
      dj_status: "ativo" | "pausa" | "indisponivel"
      evento_status: "confirmado" | "a_confirmar" | "adiado" | "cancelado"
      financial_type:
        | "receita"
        | "despesa"
        | "sinal"
        | "pagamento_final"
        | "parcela"
        | "repasse_dj"
        | "repasse_produtor"
        | "comissao"
        | "imposto"
        | "reembolso"
        | "cancelamento"
        | "multa"
        | "chargeback"
        | "ajuste"
      payment_status:
        | "pendente"
        | "parcial"
        | "pago"
        | "vencido"
        | "cancelado"
        | "em_disputa"
        | "reembolsado"
        | "falhou"
      producer_commercial_role:
        | "contratante"
        | "intermediador"
        | "promoter"
        | "agencia"
        | "parceiro_estrategico"
        | "produtor_executivo"
        | "responsavel_financeiro"
      task_priority: "baixa" | "media" | "alta"
      task_status:
        | "a_fazer"
        | "em_andamento"
        | "aguardando_terceiro"
        | "concluida"
        | "atrasada"
        | "cancelada"
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
      app_role: ["super_admin", "admin", "finance", "dj"],
      booking_status: [
        "novo_lead",
        "qualificado",
        "briefing_recebido",
        "proposta_enviada",
        "negociacao",
        "aguardando_aprovacao",
        "contrato_enviado",
        "assinatura_pendente",
        "sinal_pendente",
        "confirmado",
        "planejamento",
        "pronto_para_evento",
        "evento_realizado",
        "pagamento_final_pendente",
        "repasse_pendente",
        "fechado_ganho",
        "fechado_perdido",
      ],
      contact_role: [
        "financeiro",
        "operacional",
        "booking",
        "juridico",
        "assistente",
        "socio",
      ],
      contract_status: [
        "rascunho",
        "enviado",
        "assinado",
        "cancelado",
        "expirado",
      ],
      dj_status: ["ativo", "pausa", "indisponivel"],
      evento_status: ["confirmado", "a_confirmar", "adiado", "cancelado"],
      financial_type: [
        "receita",
        "despesa",
        "sinal",
        "pagamento_final",
        "parcela",
        "repasse_dj",
        "repasse_produtor",
        "comissao",
        "imposto",
        "reembolso",
        "cancelamento",
        "multa",
        "chargeback",
        "ajuste",
      ],
      payment_status: [
        "pendente",
        "parcial",
        "pago",
        "vencido",
        "cancelado",
        "em_disputa",
        "reembolsado",
        "falhou",
      ],
      producer_commercial_role: [
        "contratante",
        "intermediador",
        "promoter",
        "agencia",
        "parceiro_estrategico",
        "produtor_executivo",
        "responsavel_financeiro",
      ],
      task_priority: ["baixa", "media", "alta"],
      task_status: [
        "a_fazer",
        "em_andamento",
        "aguardando_terceiro",
        "concluida",
        "atrasada",
        "cancelada",
      ],
    },
  },
} as const
