import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob"; // Optional: for child profile picture storage on Vercel

const prisma = new PrismaClient();

// ==========================================
// 1. CHILDREN API ROUTES (GET & POST/PUT)
// ==========================================

/**
 * GET /api/children?search=...
 * Search children by Name or Parent Phone, or retrieve all children
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";

    let children;
    if (search) {
      children = await prisma.child.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
            { whatsapp: { contains: search } },
            { id: { contains: search, mode: "insensitive" } }
          ],
        },
        orderBy: { name: "asc" },
      });
    } else {
      children = await prisma.child.findMany({
        orderBy: { name: "asc" },
      });
    }

    return NextResponse.json({ success: true, data: children });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "فشل تحميل قائمة الأطفال" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/children
 * Create or Update a child profile
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      dob,
      address,
      phone,
      whatsapp,
      careType,
      specialties,
      swimming,
      horseback,
      baseFee,
      swimmingFee,
      horsebackFee,
      diagnosis,
      photoUrl,
    } = body;

    // Validate essential fields
    if (!name || !dob || !phone || !careType) {
      return NextResponse.json(
        { success: false, error: "الرجاء تعبئة الحقول الأساسية المطلوبة" },
        { status: 400 }
      );
    }

    // Auto-calculate total monthly fee
    const numBaseFee = Number(baseFee || 0);
    const numSwimFee = swimming ? Number(swimmingFee || 0) : 0;
    const numHorsebackFee = horseback ? Number(horsebackFee || 0) : 0;
    const calculatedTotal = numBaseFee + numSwimFee + numHorsebackFee;

    let result;
    if (id) {
      // Update existing child profile
      result = await prisma.child.update({
        where: { id },
        data: {
          name,
          dob: new Date(dob),
          address,
          phone,
          whatsapp,
          careType,
          specialties: specialties || [],
          swimming,
          horseback,
          baseFee: numBaseFee,
          swimmingFee: numSwimFee,
          horsebackFee: numHorsebackFee,
          totalFee: calculatedTotal,
          diagnosis,
          photoUrl,
        },
      });
    } else {
      // Create a brand new child profile
      result = await prisma.child.create({
        data: {
          name,
          dob: new Date(dob),
          address,
          phone,
          whatsapp,
          careType,
          specialties: specialties || [],
          swimming,
          horseback,
          baseFee: numBaseFee,
          swimmingFee: numSwimFee,
          horsebackFee: numHorsebackFee,
          totalFee: calculatedTotal,
          diagnosis,
          photoUrl,
        },
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "فشل حفظ بيانات الطفل" },
      { status: 500 }
    );
  }
}

// ==========================================
// 2. EMPLOYEES API ROUTES (GET & POST/PUT)
// ==========================================

/**
 * GET /api/employees?search=...
 * Search employees by Name, Phone, or Job Title (role)
 */
export async function GET_EMPLOYEES(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";

    let employees;
    if (search) {
      employees = await prisma.employee.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
            { whatsapp: { contains: search } },
            // Search role if query is in English / Arabic maps (e.g. SPECIALIST)
            { role: { equals: search.toUpperCase() as any } }
          ],
        },
        orderBy: { name: "asc" },
      });
    } else {
      employees = await prisma.employee.findMany({
        orderBy: { name: "asc" },
      });
    }

    return NextResponse.json({ success: true, data: employees });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "فشل تحميل قائمة الموظفين" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/employees
 * Create or update an employee profile (HR)
 */
export async function POST_EMPLOYEE(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      phone,
      whatsapp,
      gradYear,
      salary,
      role,
      specialties,
    } = body;

    if (!name || !phone || !role || !salary) {
      return NextResponse.json(
        { success: false, error: "الرجاء إدخال كافة الحقول الإلزامية للموظف" },
        { status: 400 }
      );
    }

    // Role specific logic: specialists/supervisors require specialties
    const formattedSpecialties = (role === "SPECIALIST" || role === "SUPERVISOR") 
      ? (specialties || []) 
      : [];

    let result;
    if (id) {
      result = await prisma.employee.update({
        where: { id },
        data: {
          name,
          phone,
          whatsapp,
          gradYear: Number(gradYear),
          salary: Number(salary),
          role,
          specialties: formattedSpecialties,
        },
      });
    } else {
      result = await prisma.employee.create({
        data: {
          name,
          phone,
          whatsapp,
          gradYear: Number(gradYear),
          salary: Number(salary),
          role,
          specialties: formattedSpecialties,
        },
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "فشل حفظ بيانات الكادر" },
      { status: 500 }
    );
  }
}

// ==========================================
// 3. VERCEL BLOB FILE UPLOAD (PROFILE IMAGE)
// ==========================================

/**
 * POST /api/upload-photo
 * Handles real photo uploads to Vercel Blob and returns public url
 */
export async function uploadProfilePhoto(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename") || "avatar.png";
    
    if (!request.body) {
      return NextResponse.json({ success: false, error: "الملف مفقود" }, { status: 400 });
    }

    const blob = await put(filename, request.body, {
      access: "public",
    });

    return NextResponse.json({ success: true, url: blob.url });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "فشل رفع الصورة" },
      { status: 500 }
    );
  }
}
