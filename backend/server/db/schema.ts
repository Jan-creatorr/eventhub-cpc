
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

// PostgreSQL enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);
export const eventStatusEnum = pgEnum('event_status', [
  'draft',
  'published',
  'cancelled',
]);
export const registrationStatusEnum = pgEnum('registration_status', [
  'registered',
  'cancelled',
]);
export const auditOutcomeEnum = pgEnum('audit_outcome', [
  'success',
  'failure',
  'warning',
]);

// Users
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    fullName: varchar('full_name', { length: 120 }).notNull(),
    email: varchar('email', { length: 191 }).notNull().unique(),
    studentId: varchar('student_id', { length: 40 }).notNull(),
    course: varchar('course', { length: 120 }).notNull(),
    yearLevel: integer('year_level').notNull().default(1),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: userRoleEnum('role').notNull().default('user'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_users_role').on(table.role),
    uniqueIndex('unique_student_id').on(table.studentId),
  ],
);

// Events
export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 191 }).notNull(),
    description: text('description').notNull(),
    category: varchar('category', { length: 80 })
      .notNull()
      .default('Academic'),
    organization: varchar('organization', { length: 120 })
      .notNull()
      .default('CPC Student Council'),
    venue: varchar('venue', { length: 191 }).notNull(),
    eventDate: timestamp('event_date', { mode: 'date' }).notNull(),
    startTime: varchar('start_time', { length: 5 }).notNull(),
    endTime: varchar('end_time', { length: 5 }).notNull(),
    capacity: integer('capacity').notNull(),
    registrationDeadline: timestamp('registration_deadline', {
      mode: 'date',
    }).notNull(),
    status: eventStatusEnum('status').notNull().default('draft'),
    createdBy: integer('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
    (table) => [
      index('idx_events_status').on(table.status),
      index('idx_events_date').on(table.eventDate),
      index('idx_events_created_by').on(table.createdBy),
    ],
);

// Event registrations
export const registrations = pgTable(
  'event_registrations',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    eventId: integer('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    status: registrationStatusEnum('status')
      .notNull()
      .default('registered'),
    registeredAt: timestamp('registered_at', { mode: 'date' })
      .notNull()
      .defaultNow(),
    cancelledAt: timestamp('cancelled_at', { mode: 'date' }),
  },
  (table) => [
    uniqueIndex('unique_user_event').on(table.userId, table.eventId),
    index('idx_registrations_event').on(table.eventId),
    index('idx_registrations_user').on(table.userId),
  ],
);

// Refresh tokens
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    familyId: varchar('family_id', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    revokedAt: timestamp('revoked_at', { mode: 'date' }),
    userAgent: varchar('user_agent', { length: 255 }),
    ipAddress: varchar('ip_address', { length: 64 }),
    createdAt: timestamp('created_at', { mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_refresh_user').on(table.userId),
    index('idx_refresh_family').on(table.familyId),
  ],
);

// Security audit logs
export const securityAuditLogs = pgTable(
  'security_audit_logs',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: varchar('action', { length: 80 }).notNull(),
    outcome: auditOutcomeEnum('outcome').notNull().default('success'),
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: varchar('user_agent', { length: 255 }),
    details: text('details').notNull(),
    nonce: varchar('nonce', { length: 64 }).notNull(),
    previousHash: varchar('previous_hash', { length: 64 }).notNull(),
    entryHash: varchar('entry_hash', { length: 64 }).notNull().unique(),
    createdAt: timestamp('created_at', { mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_audit_user').on(table.userId),
    index('idx_audit_action').on(table.action),
    index('idx_audit_created').on(table.createdAt),
  ],
);

// Type helpers
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Registration = typeof registrations.$inferSelect;
export type SecurityAuditLog = typeof securityAuditLogs.$inferSelect;
