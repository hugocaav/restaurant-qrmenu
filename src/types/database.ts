export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          name: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["restaurants"]["Row"]>;
        Relationships: [];
      };
      tables: {
        Row: {
          id: string;
          restaurant_id: string;
          table_number: number;
          session_token: string | null;
          session_expires_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_number: number;
          session_token?: string | null;
          session_expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tables"]["Row"]>;
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          description: string;
          price: number;
          category:
            | "non_alcoholic"
            | "mixology"
            | "entradas"
            | "platos_fuertes"
            | "postres"
            | "drinks"
            | "food"
            | "desserts";
          image_urls: string[];
          allergens: string[];
          is_available: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          description: string;
          price: number;
          category:
            | "non_alcoholic"
            | "mixology"
            | "entradas"
            | "platos_fuertes"
            | "postres"
            | "drinks"
            | "food"
            | "desserts";
          image_urls?: string[];
          allergens?: string[];
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["menu_items"]["Row"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          restaurant_id: string;
          table_id: string;
          session_token: string;
          items: Json;
          allergy_notes: string | null;
          notes: string | null;
          status: "pending" | "preparing" | "ready" | "delivered";
          subtotal: number;
          tax: number;
          total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_id: string;
          session_token: string;
          items: Json;
          allergy_notes?: string | null;
          notes?: string | null;
          status?: "pending" | "preparing" | "ready" | "delivered";
          subtotal: number;
          tax?: number;
          total: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
        Relationships: [];
      };
      users_public: {
        Row: {
          id: string;
          restaurant_id: string | null;
          email: string;
          role: string;
          full_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          restaurant_id?: string | null;
          email: string;
          role: string;
          full_name: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users_public"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      ensure_table_session: {
        Args: {
          p_table_id: string;
          p_restaurant_id: string;
          p_duration_ms: number;
          p_threshold_ms: number;
        };
        Returns: {
          session_token: string;
          session_expires_at: string | null;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
