import { Router, Request, Response, RequestHandler } from 'express';
import { db } from '../db/index'; // Extensionless import to support Angular compiler config
import { patients } from '../db/schema'; // Extensionless import to support Angular compiler config
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * 1. GET ALL PATIENTS (قراءة كافة الطلاب/المرضى)
 * Fetch all students enrolled in the special needs center.
 */
router.get('/', (async (req: Request, res: Response) => {
  try {
    const allPatients = await db.select().from(patients);
    res.json(allPatients);
    return;
  } catch (error) {
    console.error('[Patients Router] Failed to fetch patients:', error);
    res.status(500).json({
      error: 'Failed to fetch patients database records. Please try again later.'
    });
    return;
  }
}) as RequestHandler);

/**
 * 2. GET SINGLE PATIENT BY ID (قراءة بيانات طالب محدد)
 */
router.get('/:id', (async (req: Request, res: Response) => {
  const idParam = req.params['id'];
  const patientId = parseInt(idParam as string, 10);
  
  if (isNaN(patientId)) {
    res.status(400).json({ error: 'Invalid patient ID format' });
    return;
  }

  try {
    const result = await db.select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (result.length === 0) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    res.json(result[0]);
    return;
  } catch (error) {
    console.error(`[Patients Router] Failed to fetch patient with ID ${patientId}:`, error);
    res.status(500).json({
      error: 'Failed to fetch patient details. Please check logs.'
    });
    return;
  }
}) as RequestHandler);

/**
 * 3. CREATE NEW PATIENT (إضافة طالب جديد)
 */
router.post('/', (async (req: Request, res: Response) => {
  const {
    fullName,
    dateOfBirth,
    gender,
    disabilityType,
    medicalHistory,
    emergencyContactName,
    emergencyContactPhone,
    admissionDate
  } = req.body;

  // Basic validation
  if (!fullName || !dateOfBirth || !gender || !disabilityType || !emergencyContactName || !emergencyContactPhone || !admissionDate) {
    res.status(400).json({
      error: 'Missing required patient fields. Full name, Date of Birth, Gender, Disability Type, Emergency Contact, and Admission Date are mandatory.'
    });
    return;
  }

  try {
    const newPatient = await db.insert(patients)
      .values({
        fullName,
        dateOfBirth,
        gender,
        disabilityType,
        medicalHistory: medicalHistory || null,
        emergencyContactName,
        emergencyContactPhone,
        admissionDate
      })
      .returning();

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      data: newPatient[0]
    });
    return;
  } catch (error) {
    console.error('[Patients Router] Failed to create patient:', error);
    res.status(500).json({
      error: 'An unexpected database error occurred while registering the patient.'
    });
    return;
  }
}) as RequestHandler);

/**
 * 4. UPDATE PATIENT (تحديث بيانات طالب)
 */
router.put('/:id', (async (req: Request, res: Response) => {
  const idParam = req.params['id'];
  const patientId = parseInt(idParam as string, 10);
  
  if (isNaN(patientId)) {
    res.status(400).json({ error: 'Invalid patient ID format' });
    return;
  }

  const {
    fullName,
    dateOfBirth,
    gender,
    disabilityType,
    medicalHistory,
    emergencyContactName,
    emergencyContactPhone,
    admissionDate
  } = req.body;

  try {
    const updatedPatient = await db.update(patients)
      .set({
        fullName,
        dateOfBirth,
        gender,
        disabilityType,
        medicalHistory,
        emergencyContactName,
        emergencyContactPhone,
        admissionDate,
        updatedAt: new Date()
      })
      .where(eq(patients.id, patientId))
      .returning();

    if (updatedPatient.length === 0) {
      res.status(404).json({ error: 'Patient not found or no updates were applied.' });
      return;
    }

    res.json({
      success: true,
      message: 'Patient record updated successfully',
      data: updatedPatient[0]
    });
    return;
  } catch (error) {
    console.error(`[Patients Router] Failed to update patient with ID ${patientId}:`, error);
    res.status(500).json({
      error: 'An unexpected database error occurred while updating the patient.'
    });
    return;
  }
}) as RequestHandler);

/**
 * 5. DELETE PATIENT (حذف طالب)
 */
router.delete('/:id', (async (req: Request, res: Response) => {
  const idParam = req.params['id'];
  const patientId = parseInt(idParam as string, 10);

  if (isNaN(patientId)) {
    res.status(400).json({ error: 'Invalid patient ID format' });
    return;
  }

  try {
    const deleted = await db.delete(patients)
      .where(eq(patients.id, patientId))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Patient and all associated sessions/billing records deleted successfully.'
    });
    return;
  } catch (error) {
    console.error(`[Patients Router] Failed to delete patient with ID ${patientId}:`, error);
    res.status(500).json({
      error: 'An unexpected database error occurred while trying to delete the patient.'
    });
    return;
  }
}) as RequestHandler);

export default router;
