export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'patient' | 'clinician';
export type CaseStatus = 'pending' | 'escalated' | 'verified';
export type AuditAction =
  | 'inference'
  | 'bypass'
  | 'override'
  | 'approval'
  | 'escalation';

export interface ReasoningStep {
  n: number;
  observation: string;
  inference: string;
}

export interface ClinicalReasoning {
  model?: string;
  steps?: ReasoningStep[];
  red_flags?: string[];
  confidence_limiters?: string[];
  guideline?: string;
  recommended_action?: string;
}

export interface Differential {
  condition: string;
  icd10: string;
  probability: number;
  rationale: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      patients: {
        Row: {
          id: string;
          profile_id: string | null;
          mrn: string;
          age: number | null;
          sex: string | null;
          chief_complaint: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          mrn: string;
          age?: number | null;
          sex?: string | null;
          chief_complaint?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['patients']['Insert']>;
      };
      triage_cases: {
        Row: {
          id: string;
          patient_id: string;
          clinician_id: string | null;
          chief_complaint: string;
          ai_diagnosis: string | null;
          icd10_code: string | null;
          confidence_score: number | null;
          status: CaseStatus;
          triage_note: string | null;
          reasoning: ClinicalReasoning;
          differentials: Differential[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          clinician_id?: string | null;
          chief_complaint: string;
          ai_diagnosis?: string | null;
          icd10_code?: string | null;
          confidence_score?: number | null;
          status?: CaseStatus;
          triage_note?: string | null;
          reasoning?: Json;
          differentials?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['triage_cases']['Insert']>;
      };
      audit_logs: {
        Row: {
          seq: number;
          id: string;
          case_id: string | null;
          actor_name: string;
          actor_role: string;
          action_type: AuditAction;
          summary: string;
          hash: string | null;
          prev_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id?: string | null;
          actor_name: string;
          actor_role: string;
          action_type: AuditAction;
          summary?: string;
          created_at?: string;
        };
        Update: never;
      };
    };
    Views: {
      triage_queue_view: {
        Row: {
          id: string;
          patient_id: string;
          clinician_id: string | null;
          chief_complaint: string;
          ai_diagnosis: string | null;
          icd10_code: string | null;
          confidence_score: number | null;
          status: CaseStatus;
          triage_note: string | null;
          reasoning: ClinicalReasoning;
          differentials: Differential[];
          created_at: string;
          updated_at: string;
          patient_mrn: string;
          patient_age: number | null;
          patient_sex: string | null;
          clinician_name: string | null;
          priority_rank: number;
          review_urgency: 'critical' | 'elevated' | 'routine' | 'unknown';
        };
      };
    };
    Functions: {
      verify_audit_chain: {
        Args: Record<string, never>;
        Returns: {
          seq: number;
          id: string;
          is_valid: boolean;
          reason: string | null;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      case_status: CaseStatus;
      audit_action: AuditAction;
    };
  };
}
