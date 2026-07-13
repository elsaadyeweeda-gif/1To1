import { Router, Request, Response, RequestHandler } from 'express';
import { db } from '../db/index'; // Extensionless import to support Angular compiler config
import { sessions, patients, staff } from '../db/schema'; // Extensionless import to support Angular compiler config
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Parses an AM/PM time string (e.g. "09:30 AM", "2:15 pm") into minutes since midnight.
 * Returns null if the format is invalid.
 */
function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM|am|pm)$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

/**
 * Normalizes an AM/PM time string to a standard format (e.g. "09:30 AM").
 * Returns null if the format is invalid.
 */
function normalizeTimeStr(timeStr: string): string | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM|am|pm)$/i);
  if (!match) return null;

  const hours = parseInt(match[1], 10).toString().padStart(2, '0');
  const minutes = match[2];
  const period = match[3].toUpperCase();

  return `${hours}:${minutes} ${period}`;
}

/**
 * 1. GET ALL SESSIONS (قراءة كافة الجلسات)
 * Includes patient details and therapist (staff) details using Drizzle joins.
 */
router.get('/', (async (req: Request, res: Response) => {
  try {
    const allSessions = await db
      .select({
        id: sessions.id,
        sessionDate: sessions.sessionDate,
        startTime: sessions.startTime,
        endTime: sessions.endTime,
        status: sessions.status,
        sessionNotes: sessions.sessionNotes,
        createdAt: sessions.createdAt,
        patient: {
          id: patients.id,
          fullName: patients.fullName,
          disabilityType: patients.disabilityType,
        },
        therapist: {
          id: staff.id,
          name: staff.name,
          role: staff.role,
        }
      })
      .from(sessions)
      .leftJoin(patients, eq(sessions.patientId, patients.id))
      .leftJoin(staff, eq(sessions.therapistId, staff.id));

    res.json(allSessions);
    return;
  } catch (error) {
    console.error('[Sessions Router] Failed to fetch sessions:', error);
    res.status(500).json({
      error: 'Failed to retrieve sessions list from database.'
    });
    return;
  }
}) as RequestHandler);

/**
 * 2. CREATE NEW SESSION (إضافة جلسة جديدة بتوقيت من وإلى بنظام AM PM)
 */
router.post('/', (async (req: Request, res: Response) => {
  const {
    patientId,
    therapistId,
    sessionDate,
    startTime,
    endTime,
    status,
    sessionNotes
  } = req.body;

  // Basic validation
  if (!patientId || !therapistId || !sessionDate || !startTime || !endTime) {
    res.status(400).json({
      error: 'Missing required session parameters. Patient ID, Therapist ID, Session Date, Start Time (startTime), and End Time (endTime) are mandatory.'
    });
    return;
  }

  // Parse and validate times in AM/PM format
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (startMinutes === null || endMinutes === null) {
    res.status(400).json({
      error: 'تنسيق الوقت غير صالح. يرجى استخدام نظام 12 ساعة (مثال: 09:30 AM أو 02:15 PM). / Invalid time format. Please use 12-hour AM/PM format (e.g. 09:30 AM or 02:15 PM).'
    });
    return;
  }

  // Ensure startTime is strictly before endTime
  if (startMinutes >= endMinutes) {
    res.status(400).json({
      error: 'خطأ في المدة: يجب أن يكون وقت بدء الجلسة قبل وقت انتهائها. / Invalid duration: Session start time must be earlier than the end time.'
    });
    return;
  }

  // Normalize times for consistency
  const normalizedStart = normalizeTimeStr(startTime)!;
  const normalizedEnd = normalizeTimeStr(endTime)!;

  try {
    const newSession = await db.insert(sessions)
      .values({
        patientId: parseInt(patientId, 10),
        therapistId: parseInt(therapistId, 10),
        sessionDate,
        startTime: normalizedStart,
        endTime: normalizedEnd,
        status: status || 'Scheduled',
        sessionNotes: sessionNotes || null
      })
      .returning();

    res.status(201).json({
      success: true,
      message: 'Session scheduled successfully',
      data: newSession[0]
    });
    return;
  } catch (error) {
    console.error('[Sessions Router] Failed to schedule session:', error);
    res.status(500).json({
      error: 'Database constraint error: Check that patient ID and therapist ID exist in the system.'
    });
    return;
  }
}) as RequestHandler);

