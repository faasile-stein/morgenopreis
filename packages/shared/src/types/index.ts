export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  homeAirportId?: string;
  currency: string;
  locale: string;
  loyaltyPoints: number;
}

export enum UserRole {
  USER = 'USER',
  EDITOR = 'EDITOR',
  PRICING_MANAGER = 'PRICING_MANAGER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

export interface Airport {
  iataCode: string;
  icaoCode?: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isActive: boolean;
  isPopular: boolean;
}

export interface Destination {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  airportId: string;
  slug: string;
  title: string;
  shortDescription?: string;
  longDescription?: string;
  heroImageUrl?: string;
  galleryImages: string[];
  basePriceEur?: number;
  minDurationDays: number;
  maxDurationDays: number;
  tripTypes: string[];
  tags: string[];
  isFeatured: boolean;
  isPublished: boolean;
  priority: number;
}

export interface Offer {
  id: string;
  duffelOfferId: string;
  departureAirportId: string;
  arrivalAirportId: string;
  outboundDate: string;
  returnDate?: string;
  isRoundTrip: boolean;
  currency: string;
  totalAmount: number;
  baseFare: number;
  taxesAmount: number;
  priceScore?: number;
  priceBadge?: PriceBadge;
  cabinClass: string;
  isRefundable: boolean;
}

export enum PriceBadge {
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
}

export interface PriceAlert {
  id: string;
  userId: string;
  routeKey?: string;
  destinationId?: string;
  departureDate?: string;
  returnDate?: string;
  thresholdPrice?: number;
  thresholdPercent?: number;
  isActive: boolean;
}

export interface Booking {
  id: string;
  userId: string;
  offerId: string;
  duffelOrderId: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalPaid: number;
  currency: string;
  bookingReference?: string;
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum TicketingStatus {
  NOT_ISSUED = 'NOT_ISSUED',
  ISSUING = 'ISSUING',
  ISSUED = 'ISSUED',
  FAILED = 'FAILED',
}

export interface WheelSpinResult {
  destinationId: string;
  destination: Destination;
  offers: Offer[];
}

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  iconUrl?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Authentication types
export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// Geolocation types
export interface Location {
  latitude: number;
  longitude: number;
}

export interface AirportWithDistance extends Airport {
  distance: number; // in km
}
