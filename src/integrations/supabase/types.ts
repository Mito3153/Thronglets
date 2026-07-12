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
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          sender_id: string | null
          sender_name: string | null
          throngling_id: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          sender_id?: string | null
          sender_name?: string | null
          throngling_id: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          sender_id?: string | null
          sender_name?: string | null
          throngling_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_throngling_id_fkey"
            columns: ["throngling_id"]
            isOneToOne: false
            referencedRelation: "thronglings"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          created_at: string
          id: string
          kind: string
          lamports: number
          tx_sig: string
          wallet: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          lamports: number
          tx_sig: string
          wallet: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          lamports?: number
          tx_sig?: string
          wallet?: string
        }
        Relationships: []
      }
      thronglings: {
        Row: {
          accent_color: string
          body_color: string
          character_type: string
          chat_lock_expires_at: string | null
          chat_locked_by: string | null
          created_at: string
          current_task: string | null
          evolution: string | null
          id: string
          is_alive: boolean
          memory: Json
          mood: number
          name: string | null
          persona: Json | null
          persona_prompt: string | null
          relationships: Json
          spawned_by: string | null
          state: string
          vx: number
          vy: number
          x: number
          y: number
        }
        Insert: {
          accent_color?: string
          body_color?: string
          character_type?: string
          chat_lock_expires_at?: string | null
          chat_locked_by?: string | null
          created_at?: string
          current_task?: string | null
          evolution?: string | null
          id: string
          is_alive?: boolean
          memory?: Json
          mood?: number
          name?: string | null
          persona?: Json | null
          persona_prompt?: string | null
          relationships?: Json
          spawned_by?: string | null
          state?: string
          vx?: number
          vy?: number
          x?: number
          y?: number
        }
        Update: {
          accent_color?: string
          body_color?: string
          character_type?: string
          chat_lock_expires_at?: string | null
          chat_locked_by?: string | null
          created_at?: string
          current_task?: string | null
          evolution?: string | null
          id?: string
          is_alive?: boolean
          memory?: Json
          mood?: number
          name?: string | null
          persona?: Json | null
          persona_prompt?: string | null
          relationships?: Json
          spawned_by?: string | null
          state?: string
          vx?: number
          vy?: number
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
      claim_throngling_chat: {
        Args: {
          _claimer: string
          _throngling_id: string
          _ttl_seconds?: number
        }
        Returns: boolean
      }
      refresh_throngling_chat: {
        Args: {
          _claimer: string
          _throngling_id: string
          _ttl_seconds?: number
        }
        Returns: boolean
      }
      release_throngling_chat: {
        Args: { _claimer: string; _throngling_id: string }
        Returns: undefined
      }
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
