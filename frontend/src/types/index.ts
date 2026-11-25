export type Role = "ADMIN" | "PATIENT" | "DRIVER";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

export type AmbulanceType = "BASIC" | "ADVANCED" | "ICU";

export type AmbulanceStatus = "AVAILABLE" | "ON_TRIP" | "MAINTENANCE" | "OFFLINE";

export type DriverStatus = "OFF_DUTY" | "AVAILABLE" | "ON_TRIP" | "SUSPENDED";

export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type EmergencyType =
  | "CARDIAC"
  | "ACCIDENT"
  | "STROKE"
  | "BREATHING"
  | "PREGNANCY"
  | "BLEEDING"
  | "BURN"
  | "FRACTURE"
  | "FEVER"
  | "SEIZURE"
  | "UNCONSCIOUS"
  | "OTHER";

export type RequestStatus = "PENDING" | "ACCEPTED" | "CANCELLED" | "EXPIRED";

export type TripStatus =
  | "ACCEPTED"
  | "EN_ROUTE"
  | "ARRIVED_AT_PICKUP"
  | "PICKED_UP"
  | "EN_ROUTE_TO_HOSPITAL"
  | "ARRIVED_AT_HOSPITAL"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentStatus = "INITIATED" | "PAID" | "FAILED" | "CANCELLED";

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    unreadCount?: number;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Ambulance {
  id: string;
  plateNumber: string;
  type: AmbulanceType;
  status: AmbulanceStatus;
  baseFare: number;
  perKmRate: number;
  photoUrl?: string | null;
  driver?: Driver | null;
  distanceKm?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  status: DriverStatus;
  currentLat?: number | null;
  currentLng?: number | null;
  ambulanceId?: string | null;
  user?: User;
  ambulance?: Ambulance;
  createdAt: string;
  updatedAt: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  contactNumber: string;
  icuBedsTotal: number;
  icuBedsAvailable: number;
  generalBedsTotal: number;
  generalBedsAvailable: number;
  distanceKm?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyRequest {
  id: string;
  patientId: string;
  patient?: User;
  emergencyType: EmergencyType;
  description: string;
  priority: Priority;
  requiredType: AmbulanceType;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Trip {
  id: string;
  requestId: string;
  request?: EmergencyRequest;
  ambulanceId: string;
  ambulance?: Ambulance;
  driverId: string;
  driver?: Driver;
  patientId: string;
  patient?: User;
  hospitalId?: string | null;
  hospital?: Hospital | null;
  status: TripStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  distanceKm?: number | null;
  fare?: number | null;
  payment?: Payment | null;
  driverReview?: Review | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  tripId: string;
  trip?: Trip;
  userId: string;
  user?: User;
  tranId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod?: string | null;
  cardType?: string | null;
  valId?: string | null;
  bankTranId?: string | null;
  cardIssuer?: string | null;
  cardBrand?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  user?: User;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface Review {
  id: string;
  tripId: string;
  patientId: string;
  driverId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

export interface AdminDashboardData {
  stats: {
    totalUsers: number;
    totalPatients: number;
    totalDrivers: number;
    totalAmbulances: number;
    activeTrips: number;
    completedTrips: number;
    cancelledTrips: number;
    totalRevenue: number;
  };
  revenueByMonth?: Array<{ month: string; revenue: number; trips: number }>;
  tripsByPriority?: Array<{ priority: string; count: number }>;
  recentTrips: Trip[];
}
