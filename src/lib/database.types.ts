// Tipos do banco no formato do `supabase gen types typescript` (type, não interface: o supabase-js
// exige linhas compatíveis com Record<string, unknown>).
// Regere com: npx supabase gen types typescript --local > src/lib/database.types.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = 'ADMIN' | 'OPERATOR' | 'CUSTOMER';
export type VehicleCategory = 'HATCH' | 'SEDAN' | 'SUV' | 'PICKUP';
export type OsStatus = 'SCHEDULED' | 'WAITING' | 'WASHING' | 'FINISHING' | 'READY' | 'DELIVERED' | 'CANCELED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'CANCELED';
export type PaymentMethod = 'ON_SITE' | 'PIX';
export type ServiceKind = 'MAIN' | 'ADDON';
export type OsOrigin = 'APP' | 'WALK_IN';
export type CashEntryType = 'INCOME' | 'EXPENSE';

/** Horário de um dia; null = fechado. Chaves "0" (domingo) a "6" (sábado). */
export type DayHours = { open: string; close: string } | null;
export type OpeningHours = Record<string, DayHours>;

export type DamageArea = 'FRONT' | 'REAR' | 'LEFT' | 'RIGHT' | 'ROOF' | 'INTERIOR';
export type DamageType = 'SCRATCH' | 'DENT' | 'BROKEN' | 'STAIN' | 'OTHER';
export type Damage = {
  area: DamageArea;
  type: DamageType;
  note?: string;
};

type Table<Row, Required extends keyof Row, Generated extends keyof Row = never> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required | Generated>>;
  Update: Partial<Omit<Row, Generated>>;
  Relationships: [];
};

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  address: string | null;
  timezone: string;
  opening_hours: OpeningHours;
  box_capacity: number;
  slot_interval_min: number;
  loyalty_goal: number;
  pix_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  tenant_id: string;
  role: AppRole;
  full_name: string;
  phone: string | null;
  email: string | null;
  commission_pct: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Vehicle = {
  id: string;
  tenant_id: string;
  owner_id: string | null;
  plate: string;
  model: string;
  color: string;
  category: VehicleCategory;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Service = {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  kind: ServiceKind;
  duration_min: number;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ServicePrice = {
  service_id: string;
  category: VehicleCategory;
  tenant_id: string;
  price: number;
};

export type AppointmentOS = {
  id: string;
  tenant_id: string;
  number: number;
  origin: OsOrigin;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  vehicle_id: string;
  service_id: string | null;
  employee_id: string | null;
  scheduled_at: string;
  duration_min: number;
  ends_at: string;
  status: OsStatus;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  paid_at: string | null;
  pix_payment_id: string | null;
  pix_qr_code: string | null;
  pix_qr_base64: string | null;
  pix_expires_at: string | null;
  notes: string | null;
  started_at: string | null;
  finished_at: string | null;
  delivered_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OsItem = {
  id: string;
  os_id: string;
  tenant_id: string;
  service_id: string | null;
  kind: ServiceKind;
  name: string;
  price: number;
  duration_min: number;
};

export type OsChecklist = {
  id: string;
  os_id: string;
  tenant_id: string;
  photos: string[];
  damages: Damage[];
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type LoyaltyCard = {
  id: string;
  tenant_id: string;
  customer_id: string;
  stamps: number;
  rewards_available: number;
  rewards_redeemed: number;
  total_washes: number;
  updated_at: string;
};

export type CashEntry = {
  id: string;
  tenant_id: string;
  type: CashEntryType;
  category: string;
  description: string;
  amount: number;
  occurred_on: string;
  os_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  profile_id: string;
  tenant_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
};

export type DashboardSummary = {
  revenue: number;
  paid_count: number;
  cars_washed: number;
  avg_ticket: number;
  top_services: { name: string; qty: number; revenue: number }[];
  by_day: { day: string; revenue: number; cars: number }[];
};

export type CommissionRow = {
  employee_id: string;
  full_name: string;
  commission_pct: number;
  os_count: number;
  gross: number;
  commission: number;
};

export type Database = {
  public: {
    Tables: {
      tenants: Table<Tenant, 'slug' | 'name', 'id' | 'created_at' | 'updated_at'>;
      profiles: Table<Profile, 'id' | 'tenant_id', 'created_at' | 'updated_at'>;
      vehicles: Table<Vehicle, 'tenant_id' | 'plate' | 'category', 'id' | 'created_at' | 'updated_at'>;
      services: Table<Service, 'tenant_id' | 'name' | 'duration_min', 'id' | 'created_at' | 'updated_at'>;
      service_prices: Table<ServicePrice, 'service_id' | 'category' | 'tenant_id' | 'price'>;
      appointments_os: Table<
        AppointmentOS,
        'tenant_id' | 'vehicle_id' | 'scheduled_at' | 'duration_min' | 'ends_at',
        'id' | 'number' | 'created_at' | 'updated_at'
      >;
      os_items: Table<OsItem, 'os_id' | 'tenant_id' | 'kind' | 'name' | 'price' | 'duration_min', 'id'>;
      os_checklist: Table<OsChecklist, 'os_id' | 'tenant_id', 'id' | 'created_at' | 'updated_at'>;
      loyalty_cards: Table<LoyaltyCard, 'tenant_id' | 'customer_id', 'id' | 'updated_at'>;
      cash_entries: Table<CashEntry, 'tenant_id' | 'type' | 'amount', 'id' | 'created_at'>;
      push_subscriptions: Table<PushSubscriptionRow, 'profile_id' | 'tenant_id' | 'endpoint' | 'p256dh' | 'auth', 'id' | 'created_at'>;
    };
    Views: Record<string, never>;
    Functions: {
      get_busy_intervals: { Args: { p_from: string; p_to: string }; Returns: { starts_at: string; ends_at: string }[] };
      book_appointment: {
        Args: {
          p_vehicle: string;
          p_service: string;
          p_addons?: string[];
          p_scheduled_at: string;
          p_payment?: PaymentMethod;
          p_notes?: string | null;
        };
        Returns: AppointmentOS;
      };
      open_walk_in: {
        Args: {
          p_plate: string;
          p_category: VehicleCategory;
          p_service: string;
          p_addons?: string[];
          p_model?: string;
          p_color?: string;
          p_customer_name?: string;
          p_customer_phone?: string | null;
        };
        Returns: AppointmentOS;
      };
      cancel_appointment: { Args: { p_os: string }; Returns: AppointmentOS };
      redeem_loyalty_reward: { Args: { p_customer: string }; Returns: LoyaltyCard };
      dashboard_summary: { Args: { p_from: string; p_to: string }; Returns: DashboardSummary };
      commission_report: { Args: { p_from: string; p_to: string }; Returns: CommissionRow[] };
    };
    Enums: {
      app_role: AppRole;
      vehicle_category: VehicleCategory;
      os_status: OsStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      service_kind: ServiceKind;
      os_origin: OsOrigin;
      cash_entry_type: CashEntryType;
    };
    CompositeTypes: Record<string, never>;
  };
};
