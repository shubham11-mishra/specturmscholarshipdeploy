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
      application_checklist_items: {
        Row: {
          application_id: string
          completed: boolean
          completed_at: string | null
          id: string
          item_key: string
          item_label: string
        }
        Insert: {
          application_id: string
          completed?: boolean
          completed_at?: string | null
          id?: string
          item_key: string
          item_label: string
        }
        Update: {
          application_id?: string
          completed?: boolean
          completed_at?: string | null
          id?: string
          item_key?: string
          item_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_checklist_items_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          outcome: string | null
          outcome_at: string | null
          scholarship_id: string
          status: string
          testimonial: string | null
          testimonial_visible_to_spectrum: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          outcome?: string | null
          outcome_at?: string | null
          scholarship_id: string
          status?: string
          testimonial?: string | null
          testimonial_visible_to_spectrum?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          outcome?: string | null
          outcome_at?: string | null
          scholarship_id?: string
          status?: string
          testimonial?: string | null
          testimonial_visible_to_spectrum?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gap_actions_completed: {
        Row: {
          id: string
          marked_done_at: string
          recommendation_id: string
          user_id: string
        }
        Insert: {
          id?: string
          marked_done_at?: string
          recommendation_id: string
          user_id: string
        }
        Update: {
          id?: string
          marked_done_at?: string
          recommendation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gap_actions_completed_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "gap_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      gap_recommendations: {
        Row: {
          badge_name: string | null
          band_relevance: string[] | null
          category: string | null
          created_at: string
          description: string | null
          dimension: string
          display_order: number | null
          effort_level: string
          estimated_unlocks: number | null
          external_resource_name: string | null
          external_resource_url: string | null
          icon_emoji: string | null
          id: string
          is_active: boolean | null
          pathway: string | null
          priority: string
          spectrum_product_name: string | null
          spectrum_product_url: string | null
          title: string
          trigger_score_max: number
          verifies_evidence: boolean
          why_template: string | null
          xp_reward: number
        }
        Insert: {
          badge_name?: string | null
          band_relevance?: string[] | null
          category?: string | null
          created_at?: string
          description?: string | null
          dimension: string
          display_order?: number | null
          effort_level: string
          estimated_unlocks?: number | null
          external_resource_name?: string | null
          external_resource_url?: string | null
          icon_emoji?: string | null
          id?: string
          is_active?: boolean | null
          pathway?: string | null
          priority: string
          spectrum_product_name?: string | null
          spectrum_product_url?: string | null
          title: string
          trigger_score_max: number
          verifies_evidence?: boolean
          why_template?: string | null
          xp_reward?: number
        }
        Update: {
          badge_name?: string | null
          band_relevance?: string[] | null
          category?: string | null
          created_at?: string
          description?: string | null
          dimension?: string
          display_order?: number | null
          effort_level?: string
          estimated_unlocks?: number | null
          external_resource_name?: string | null
          external_resource_url?: string | null
          icon_emoji?: string | null
          id?: string
          is_active?: boolean | null
          pathway?: string | null
          priority?: string
          spectrum_product_name?: string | null
          spectrum_product_url?: string | null
          title?: string
          trigger_score_max?: number
          verifies_evidence?: boolean
          why_template?: string | null
          xp_reward?: number
        }
        Relationships: []
      }
      navigator_shortlist: {
        Row: {
          created_at: string
          id: string
          match_band: string | null
          match_score: number | null
          notes: string | null
          scholarship_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_band?: string | null
          match_score?: number | null
          notes?: string | null
          scholarship_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_band?: string | null
          match_score?: number | null
          notes?: string | null
          scholarship_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      parent_invite_codes: {
        Row: {
          child_id: string
          code: string
          created_at: string
          expires_at: string
          id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          child_id: string
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          child_id?: string
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      parent_links: {
        Row: {
          child_id: string
          created_at: string
          id: string
          parent_id: string
          status: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          parent_id: string
          status?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          parent_id?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          applying_year_level: number | null
          created_at: string
          current_school_name: string | null
          current_school_type: string | null
          dream_schools: string | null
          email: string | null
          extracurriculars: string[] | null
          faith_background: string | null
          financial_need: string | null
          full_name: string | null
          gender: string | null
          grades: Json | null
          has_sibling_enrolled: boolean | null
          id: string
          is_indigenous: boolean | null
          is_rural: boolean | null
          last_name: string | null
          max_travel_km: number | null
          onboarding_completed: boolean | null
          parent_email: string | null
          postcode: string
          preferred_sectors: string[] | null
          scholarship_categories: string[] | null
          school_type: string | null
          state: string
          streak_days: number
          streak_label: string | null
          suburb: string | null
          target_schools: string[] | null
          target_start_year: number | null
          target_year: string | null
          view_mode: string
          willing_to_board: string | null
          year_level: string | null
        }
        Insert: {
          applying_year_level?: number | null
          created_at?: string
          current_school_name?: string | null
          current_school_type?: string | null
          dream_schools?: string | null
          email?: string | null
          extracurriculars?: string[] | null
          faith_background?: string | null
          financial_need?: string | null
          full_name?: string | null
          gender?: string | null
          grades?: Json | null
          has_sibling_enrolled?: boolean | null
          id: string
          is_indigenous?: boolean | null
          is_rural?: boolean | null
          last_name?: string | null
          max_travel_km?: number | null
          onboarding_completed?: boolean | null
          parent_email?: string | null
          postcode: string
          preferred_sectors?: string[] | null
          scholarship_categories?: string[] | null
          school_type?: string | null
          state: string
          streak_days?: number
          streak_label?: string | null
          suburb?: string | null
          target_schools?: string[] | null
          target_start_year?: number | null
          target_year?: string | null
          view_mode?: string
          willing_to_board?: string | null
          year_level?: string | null
        }
        Update: {
          applying_year_level?: number | null
          created_at?: string
          current_school_name?: string | null
          current_school_type?: string | null
          dream_schools?: string | null
          email?: string | null
          extracurriculars?: string[] | null
          faith_background?: string | null
          financial_need?: string | null
          full_name?: string | null
          gender?: string | null
          grades?: Json | null
          has_sibling_enrolled?: boolean | null
          id?: string
          is_indigenous?: boolean | null
          is_rural?: boolean | null
          last_name?: string | null
          max_travel_km?: number | null
          onboarding_completed?: boolean | null
          parent_email?: string | null
          postcode?: string
          preferred_sectors?: string[] | null
          scholarship_categories?: string[] | null
          school_type?: string | null
          state?: string
          streak_days?: number
          streak_label?: string | null
          suburb?: string | null
          target_schools?: string[] | null
          target_start_year?: number | null
          target_year?: string | null
          view_mode?: string
          willing_to_board?: string | null
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
      student_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          element_stage: string
          evidence_url: string | null
          id: string
          points_earned: number
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          element_stage: string
          evidence_url?: string | null
          id?: string
          points_earned?: number
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          element_stage?: string
          evidence_url?: string | null
          id?: string
          points_earned?: number
          user_id?: string
        }
        Relationships: []
      }
      student_progress: {
        Row: {
          badges: string[]
          created_at: string
          current_band: string
          element_points_aether: number
          element_points_air: number
          element_points_earth: number
          element_points_fire: number
          element_points_water: number
          id: string
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          badges?: string[]
          created_at?: string
          current_band?: string
          element_points_aether?: number
          element_points_air?: number
          element_points_earth?: number
          element_points_fire?: number
          element_points_water?: number
          id?: string
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          badges?: string[]
          created_at?: string
          current_band?: string
          element_points_aether?: number
          element_points_air?: number
          element_points_earth?: number
          element_points_fire?: number
          element_points_water?: number
          id?: string
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_key: string
          description: string | null
          earned_at: string
          icon_emoji: string
          id: string
          label: string
          user_id: string
        }
        Insert: {
          badge_key: string
          description?: string | null
          earned_at?: string
          icon_emoji?: string
          id?: string
          label: string
          user_id: string
        }
        Update: {
          badge_key?: string
          description?: string | null
          earned_at?: string
          icon_emoji?: string
          id?: string
          label?: string
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
      wheel_scores: {
        Row: {
          academic_self: number | null
          academic_verified: number | null
          arts_creative_self: number | null
          arts_creative_verified: number | null
          arts_self: number | null
          arts_verified: number | null
          completed_at: string | null
          created_at: string
          id: string
          interview_self: number | null
          interview_verified: number | null
          leadership_self: number | null
          leadership_verified: number | null
          service_community_self: number | null
          service_community_verified: number | null
          sports_self: number | null
          sports_verified: number | null
          stem_self: number | null
          stem_verified: number | null
          test_readiness_self: number | null
          test_readiness_verified: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_self?: number | null
          academic_verified?: number | null
          arts_creative_self?: number | null
          arts_creative_verified?: number | null
          arts_self?: number | null
          arts_verified?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          interview_self?: number | null
          interview_verified?: number | null
          leadership_self?: number | null
          leadership_verified?: number | null
          service_community_self?: number | null
          service_community_verified?: number | null
          sports_self?: number | null
          sports_verified?: number | null
          stem_self?: number | null
          stem_verified?: number | null
          test_readiness_self?: number | null
          test_readiness_verified?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_self?: number | null
          academic_verified?: number | null
          arts_creative_self?: number | null
          arts_creative_verified?: number | null
          arts_self?: number | null
          arts_verified?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          interview_self?: number | null
          interview_verified?: number | null
          leadership_self?: number | null
          leadership_verified?: number | null
          service_community_self?: number | null
          service_community_verified?: number | null
          sports_self?: number | null
          sports_verified?: number | null
          stem_self?: number | null
          stem_verified?: number | null
          test_readiness_self?: number | null
          test_readiness_verified?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_linked_children_summary: {
        Args: never
        Returns: {
          applications_count: number
          child_id: string
          current_band: string
          full_name: string
          shortlisted_count: number
          total_points: number
          wins_count: number
          year_level: string
        }[]
      }
      redeem_parent_invite: { Args: { _code: string }; Returns: string }
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
