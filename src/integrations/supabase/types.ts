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
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          postcode: string
          state: string
          streak_days: number
          streak_label: string | null
          suburb: string | null
          view_mode: string
          year_level: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          postcode: string
          state: string
          streak_days?: number
          streak_label?: string | null
          suburb?: string | null
          view_mode?: string
          year_level?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          postcode?: string
          state?: string
          streak_days?: number
          streak_label?: string | null
          suburb?: string | null
          view_mode?: string
          year_level?: string | null
        }
        Relationships: []
      }
      scholarships: {
        Row: {
          acara_id: string | null
          application_close_date: string | null
          application_fee: string | null
          application_open_date: string | null
          category: string | null
          closing_label: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          dataset_type: string
          days_left: string | null
          description: string | null
          eligibility_criteria: string | null
          extraction_confidence_score: string | null
          gender: string | null
          gender_eligibility: string | null
          id: string
          is_active: string | null
          last_verified_at: string | null
          number_awarded: string | null
          overview: string | null
          postcode: string | null
          program_name: string | null
          program_type: string | null
          row_number: number | null
          scholarship_confidence: string | null
          scholarship_url: string | null
          school_name: string
          school_sector: string | null
          school_type: string | null
          sector: string | null
          special_conditions: string | null
          state: string | null
          sub_type: string | null
          suburb: string | null
          test_month: string | null
          test_provider: string | null
          url_status: string | null
          value_aud: string | null
          value_num: string | null
          value_type: string | null
          website_url: string | null
          year_levels: string | null
        }
        Insert: {
          acara_id?: string | null
          application_close_date?: string | null
          application_fee?: string | null
          application_open_date?: string | null
          category?: string | null
          closing_label?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          dataset_type?: string
          days_left?: string | null
          description?: string | null
          eligibility_criteria?: string | null
          extraction_confidence_score?: string | null
          gender?: string | null
          gender_eligibility?: string | null
          id?: string
          is_active?: string | null
          last_verified_at?: string | null
          number_awarded?: string | null
          overview?: string | null
          postcode?: string | null
          program_name?: string | null
          program_type?: string | null
          row_number?: number | null
          scholarship_confidence?: string | null
          scholarship_url?: string | null
          school_name: string
          school_sector?: string | null
          school_type?: string | null
          sector?: string | null
          special_conditions?: string | null
          state?: string | null
          sub_type?: string | null
          suburb?: string | null
          test_month?: string | null
          test_provider?: string | null
          url_status?: string | null
          value_aud?: string | null
          value_num?: string | null
          value_type?: string | null
          website_url?: string | null
          year_levels?: string | null
        }
        Update: {
          acara_id?: string | null
          application_close_date?: string | null
          application_fee?: string | null
          application_open_date?: string | null
          category?: string | null
          closing_label?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          dataset_type?: string
          days_left?: string | null
          description?: string | null
          eligibility_criteria?: string | null
          extraction_confidence_score?: string | null
          gender?: string | null
          gender_eligibility?: string | null
          id?: string
          is_active?: string | null
          last_verified_at?: string | null
          number_awarded?: string | null
          overview?: string | null
          postcode?: string | null
          program_name?: string | null
          program_type?: string | null
          row_number?: number | null
          scholarship_confidence?: string | null
          scholarship_url?: string | null
          school_name?: string
          school_sector?: string | null
          school_type?: string | null
          sector?: string | null
          special_conditions?: string | null
          state?: string | null
          sub_type?: string | null
          suburb?: string | null
          test_month?: string | null
          test_provider?: string | null
          url_status?: string | null
          value_aud?: string | null
          value_num?: string | null
          value_type?: string | null
          website_url?: string | null
          year_levels?: string | null
        }
        Relationships: []
      }
      shortlisted_schools: {
        Row: {
          created_at: string
          id: string
          school_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          school_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          school_id?: string
          user_id?: string
        }
        Relationships: []
      }
      student_academic: {
        Row: {
          created_at: string
          grade_scale: string | null
          grade_value: string | null
          id: string
          naplan_band: string | null
          scholarship_score: string | null
          scholarship_test: string | null
          state: string
          subject: string
          user_id: string
          year_level: string
        }
        Insert: {
          created_at?: string
          grade_scale?: string | null
          grade_value?: string | null
          id?: string
          naplan_band?: string | null
          scholarship_score?: string | null
          scholarship_test?: string | null
          state: string
          subject: string
          user_id: string
          year_level: string
        }
        Update: {
          created_at?: string
          grade_scale?: string | null
          grade_value?: string | null
          id?: string
          naplan_band?: string | null
          scholarship_score?: string | null
          scholarship_test?: string | null
          state?: string
          subject?: string
          user_id?: string
          year_level?: string
        }
        Relationships: []
      }
      student_badges: {
        Row: {
          badge_code: string
          earned_at: string
          evidence_link: string | null
          id: string
          tier: Database["public"]["Enums"]["readiness_band"] | null
          user_id: string
        }
        Insert: {
          badge_code: string
          earned_at?: string
          evidence_link?: string | null
          id?: string
          tier?: Database["public"]["Enums"]["readiness_band"] | null
          user_id: string
        }
        Update: {
          badge_code?: string
          earned_at?: string
          evidence_link?: string | null
          id?: string
          tier?: Database["public"]["Enums"]["readiness_band"] | null
          user_id?: string
        }
        Relationships: []
      }
      student_dimensions: {
        Row: {
          confidence: string
          dimension: Database["public"]["Enums"]["readiness_dimension"]
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: string
          dimension: Database["public"]["Enums"]["readiness_dimension"]
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: string
          dimension?: Database["public"]["Enums"]["readiness_dimension"]
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_evidence: {
        Row: {
          created_at: string
          evidence_type: string
          file_url: string | null
          id: string
          title: string | null
          user_id: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string
          evidence_type: string
          file_url?: string | null
          id?: string
          title?: string | null
          user_id: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string
          evidence_type?: string
          file_url?: string | null
          id?: string
          title?: string | null
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      student_extracurriculars: {
        Row: {
          activity_name: string
          category: string
          created_at: string
          id: string
          level: Database["public"]["Enums"]["achievement_level"] | null
          notes: string | null
          user_id: string
          years_participated: number | null
        }
        Insert: {
          activity_name: string
          category: string
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["achievement_level"] | null
          notes?: string | null
          user_id: string
          years_participated?: number | null
        }
        Update: {
          activity_name?: string
          category?: string
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["achievement_level"] | null
          notes?: string | null
          user_id?: string
          years_participated?: number | null
        }
        Relationships: []
      }
      student_points_log: {
        Row: {
          activity_code: string
          created_at: string
          dimension: Database["public"]["Enums"]["readiness_dimension"]
          id: string
          note: string | null
          points: number
          user_id: string
        }
        Insert: {
          activity_code: string
          created_at?: string
          dimension: Database["public"]["Enums"]["readiness_dimension"]
          id?: string
          note?: string | null
          points: number
          user_id: string
        }
        Update: {
          activity_code?: string
          created_at?: string
          dimension?: Database["public"]["Enums"]["readiness_dimension"]
          id?: string
          note?: string | null
          points?: number
          user_id?: string
        }
        Relationships: []
      }
      student_profile: {
        Row: {
          boarding_preference: string | null
          citizenship: string | null
          created_at: string
          current_step: number
          fee_tolerance: string | null
          indigenous_status: string | null
          onboarding_completed: boolean
          regional_classification: string | null
          religious_affiliation: string | null
          sibling_enrolled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          boarding_preference?: string | null
          citizenship?: string | null
          created_at?: string
          current_step?: number
          fee_tolerance?: string | null
          indigenous_status?: string | null
          onboarding_completed?: boolean
          regional_classification?: string | null
          religious_affiliation?: string | null
          sibling_enrolled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          boarding_preference?: string | null
          citizenship?: string | null
          created_at?: string
          current_step?: number
          fee_tolerance?: string | null
          indigenous_status?: string | null
          onboarding_completed?: boolean
          regional_classification?: string | null
          religious_affiliation?: string | null
          sibling_enrolled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_streaks: {
        Row: {
          current_count: number
          last_activity_at: string | null
          longest_count: number
          streak_type: string
          user_id: string
        }
        Insert: {
          current_count?: number
          last_activity_at?: string | null
          longest_count?: number
          streak_type: string
          user_id: string
        }
        Update: {
          current_count?: number
          last_activity_at?: string | null
          longest_count?: number
          streak_type?: string
          user_id?: string
        }
        Relationships: []
      }
      student_target_schools: {
        Row: {
          boarding_preference: string | null
          created_at: string
          id: string
          is_selective: boolean | null
          label: Database["public"]["Enums"]["target_label"] | null
          school_id: string | null
          school_name: string
          user_id: string
        }
        Insert: {
          boarding_preference?: string | null
          created_at?: string
          id?: string
          is_selective?: boolean | null
          label?: Database["public"]["Enums"]["target_label"] | null
          school_id?: string | null
          school_name: string
          user_id: string
        }
        Update: {
          boarding_preference?: string | null
          created_at?: string
          id?: string
          is_selective?: boolean | null
          label?: Database["public"]["Enums"]["target_label"] | null
          school_id?: string | null
          school_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_interests: {
        Row: {
          category: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compute_band: {
        Args: { score: number }
        Returns: Database["public"]["Enums"]["readiness_band"]
      }
      profile_completeness: { Args: { _user_id: string }; Returns: number }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      achievement_level:
        | "school"
        | "regional"
        | "state"
        | "national"
        | "international"
      readiness_band: "earth" | "water" | "fire" | "air" | "aether"
      readiness_dimension:
        | "academic"
        | "leadership"
        | "service"
        | "co_curricular"
        | "interview"
        | "materials"
        | "verification"
      target_label: "best_fit" | "stretch" | "reach" | "safety"
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
      achievement_level: [
        "school",
        "regional",
        "state",
        "national",
        "international",
      ],
      readiness_band: ["earth", "water", "fire", "air", "aether"],
      readiness_dimension: [
        "academic",
        "leadership",
        "service",
        "co_curricular",
        "interview",
        "materials",
        "verification",
      ],
      target_label: ["best_fit", "stretch", "reach", "safety"],
    },
  },
} as const
