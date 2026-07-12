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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      game_config: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      game_timers: {
        Row: {
          created_at: string | null
          duration_ms: number
          id: string
          target_time: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms: number
          id: string
          target_time: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number
          id?: string
          target_time?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      thronglings: {
        Row: {
          accent_color: string
          body_color: string
          character_type: string | null
          created_at: string | null
          id: string
          is_alive: boolean
          name: string | null
          state: string
          updated_at: string | null
          vx: number
          vy: number
          x: number
          y: number
        }
        Insert: {
          accent_color: string
          body_color: string
          character_type?: string | null
          created_at?: string | null
          id: string
          is_alive?: boolean
          name?: string | null
          state: string
          updated_at?: string | null
          vx: number
          vy: number
          x: number
          y: number
        }
        Update: {
          accent_color?: string
          body_color?: string
          character_type?: string | null
          created_at?: string | null
          id?: string
          is_alive?: boolean
          name?: string | null
          state?: string
          updated_at?: string | null
          vx?: number
          vy?: number
          x?: number
          y?: number
        }
        Relationships: []
      }
      vip_wallets: {
        Row: {
          created_at: string | null
          id: string
          wallet_address: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          wallet_address: string
        }
        Update: {
          created_at?: string | null
          id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      wallet_actions: {
        Row: {
          action_date: string
          action_type: string
          count: number
          created_at: string | null
          id: string
          updated_at: string | null
          wallet_address: string
        }
        Insert: {
          action_date?: string
          action_type: string
          count?: number
          created_at?: string | null
          id?: string
          updated_at?: string | null
          wallet_address: string
        }
        Update: {
          action_date?: string
          action_type?: string
          count?: number
          created_at?: string | null
          id?: string
          updated_at?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      wallet_inventory: {
        Row: {
          created_at: string | null
          id: string
          quantity: number
          tool_id: string
          updated_at: string | null
          wallet_address: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          quantity?: number
          tool_id: string
          updated_at?: string | null
          wallet_address: string
        }
        Update: {
          created_at?: string | null
          id?: string
          quantity?: number
          tool_id?: string
          updated_at?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      weapon_events: {
        Row: {
          created_at: string
          id: string
          wallet_address: string | null
          weapon_type: string
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          id?: string
          wallet_address?: string | null
          weapon_type: string
          x: number
          y: number
        }
        Update: {
          created_at?: string
          id?: string
          wallet_address?: string | null
          weapon_type?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_use_free_action: {
        Args: {
          _action_type: string
          _max_per_day?: number
          _wallet_address: string
        }
        Returns: boolean
      }
      cleanup_old_weapon_events: { Args: never; Returns: undefined }
      get_throngling_count: { Args: never; Returns: number }
      is_population_limit_reached: { Args: never; Returns: boolean }
      is_vip_wallet: { Args: { _wallet_address: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
