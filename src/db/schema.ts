import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, numeric } from 'drizzle-orm/pg-core';

/**
 * 1. Users Table (جدول المستخدمين)
 * Used to store app users authenticated via Firebase Auth (Admins, Coordinators, etc.)
 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth unique identifier
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role').default('viewer'), // e.g., 'admin', 'coordinator', 'viewer'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 2. Patients/Students Table (جدول الطلاب/المرضى)
 * Stores information about the children/individuals receiving care at the center.
 */
export const patients = pgTable('patients', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(),
  dateOfBirth: text('date_of_birth').notNull(), // Expected format: YYYY-MM-DD
  gender: text('gender').notNull(), // e.g., 'Male', 'Female'
  disabilityType: text('disability_type').notNull(), // e.g., 'Autism', 'ADHD', 'Down Syndrome', 'Speech Delay'
  medicalHistory: text('medical_history'), // Medical record details, previous diagnoses, etc.
  emergencyContactName: text('emergency_contact_name').notNull(),
  emergencyContactPhone: text('emergency_contact_phone').notNull(),
  admissionDate: text('admission_date').notNull(), // Expected format: YYYY-MM-DD
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 3. Staff/Therapists Table (جدول الموظفين/المعالجين)
 * Stores profile info for therapists, specialists, and other center staff.
 */
export const staff = pgTable('staff', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(), // e.g., 'Speech Therapist', 'Physical Therapist', 'Psychologist', 'Occupational Therapist'
  phone: text('phone').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 4. Sessions/Appointments Table (جدول الجلسات/المواعيد)
 * Tracks sessions scheduled between a patient and a therapist.
 * Modified to support session start and end times (من وإلى).
 */
export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),
  therapistId: integer('therapist_id')
    .references(() => staff.id, { onDelete: 'cascade' })
    .notNull(),
  sessionDate: text('session_date').notNull(), // Expected format: YYYY-MM-DD
  startTime: text('start_time').notNull(), // Expected format: HH:MM (24h) - وقت بدء الجلسة
  endTime: text('end_time').notNull(), // Expected format: HH:MM (24h) - وقت انتهاء الجلسة
  status: text('status').default('Scheduled').notNull(), // 'Scheduled', 'Completed', 'Cancelled'
  sessionNotes: text('session_notes'), // Progress report or observations filled after completion
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 5. Treasury/Billing Table (جدول الحسابات/الخزنة)
 * Tracks subscription payments and session fees collected from patients.
 */
export const billing = pgTable('billing', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id')
    .references(() => patients.id, { onDelete: 'cascade' })
    .notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(), // Decimal storage for financial precision
  paymentDate: text('payment_date').notNull(), // Expected format: YYYY-MM-DD
  paymentType: text('payment_type').notNull(), // e.g., 'Session Fee', 'Monthly Subscription'
  receiptNumber: text('receipt_number').notNull().unique(), // Unique receipt identifier
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==========================================
// RELATIONSHIPS DEFINITION (تعريف العلاقات بين الجداول)
// ==========================================

export const usersRelations = relations(users, () => ({}));

export const patientsRelations = relations(patients, ({ many }) => ({
  sessions: many(sessions),
  bills: many(billing),
}));

export const staffRelations = relations(staff, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  patient: one(patients, {
    fields: [sessions.patientId],
    references: [patients.id],
  }),
  therapist: one(staff, {
    fields: [sessions.therapistId],
    references: [staff.id],
  }),
}));

export const billingRelations = relations(billing, ({ one }) => ({
  patient: one(patients, {
    fields: [billing.patientId],
    references: [patients.id],
  }),
}));
