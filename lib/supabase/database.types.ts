export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      app_users: {
        Row: { id: string; username: string; created_at: string }
        Insert: { id?: string; username: string; created_at?: string }
        Update: { id?: string; username?: string }
        Relationships: []
      }
      tournaments: {
        Row: { id: string; name: string; status: 'active' | 'completed'; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; status?: 'active' | 'completed'; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; status?: 'active' | 'completed'; updated_at?: string }
        Relationships: []
      }
      tournament_days: {
        Row: { id: string; tournament_id: string; legacy_id: string; day_index: number; name: string; date: string | null; created_at: string }
        Insert: { id?: string; tournament_id: string; legacy_id: string; day_index: number; name: string; date?: string | null; created_at?: string }
        Update: { tournament_id?: string; legacy_id?: string; day_index?: number; name?: string; date?: string | null }
        Relationships: []
      }
      tournament_day_state: {
        Row: { tournament_day_id: string; draft_assignments: Json; draft_manual_locks: Json; committed_assignments: Json; committed_manual_locks: Json; updated_at: string }
        Insert: { tournament_day_id: string; draft_assignments?: Json; draft_manual_locks?: Json; committed_assignments?: Json; committed_manual_locks?: Json; updated_at?: string }
        Update: { draft_assignments?: Json; draft_manual_locks?: Json; committed_assignments?: Json; committed_manual_locks?: Json; updated_at?: string }
        Relationships: []
      }
      umpires: {
        Row: { id: string; tournament_id: string; name: string; experience: 'International' | 'National' | 'Regional' | 'Developing'; max_games: number; legacy_availability: string | null; created_at: string; updated_at: string }
        Insert: { id: string; tournament_id: string; name: string; experience: 'International' | 'National' | 'Regional' | 'Developing'; max_games: number; legacy_availability?: string | null; created_at?: string; updated_at?: string }
        Update: { tournament_id?: string; name?: string; experience?: 'International' | 'National' | 'Regional' | 'Developing'; max_games?: number; legacy_availability?: string | null; updated_at?: string }
        Relationships: []
      }
      umpire_availability: {
        Row: { id: string; umpire_id: string; tournament_day_id: string; enabled: boolean; from_time: string | null; until_time: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; umpire_id: string; tournament_day_id: string; enabled?: boolean; from_time?: string | null; until_time?: string | null; updated_at?: string }
        Update: { enabled?: boolean; from_time?: string | null; until_time?: string | null; updated_at?: string }
        Relationships: []
      }
      games: {
        Row: { id: string; tournament_day_id: string; number: number; date: string; start_time: string; end_time: string | null; field: string; teams: string; division: string; positions: string[]; created_at: string; updated_at: string }
        Insert: { id: string; tournament_day_id: string; number: number; date: string; start_time: string; end_time?: string | null; field: string; teams: string; division: string; positions?: string[]; created_at?: string; updated_at?: string }
        Update: { tournament_day_id?: string; number?: number; date?: string; start_time?: string; end_time?: string | null; field?: string; teams?: string; division?: string; positions?: string[]; updated_at?: string }
        Relationships: []
      }
      allocations: {
        Row: { game_id: string; umpire_id: string; position: 'Plate' | 'Base 1' | 'Base 2' | 'Base 3'; created_at: string; updated_at: string }
        Insert: { game_id: string; umpire_id: string; position: 'Plate' | 'Base 1' | 'Base 2' | 'Base 3'; created_at?: string; updated_at?: string }
        Update: { umpire_id?: string; position?: 'Plate' | 'Base 1' | 'Base 2' | 'Base 3'; updated_at?: string }
        Relationships: []
      }
      manual_locks: {
        Row: { game_id: string; position: 'Plate' | 'Base 1' | 'Base 2' | 'Base 3'; umpire_id: string; created_at: string }
        Insert: { game_id: string; position: 'Plate' | 'Base 1' | 'Base 2' | 'Base 3'; umpire_id: string; created_at?: string }
        Update: { umpire_id?: string }
        Relationships: []
      }
      rules: {
        Row: { id: string; name: string; category: 'hard' | 'soft'; description: string; default_enabled: boolean }
        Insert: { id: string; name: string; category: 'hard' | 'soft'; description: string; default_enabled?: boolean }
        Update: { name?: string; category?: 'hard' | 'soft'; description?: string; default_enabled?: boolean }
        Relationships: []
      }
      tournament_rules: {
        Row: { tournament_id: string; rule_id: string; enabled: boolean; updated_at: string }
        Insert: { tournament_id: string; rule_id: string; enabled?: boolean; updated_at?: string }
        Update: { enabled?: boolean; updated_at?: string }
        Relationships: []
      }
      allocation_change_history: {
        Row: { id: string; tournament_day_id: string; game_id: string; game_number: number; time: string | null; diamond: string | null; position: 'Plate' | 'Base 1' | 'Base 2' | 'Base 3'; from_umpire: string; to_umpire: string; status: 'Pending' | 'Committed'; created_at: string }
        Insert: { id: string; tournament_day_id: string; game_id: string; game_number: number; time?: string | null; diamond?: string | null; position: 'Plate' | 'Base 1' | 'Base 2' | 'Base 3'; from_umpire: string; to_umpire: string; status: 'Pending' | 'Committed'; created_at?: string }
        Update: { tournament_day_id?: string; game_id?: string; game_number?: number; time?: string; diamond?: string; position?: 'Plate' | 'Base 1' | 'Base 2' | 'Base 3'; from_umpire?: string; to_umpire?: string; status?: 'Pending' | 'Committed' }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
