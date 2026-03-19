export interface Team {
  id: number;
  name: string;
  display_order: number;
}

export interface Role {
  id: number;
  name: string;
}

export interface Status {
  id: number;
  name: string;
  category: 'available' | 'unavailable' | 'partial' | 'loaned';
  availability_weight: number;
  color: string;
  display_order: number;
}

export interface Staff {
  id: number;
  name: string;
  team_id: number;
  role_id: number;
  start_date: string;
  end_date: string | null;
  contracted_hours: number;
  is_active: number;
  is_vacancy: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffWithDetails extends Staff {
  team_name: string;
  role_name: string;
}

export interface DailyAllocation {
  id: number;
  staff_id: number;
  date: string;
  status_id: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyAllocationWithDetails extends DailyAllocation {
  staff_name: string;
  team_id: number;
  team_name: string;
  status_name: string;
  status_category: string;
  availability_weight: number;
  status_color: string;
}

export interface TicketMetric {
  id: number;
  year: number;
  month: number;
  capacity_baseline: number;
  tickets_opened: number;
  tickets_closed: number;
  ticket_system: string | null;
  notes: string | null;
}

export interface CapacityThreshold {
  id: number;
  team_id: number;
  min_headcount: number | null;
  min_utilisation: number;
  ideal_utilisation: number;
  max_utilisation: number;
  effective_from: string;
  effective_to: string | null;
}

export interface UtilisationResult {
  team_id: number;
  team_name: string;
  period: string;
  value: number;
  headcount: number;
  available_count: number;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertType = 'threshold_violation' | 'leave_conflict' | 'capacity_gap';

export interface Alert {
  type: AlertType;
  severity: AlertSeverity;
  team_id: number;
  team_name: string;
  message: string;
  date: string;
  date_range?: { from: string; to: string };
}