/**
 * 3. UPDATE SESSION (تعديل جلسة وتحديث أوقاتها بنظام AM PM)
 */
router.put('/:id', (async (req: Request, res: Response) => {
  const idParam = req.params['id'];
  const sessionId = parseInt(idParam as string, 10);

  if (isNaN(sessionId)) {
    res.status(400).json({ error: 'Invalid session ID format' });
    return;
  }

  const {
    patientId,
    therapistId,
    sessionDate,
    startTime,
    endTime,
    status,
    sessionNotes
  } = req.body;

  let normalizedStart: string | undefined = undefined;
  let normalizedEnd: string | undefined = undefined;

  // If start or end time is updated, perform time alignment validations
  if (startTime || endTime) {
    // If only one of them is supplied, we need to load the other from the database to compare
    let currentStart = startTime;
    let currentEnd = endTime;

    if (!startTime || !endTime) {
      try {
        const existing = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
        if (existing.length > 0) {
          if (!startTime) currentStart = existing[0].startTime;
          if (!endTime) currentEnd = existing[0].endTime;
        }
      } catch (err) {
        console.error('Failed to load existing session for comparison:', err);
      }
    }

    const startMinutes = parseTimeToMinutes(currentStart);
    const endMinutes = parseTimeToMinutes(currentEnd);

    if (startMinutes === null || endMinutes === null) {
      res.status(400).json({
        error: 'تنسيق الوقت غير صالح. يرجى استخدام نظام 12 ساعة (مثال: 09:30 AM أو 02:15 PM). / Invalid time format. Please use 12-hour AM/PM format (e.g. 09:30 AM or 02:15 PM).'
      });
      return;
    }

    if (startMinutes >= endMinutes) {
      res.status(400).json({
        error: 'خطأ في المدة: يجب أن يكون وقت بدء الجلسة قبل وقت انتهائها. / Session start time must be earlier than the end time.'
      });
      return;
    }

    if (startTime) normalizedStart = normalizeTimeStr(startTime)!;
    if (endTime) normalizedEnd = normalizeTimeStr(endTime)!;
  }

  try {
    const updatedSession = await db.update(sessions)
      .set({
        patientId: patientId ? parseInt(patientId, 10) : undefined,
        therapistId: therapistId ? parseInt(therapistId, 10) : undefined,
        sessionDate,
        startTime: normalizedStart,
        endTime: normalizedEnd,
        status,
        sessionNotes,
        updatedAt: new Date()
      })
      .where(eq(sessions.id, sessionId))
      .returning();

    if (updatedSession.length === 0) {
      res.status(404).json({ error: 'Session not found or no changes were applied.' });
      return;
    }

    res.json({
      success: true,
      message: 'Session modified successfully',
      data: updatedSession[0]
    });
    return;
  } catch (error) {
    console.error(`[Sessions Router] Failed to update session ${sessionId}:`, error);
    res.status(500).json({
      error: 'An unexpected database error occurred while modifying the session.'
    });
    return;
  }
}) as RequestHandler);

/**
 * 4. DELETE SESSION (إلغاء أو حذف الجلسة)
 */
router.delete('/:id', (async (req: Request, res: Response) => {
  const idParam = req.params['id'];
  const sessionId = parseInt(idParam as string, 10);

  if (isNaN(sessionId)) {
    res.status(400).json({ error: 'Invalid session ID format' });
    return;
  }

  try {
    const deleted = await db.delete(sessions)
      .where(eq(sessions.id, sessionId))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: 'Session not found.' });
      return;
    }

    res.json({
      success: true,
      message: 'Session deleted successfully.'
    });
    return;
  } catch (error) {
    console.error(`[Sessions Router] Failed to delete session ${sessionId}:`, error);
    res.status(500).json({
      error: 'An unexpected database error occurred while trying to delete the session.'
    });
    return;
  }
}) as RequestHandler);

export default router;
