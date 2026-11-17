export type Role = 'admin' | 'user';

export type EventStatus = 'draft' | 'published' | 'cancelled';

export type RegistrationStatus = 'registered' | 'cancelled';

export interface User {
  id: number;
  fullName: string;
  email: string;
  studentId: string;
  course: string;
  yearLevel: number;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface CampusEvent {
  id: number;
  title: string;
  description: string;
  category: string;
  organization: string;
  venue: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
  registrationDeadline: string;
  status: EventStatus;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  registeredCount: number;
}

export interface Registration {
  id: number;
  status: RegistrationStatus;
  registeredAt: string;
  cancelledAt: string | null;
  event: CampusEvent;
}

export interface PublicStats {
  students: number;
  upcomingEvents: number;
  registrations: number;
  organizations: number;
}

export interface AdminRegistrationRow {
  id: number;
  status: RegistrationStatus;
  registeredAt: string;
  cancelledAt: string | null;
  user: {
    id: number;
    fullName: string;
    email: string;
    studentId: string;
    course: string;
    yearLevel: number;
  };
  event: {
    id: number;
    title: string;
    eventDate: string;
    venue: string;
    organization: string;
  };
}

export interface Participant {
  registrationId: number;
  status: RegistrationStatus;
  registeredAt: string;
  fullName: string;
  email: string;
  studentId: string;
  course: string;
  yearLevel: number;
}

export interface AdminUserRow {
  id: number;
  fullName: string;
  email: string;
  studentId: string;
  course: string;
  yearLevel: number;
  role: Role;
  isActive: boolean;
  createdAt: string;
  registrationCount: number;
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
}

export interface DashboardData {
  role: Role;
  stats: {
    totalUsers?: number;
    totalEvents?: number;
    totalRegistrations?: number;
    upcomingEvents?: number;
    myRegistrations?: number;
    upcomingRegistrations?: number;
  };
  upcomingEvents: CampusEvent[];
  recentEvents: CampusEvent[];
  recentRegistrations?: AdminRegistrationRow[];
  myRegistrations?: Registration[];
}

export interface EventInput {
  title: string;
  description: string;
  category: string;
  organization: string;
  venue: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
  registrationDeadline: string;
  status: EventStatus;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  studentId: string;
  course: string;
  yearLevel: number;
  password: string;
}

export type AssistantScope = 'on-topic' | 'off-topic' | 'sensitive';

export type AssistantSource = 'knowledge-base' | 'ai' | 'guardrail';

export interface AssistantResponse {
  reply: string;
  scope: AssistantScope;
  source: AssistantSource;
}

export interface SecurityControl {
  name: string;
  detail: string;
}

export interface SecurityAuditSummary {
  available: boolean;
  total: number;
  lastHash: string | null;
  checked: number;
  chainValid: boolean;
}

export interface SecurityOverview {
  confidentiality: SecurityControl[];
  integrity: SecurityControl[];
  availability: SecurityControl[];
  session: {
    accessTokenMinutes: number;
    refreshTokenDays: number;
    activeSessions: number;
    cookieHttpOnly: boolean;
    cookieSameSite: 'lax' | 'strict' | 'none';
    cookieSecure: boolean;
  };
  assistant: {
    scopeGuard: boolean;
    provider: string;
    systemOnly: boolean;
  };
  checks: {
    database: 'ok' | 'unavailable';
    auditChain: boolean;
  };
  audit: SecurityAuditSummary;
}

export interface SecurityAuditLog {
  id: number;
  userId: number | null;
  action: string;
  outcome: 'success' | 'failure' | 'warning';
  ipAddress: string | null;
  userAgent: string | null;
  details: string;
  previousHash: string;
  entryHash: string;
  createdAt: string;
}

export interface SecurityAuditResponse {
  logs: SecurityAuditLog[];
  chain: {
    checked: number;
    valid: boolean;
  };
}
