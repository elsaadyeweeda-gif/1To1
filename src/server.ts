import '@angular/compiler';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

// Patch relative fetch calls during Server-Side Rendering (SSR)
const originalFetch = globalThis.fetch;
if (originalFetch) {
  const isMain = isMainModule(import.meta.url) || !!process.env['pm_id'];
  const apiPort = isMain ? (process.env['PORT'] || 4000) : 4000;
  
  globalThis.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (typeof input === 'string' && input.startsWith('/')) {
      const absoluteUrl = `http://127.0.0.1:${apiPort}${input}`;
      console.log(`[SSR Fetch Patch] Redirecting relative fetch: ${input} -> ${absoluteUrl}`);
      return originalFetch(absoluteUrl, init);
    }
    return originalFetch(input, init);
  } as typeof globalThis.fetch;
}

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const app = express();
app.use((req, res, next) => {
  console.log(`[Express Request] ${req.method} ${req.url}`);
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const dbPath = join(process.cwd(), 'data.json');

interface Child {
  id: string;
  name: string;
  dob: string;
  address: string;
  phone: string;
  whatsapp: string;
  careType: 'day' | 'evening' | 'individual';
  specialties: string[];
  swimming: boolean;
  horseback: boolean;
  baseFee: number;
  totalFee: number;
}

interface Employee {
  id: string;
  name: string;
  phone: string;
  gradYear: number;
  salary: number;
  role: 'secretary' | 'nanny' | 'worker' | 'specialist' | 'supervisor';
  specialties: string[];
  swimFee?: number;
  horseFee?: number;
}

interface Session {
  id: string;
  childId: string;
  childName: string;
  employeeId: string;
  employeeName: string;
  specialty: string;
  date: string;
  timeSlot: string;
  type: 'morning' | 'evening' | 'individual';
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: 'center_rent' | 'pool_rent' | 'horse_rent' | 'electricity_bill' | 'water_bill' | 'gas_bill' | 'phone_internet_bill' | 'cleaning_supplies' | 'consumables' | 'durable_tools' | 'salaries' | 'rent' | 'bills' | 'purchases' | 'other';
  date: string;
}

interface ChildActivity {
  id: string;
  activityName: string;
  coachId: string;
  coachName: string;
  childId: string;
  childName: string;
  date: string;
  timeSlot: string;
}

interface SalaryAdvance {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  monthlyInstallment: number;
  installmentsCount: number;
  paidAmount: number;
  remainingBalance: number;
  date: string;
  paymentMethod: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
}

interface UnpaidLeave {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
  approvedBy: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface Bonus {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'fixed' | 'one_day' | 'multi_day';
  amount: number;
  daysCount?: number;
  date: string;
  notes: string;
  status: 'pending' | 'approved';
}

interface Deduction {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'absence' | 'swim' | 'horse' | 'fixed_penalty';
  amount: number;
  daysCount?: number;
  sessionsCount?: number;
  date: string;
  notes: string;
  status: 'pending' | 'approved';
}

interface PayrollRun {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  role: string;
  baseSalary: number;
  swimAllowance: number;
  horseAllowance: number;
  fixedBonuses: number;
  dayBonuses: number;
  totalBonuses: number;
  absenceDeduction: number;
  swimDeduction: number;
  horseDeduction: number;
  fixedPenalty: number;
  advanceDeduction: number;
  leaveDeduction: number;
  totalDeductions: number;
  grossSalary: number;
  netSalary: number;
  status: 'draft' | 'approved' | 'paid';
  remainingAdvanceBalance: number;
  dateGenerated: string;
  logs?: string;
}

interface AuditLog {
  id: string;
  action: string;
  user: string;
  date: string;
  details: string;
}

interface ChildPayment {
  id: string;
  childId: string;
  childName: string;
  amount: number;
  date: string;
  month: string;
  paymentMethod: string;
  notes?: string;
}

interface DB {
  children: Child[];
  employees: Employee[];
  sessions: Session[];
  expenses: Expense[];
  activities: ChildActivity[];
  advances: SalaryAdvance[];
  leaves: UnpaidLeave[];
  bonuses: Bonus[];
  deductions: Deduction[];
  payrollRuns: PayrollRun[];
  auditLogs: AuditLog[];
  payments?: ChildPayment[];
}

// Initial Seeding Data
const initialData: DB = {
  children: [
    {
      id: "child_1",
      name: "يوسف عمر",
      dob: "2020-03-15",
      address: "القاهرة، حي المعادي",
      phone: "01012345678",
      whatsapp: "01012345678",
      careType: "individual",
      specialties: ["speech", "sensory"],
      swimming: true,
      horseback: false,
      baseFee: 2000,
      totalFee: 2400
    },
    {
      id: "child_2",
      name: "سارة علي",
      dob: "2022-08-10",
      address: "الجيزة، حي الدقي",
      phone: "01198765432",
      whatsapp: "01198765432",
      careType: "day",
      specialties: [],
      swimming: false,
      horseback: true,
      baseFee: 1500,
      totalFee: 2000
    },
    {
      id: "child_3",
      name: "حمزة خالد",
      dob: "2018-11-22",
      address: "الإسكندرية، حي سموحة",
      phone: "01211122233",
      whatsapp: "01211122233",
      careType: "individual",
      specialties: ["skills", "motor"],
      swimming: true,
      horseback: true,
      baseFee: 2000,
      totalFee: 2900
    },
    {
      id: "child_4",
      name: "مريم ابراهيم",
      dob: "2021-07-30",
      address: "القاهرة، مصر الجديدة",
      phone: "01533344455",
      whatsapp: "01533344455",
      careType: "evening",
      specialties: [],
      swimming: false,
      horseback: false,
      baseFee: 1800,
      totalFee: 1800
    }
  ],
  employees: [
    {
      id: "emp_1",
      name: "د. ريم أحمد",
      phone: "01022233344",
      gradYear: 2016,
      salary: 8500,
      role: "specialist",
      specialties: ["speech", "academic"]
    },
    {
      id: "emp_2",
      name: "د. ليلى حسن",
      phone: "01133344455",
      gradYear: 2018,
      salary: 7500,
      role: "specialist",
      specialties: ["skills", "sensory"]
    },
    {
      id: "emp_3",
      name: "د. مازن جلال",
      phone: "01244455566",
      gradYear: 2015,
      salary: 9000,
      role: "specialist",
      specialties: ["motor", "vocational"]
    },
    {
      id: "emp_4",
      name: "أ. سارة الشريف",
      phone: "01555556667",
      gradYear: 2020,
      salary: 5000,
      role: "secretary",
      specialties: []
    },
    {
      id: "emp_5",
      name: "أ. هدى منصور",
      phone: "01077788899",
      gradYear: 2012,
      salary: 11000,
      role: "supervisor",
      specialties: ["speech", "skills", "sensory", "motor", "academic", "vocational"]
    },
    {
      id: "emp_6",
      name: "أمينة خالد",
      phone: "01088899900",
      gradYear: 2022,
      salary: 3500,
      role: "nanny",
      specialties: []
    }
  ],
  sessions: [
    {
      id: "session_1",
      childId: "child_1",
      childName: "يوسف عمر",
      employeeId: "emp_1",
      employeeName: "د. ريم أحمد",
      specialty: "speech",
      date: "2026-06-27",
      timeSlot: "09:00",
      type: "individual"
    },
    {
      id: "session_2",
      childId: "child_2",
      childName: "سارة علي",
      employeeId: "emp_5",
      employeeName: "أ. هدى المقرن",
      specialty: "skills",
      date: "2026-06-27",
      timeSlot: "10:30",
      type: "morning"
    },
    {
      id: "session_3",
      childId: "child_3",
      childName: "حمزة خالد",
      employeeId: "emp_3",
      employeeName: "د. مازن جلال",
      specialty: "motor",
      date: "2026-06-27",
      timeSlot: "11:45",
      type: "individual"
    },
    {
      id: "session_4",
      childId: "child_4",
      childName: "مريم ابراهيم",
      employeeId: "emp_1",
      employeeName: "د. ريم أحمد",
      specialty: "speech",
      date: "2026-06-27",
      timeSlot: "13:00",
      type: "evening"
    }
  ],
  expenses: [
    {
      id: "exp_1",
      title: "إيجار المقر الشهري",
      amount: 12000,
      category: "center_rent",
      date: "2026-06-01"
    },
    {
      id: "exp_2",
      title: "فاتورة الكهرباء والمياه والإنترنت",
      amount: 2350,
      category: "electricity_bill",
      date: "2026-06-15"
    },
    {
      id: "exp_3",
      title: "شراء ألعاب حسية وتدريبية وأثاث مبسط",
      amount: 4500,
      category: "durable_tools",
      date: "2026-06-18"
    },
    {
      id: "exp_4",
      title: "أدوات مكتبية وقرطاسية",
      amount: 800,
      category: "consumables",
      date: "2026-06-20"
    }
  ],
  activities: [
    {
      id: "act_1",
      activityName: "swim",
      coachId: "emp_3",
      coachName: "د. مازن جلال",
      childId: "child_1",
      childName: "يوسف عمر",
      date: "2026-06-27",
      timeSlot: "11:45"
    },
    {
      id: "act_2",
      activityName: "horse",
      coachId: "emp_5",
      coachName: "أ. هدى منصور",
      childId: "child_3",
      childName: "حمزة خالد",
      date: "2026-06-27",
      timeSlot: "14:30"
    }
  ],
  advances: [],
  leaves: [],
  bonuses: [],
  deductions: [],
  payrollRuns: [],
  auditLogs: [],
  payments: [
    {
      id: "pay_init_1",
      childId: "child_1",
      childName: "يوسف عمر",
      amount: 2400,
      date: "2026-06-01",
      month: "2026-06",
      paymentMethod: "cash",
      notes: "سداد الاشتراك الشهري بالكامل لشهر يونيو"
    },
    {
      id: "pay_init_2",
      childId: "child_2",
      childName: "سارة أحمد",
      amount: 2000,
      date: "2026-06-02",
      month: "2026-06",
      paymentMethod: "bank",
      notes: "سداد قسط نهار مع نشاط السباحة"
    }
  ]
};

// Helper to read and write database
const readDB = (): DB => {
  try {
    if (!existsSync(dbPath)) {
      writeDB(initialData);
      return initialData;
    }
    const raw = readFileSync(dbPath, 'utf8');
    const data = JSON.parse(raw) as DB;
    if (!data.children) data.children = [];
    if (!data.employees) data.employees = [];
    if (!data.sessions) data.sessions = [];
    if (!data.expenses) data.expenses = [];
    if (!data.activities) data.activities = [];
    if (!data.advances) data.advances = [];
    if (!data.leaves) data.leaves = [];
    if (!data.bonuses) data.bonuses = [];
    if (!data.deductions) data.deductions = [];
    if (!data.payrollRuns) data.payrollRuns = [];
    if (!data.auditLogs) data.auditLogs = [];
    if (!data.payments) data.payments = [];
    return data;
  } catch (err) {
    console.error('Error reading database file, returning initialData:', err);
    return initialData;
  }
};

const writeDB = (data: DB): void => {
  try {
    writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to database file:', err);
  }
};

const isStandalone = process.env['RUN_STANDALONE'] === 'true' || process.env['PORT'] === '4000';
const angularApp = isStandalone ? null : new AngularNodeAppEngine({ trustProxyHeaders: true });

// REST API Endpoints

// 1. Get all DB data
app.get('/api/data', (req, res) => {
  console.log('[Express] /api/data endpoint hit!');
  const db = readDB();
  res.json(db);
});

// 2. Child CRUD
app.post('/api/children', (req, res) => {
  const db = readDB();
  const child = req.body as Child;
  
  if (!child.id) {
    child.id = 'child_' + Date.now();
    db.children.push(child);
  } else {
    const idx = db.children.findIndex((c: Child) => c.id === child.id);
    if (idx !== -1) {
      db.children[idx] = child;
    } else {
      db.children.push(child);
    }
  }
  
  writeDB(db);
  res.json({ success: true, child });
});

app.delete('/api/children/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  
  db.children = db.children.filter((c: Child) => c.id !== id);
  // Also clean up any associated sessions for this child
  db.sessions = db.sessions.filter((s: Session) => s.childId !== id);
  
  writeDB(db);
  res.json({ success: true });
});

// 3. Employee CRUD
app.post('/api/employees', (req, res) => {
  const db = readDB();
  const employee = req.body as Employee;
  
  if (!employee.id) {
    employee.id = 'emp_' + Date.now();
    db.employees.push(employee);
  } else {
    const idx = db.employees.findIndex((e: Employee) => e.id === employee.id);
    if (idx !== -1) {
      db.employees[idx] = employee;
    } else {
      db.employees.push(employee);
    }
  }
  
  writeDB(db);
  res.json({ success: true, employee });
});

app.delete('/api/employees/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  
  db.employees = db.employees.filter((e: Employee) => e.id !== id);
  // Also clean up any sessions for this employee
  db.sessions = db.sessions.filter((s: Session) => s.employeeId !== id);
  
  writeDB(db);
  res.json({ success: true });
});

// 4. Booking Session CRUD with strictly validated Conflict Prevention
app.post('/api/sessions', (req, res) => {
  const db = readDB();
  const session = req.body as Session;
  
  // Validation: double-booking conflict prevention
  // Check if child already has a session at this date and time
  const childConflict = db.sessions.find((s: Session) => 
    s.id !== session.id &&
    s.childId === session.childId &&
    s.date === session.date &&
    s.timeSlot === session.timeSlot
  );
  
  if (childConflict) {
    res.status(400).json({ 
      error: 'conflict', 
      message: `الطفل لديه جلسة أخرى مجدولة بالفعل في نفس اليوم والتوقيت (${session.date} - ${session.timeSlot})` 
    });
    return;
  }
  
  // Check if specialist already has a session at this date and time
  const specialistConflict = db.sessions.find((s: Session) => 
    s.id !== session.id &&
    s.employeeId === session.employeeId &&
    s.date === session.date &&
    s.timeSlot === session.timeSlot
  );
  
  if (specialistConflict) {
    res.status(400).json({ 
      error: 'conflict', 
      message: `الأخصائي لديه جلسة أخرى مجدولة بالفعل في نفس اليوم والتوقيت (${session.date} - ${session.timeSlot})` 
    });
    return;
  }
  
  if (!session.id) {
    session.id = 'session_' + Date.now();
    db.sessions.push(session);
  } else {
    const idx = db.sessions.findIndex((s: Session) => s.id === session.id);
    if (idx !== -1) {
      db.sessions[idx] = session;
    } else {
      db.sessions.push(session);
    }
  }
  
  writeDB(db);
  res.json({ success: true, session });
});

app.delete('/api/sessions/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  
  db.sessions = db.sessions.filter((s: Session) => s.id !== id);
  
  writeDB(db);
  res.json({ success: true });
});

// Activities CRUD
app.post('/api/activities', (req, res) => {
  const db = readDB();
  if (!db.activities) db.activities = [];
  
  const activity = req.body as ChildActivity;
  
  // Validate double booking conflict for activity
  const childConflict = db.activities.find((a: ChildActivity) =>
    a.id !== activity.id &&
    a.childId === activity.childId &&
    a.date === activity.date &&
    a.timeSlot === activity.timeSlot
  );
  if (childConflict) {
    res.status(400).json({
      error: 'conflict',
      message: `الطفل لديه نشاط آخر مجدول بالفعل في نفس اليوم والتوقيت (${activity.date} - ${activity.timeSlot})`
    });
    return;
  }

  const coachConflict = db.activities.find((a: ChildActivity) =>
    a.id !== activity.id &&
    a.coachId === activity.coachId &&
    a.date === activity.date &&
    a.timeSlot === activity.timeSlot
  );
  if (coachConflict) {
    res.status(400).json({
      error: 'conflict',
      message: `المدرب لديه نشاط آخر مجدول بالفعل في نفس اليوم والتوقيت (${activity.date} - ${activity.timeSlot})`
    });
    return;
  }

  if (!activity.id) {
    activity.id = 'act_' + Date.now();
    db.activities.push(activity);
  } else {
    const idx = db.activities.findIndex((a: ChildActivity) => a.id === activity.id);
    if (idx !== -1) {
      db.activities[idx] = activity;
    } else {
      db.activities.push(activity);
    }
  }

  writeDB(db);
  res.json({ success: true, activity });
});

app.delete('/api/activities/:id', (req, res) => {
  const db = readDB();
  if (!db.activities) db.activities = [];
  
  const { id } = req.params;
  db.activities = db.activities.filter((a: ChildActivity) => a.id !== id);
  
  writeDB(db);
  res.json({ success: true });
});

// 5. Expense CRUD
app.post('/api/expenses', (req, res) => {
  const db = readDB();
  const expense = req.body as Expense;
  
  if (!expense.id) {
    expense.id = 'exp_' + Date.now();
    db.expenses.push(expense);
  } else {
    const idx = db.expenses.findIndex((e: Expense) => e.id === expense.id);
    if (idx !== -1) {
      db.expenses[idx] = expense;
    } else {
      db.expenses.push(expense);
    }
  }
  
  writeDB(db);
  res.json({ success: true, expense });
});

app.delete('/api/expenses/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  
  db.expenses = db.expenses.filter((e: Expense) => e.id !== id);
  
  writeDB(db);
  res.json({ success: true });
});

// Helper to log audit actions
const addAuditLog = (db: DB, action: string, user: string, details: string) => {
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    action,
    user,
    date: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0],
    details
  });
};

// 6. Salary Advances CRUD
app.post('/api/advances', (req, res) => {
  const db = readDB();
  const adv = req.body as SalaryAdvance;
  const user = req.headers['x-user-role'] as string || 'مسؤول النظام';
  
  if (!adv.id) {
    adv.id = 'adv_' + Date.now();
    adv.paidAmount = 0;
    adv.remainingBalance = adv.amount;
    adv.status = adv.status || 'approved';
    db.advances.push(adv);
    addAuditLog(db, `طلب سلفة جديدة للموظف: ${adv.employeeName}`, user, `المبلغ الإجمالي: ${adv.amount} ج.م، القسط الشهري: ${adv.monthlyInstallment || 'سداد كامل'} ج.م`);
  } else {
    const idx = db.advances.findIndex((a) => a.id === adv.id);
    if (idx !== -1) {
      adv.remainingBalance = adv.amount - (adv.paidAmount || 0);
      db.advances[idx] = adv;
      addAuditLog(db, `تعديل سلفة الموظف: ${adv.employeeName}`, user, `تعديل المبلغ إلى ${adv.amount} ج.م`);
    } else {
      db.advances.push(adv);
    }
  }
  
  writeDB(db);
  res.json({ success: true, advance: adv });
});

app.delete('/api/advances/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const user = req.headers['x-user-role'] as string || 'مسؤول النظام';
  
  const adv = db.advances.find(a => a.id === id);
  if (adv) {
    db.advances = db.advances.filter(a => a.id !== id);
    addAuditLog(db, `حذف سلفة الموظف: ${adv.employeeName}`, user, `المبلغ: ${adv.amount} ج.م`);
  }
  
  writeDB(db);
  res.json({ success: true });
});

// 7. Unpaid Leaves CRUD
app.post('/api/leaves', (req, res) => {
  const db = readDB();
  const leave = req.body as UnpaidLeave;
  const user = req.headers['x-user-role'] as string || 'مسؤول النظام';
  
  if (!leave.id) {
    leave.id = 'leave_' + Date.now();
    leave.status = leave.status || 'approved';
    db.leaves.push(leave);
    addAuditLog(db, `تسجيل إجازة بدون راتب للموظف: ${leave.employeeName}`, user, `المدة: ${leave.numberOfDays} أيام، السبب: ${leave.reason}`);
  } else {
    const idx = db.leaves.findIndex(l => l.id === leave.id);
    if (idx !== -1) {
      db.leaves[idx] = leave;
      addAuditLog(db, `تعديل إجازة الموظف: ${leave.employeeName}`, user, `المدة الجديدة: ${leave.numberOfDays} أيام`);
    } else {
      db.leaves.push(leave);
    }
  }
  
  writeDB(db);
  res.json({ success: true, leave });
});

app.delete('/api/leaves/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const user = req.headers['x-user-role'] as string || 'مسؤول النظام';
  
  const leave = db.leaves.find(l => l.id === id);
  if (leave) {
    db.leaves = db.leaves.filter(l => l.id !== id);
    addAuditLog(db, `حذف إجازة الموظف: ${leave.employeeName}`, user, `السبب: ${leave.reason}`);
  }
  
  writeDB(db);
  res.json({ success: true });
});

// 8. Bonuses CRUD
app.post('/api/bonuses', (req, res) => {
  const db = readDB();
  const bonus = req.body as Bonus;
  const user = req.headers['x-user-role'] as string || 'مسؤول النظام';
  
  if (!bonus.id) {
    bonus.id = 'bonus_' + Date.now();
    bonus.status = bonus.status || 'approved';
    db.bonuses.push(bonus);
    addAuditLog(db, `إضافة مكافأة للموظف: ${bonus.employeeName}`, user, `المبلغ: ${bonus.amount} ج.م، النوع: ${bonus.type === 'fixed' ? 'مبلغ ثابت' : 'أيام مكافأة'}`);
  } else {
    const idx = db.bonuses.findIndex(b => b.id === bonus.id);
    if (idx !== -1) {
      db.bonuses[idx] = bonus;
      addAuditLog(db, `تعديل مكافأة الموظف: ${bonus.employeeName}`, user, `المبلغ الجديد: ${bonus.amount} ج.م`);
    } else {
      db.bonuses.push(bonus);
    }
  }
  
  writeDB(db);
  res.json({ success: true, bonus });
});

app.delete('/api/bonuses/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const user = req.headers['x-user-role'] as string || 'مسؤول النظام';
  
  const bonus = db.bonuses.find(b => b.id === id);
  if (bonus) {
    db.bonuses = db.bonuses.filter(b => b.id !== id);
    addAuditLog(db, `حذف مكافأة الموظف: ${bonus.employeeName}`, user, `المبلغ: ${bonus.amount} ج.م`);
  }
  
  writeDB(db);
  res.json({ success: true });
});

// 9. Deductions CRUD
app.post('/api/deductions', (req, res) => {
  const db = readDB();
  const ded = req.body as Deduction;
  const user = req.headers['x-user-role'] as string || 'مسؤول النظام';
  
  if (!ded.id) {
    ded.id = 'ded_' + Date.now();
    ded.status = ded.status || 'approved';
    db.deductions.push(ded);
    addAuditLog(db, `إضافة خصم على الموظف: ${ded.employeeName}`, user, `المبلغ: ${ded.amount} ج.م، السبب: ${ded.notes}`);
  } else {
    const idx = db.deductions.findIndex(d => d.id === ded.id);
    if (idx !== -1) {
      db.deductions[idx] = ded;
      addAuditLog(db, `تعديل خصم الموظف: ${ded.employeeName}`, user, `المبلغ الجديد: ${ded.amount} ج.م`);
    } else {
      db.deductions.push(ded);
    }
  }
  
  writeDB(db);
  res.json({ success: true, deduction: ded });
});

app.delete('/api/deductions/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const user = req.headers['x-user-role'] as string || 'مسؤول النظام';
  
  const ded = db.deductions.find(d => d.id === id);
  if (ded) {
    db.deductions = db.deductions.filter(d => d.id !== id);
    addAuditLog(db, `حذف خصم الموظف: ${ded.employeeName}`, user, `المبلغ: ${ded.amount} ج.م`);
  }
  
  writeDB(db);
  res.json({ success: true });
});

// 10. Payroll Runs Management
app.post('/api/payroll', (req, res) => {
  const db = readDB();
  const run = req.body as PayrollRun;
  const user = req.headers['x-user-role'] as string || 'مسؤول النظام';
  
  // Duplicate prevention check for new runs
  if (!run.id) {
    const exists = db.payrollRuns.find(r => r.employeeId === run.employeeId && r.month === run.month);
    if (exists) {
      res.status(400).json({ error: 'duplicate', message: 'لقد تم بالفعل إنشاء مسير رواتب لهذا الموظف لنفس الشهر المالي المحدد.' });
      return;
    }
    run.id = 'run_' + Date.now();
    db.payrollRuns.push(run);
    
    addAuditLog(db, `إنشاء مسير رواتب للموظف: ${run.employeeName}`, user, `الشهر: ${run.month}، صافي الراتب: ${run.netSalary} ج.م`);
  } else {
    const idx = db.payrollRuns.findIndex(r => r.id === run.id);
    if (idx !== -1) {
      const oldRun = db.payrollRuns[idx];
      
      // If status changed to PAID, automate loan installment deduction!
      if (run.status === 'paid' && oldRun.status !== 'paid') {
        if (run.advanceDeduction > 0) {
          // Find active loans for this employee
          const activeAdvances = db.advances.filter(a => a.employeeId === run.employeeId && a.status === 'approved');
          let dedRemaining = run.advanceDeduction;
          
          for (const adv of activeAdvances) {
            if (dedRemaining <= 0) break;
            const toDeduct = Math.min(dedRemaining, adv.remainingBalance);
            adv.paidAmount = Number((adv.paidAmount + toDeduct).toFixed(2));
            adv.remainingBalance = Number((adv.amount - adv.paidAmount).toFixed(2));
            dedRemaining -= toDeduct;
            
            if (adv.remainingBalance <= 0) {
              adv.status = 'completed';
              addAuditLog(db, `تسوية كاملة لسلفة الموظف: ${run.employeeName}`, 'الرواتب التلقائية', `تم سداد السلفة بالكامل بمبلغ ${adv.amount} ج.م`);
            } else {
              addAuditLog(db, `خصم قسط من سلفة الموظف: ${run.employeeName}`, 'الرواتب التلقائية', `خصم مبلغ قسط ${toDeduct} ج.م، المتبقي: ${adv.remainingBalance} ج.م`);
            }
          }
        }
      }
      
      db.payrollRuns[idx] = run;
      addAuditLog(db, `تحديث مسير رواتب للموظف: ${run.employeeName}`, user, `الشهر: ${run.month}، الحالة: ${run.status}`);
    } else {
      db.payrollRuns.push(run);
    }
  }
  
  writeDB(db);
  res.json({ success: true, payrollRun: run });
});

app.delete('/api/payroll/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const user = req.headers['x-user-role'] as string || 'مسؤول النظام';
  
  const run = db.payrollRuns.find(r => r.id === id);
  if (run) {
    // If the run is PAID, and we delete it, optionally revert the advance balance
    if (run.status === 'paid' && run.advanceDeduction > 0) {
      // Find advances for this employee that are completed or approved
      const advances = db.advances.filter(a => a.employeeId === run.employeeId && (a.status === 'approved' || a.status === 'completed'));
      let refundRemaining = run.advanceDeduction;
      for (const adv of advances) {
        if (refundRemaining <= 0) break;
        const refund = Math.min(refundRemaining, adv.paidAmount);
        adv.paidAmount = Number((adv.paidAmount - refund).toFixed(2));
        adv.remainingBalance = Number((adv.amount - adv.paidAmount).toFixed(2));
        refundRemaining -= refund;
        
        if (adv.status === 'completed' && adv.remainingBalance > 0) {
          adv.status = 'approved';
        }
        addAuditLog(db, `إلغاء خصم سلفة الموظف: ${run.employeeName}`, 'الرواتب التلقائية', `إعادة رصيد قدره ${refund} ج.م، المتبقي: ${adv.remainingBalance} ج.م`);
      }
    }
    
    db.payrollRuns = db.payrollRuns.filter(r => r.id !== id);
    addAuditLog(db, `حذف مسير رواتب الموظف: ${run.employeeName}`, user, `الشهر: ${run.month}، الصافي: ${run.netSalary} ج.م`);
  }
  
  writeDB(db);
  res.json({ success: true });
});

// 10.5. Child Payments CRUD
app.post('/api/payments', (req, res) => {
  const db = readDB();
  const payment = req.body as ChildPayment;
  const user = decodeURIComponent(req.headers['x-user-role'] as string || 'مسؤول');
  
  if (!db.payments) db.payments = [];
  
  if (!payment.id) {
    payment.id = 'pay_' + Date.now();
    db.payments.push(payment);
    addAuditLog(db, `تسجيل سداد اشتراك للطفل: ${payment.childName}`, user, `المبلغ: ${payment.amount} ج.م، الشهر: ${payment.month}`);
  } else {
    const idx = db.payments.findIndex((p: ChildPayment) => p.id === payment.id);
    if (idx !== -1) {
      db.payments[idx] = payment;
      addAuditLog(db, `تعديل سداد اشتراك للطفل: ${payment.childName}`, user, `المبلغ: ${payment.amount} ج.م، الشهر: ${payment.month}`);
    } else {
      db.payments.push(payment);
    }
  }
  
  writeDB(db);
  res.json({ success: true, payment });
});

app.delete('/api/payments/:id', (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const user = decodeURIComponent(req.headers['x-user-role'] as string || 'مسؤول');
  
  if (db.payments) {
    const payment = db.payments.find((p: ChildPayment) => p.id === id);
    if (payment) {
      addAuditLog(db, `حذف سداد اشتراك للطفل: ${payment.childName}`, user, `المبلغ: ${payment.amount} ج.م، الشهر: ${payment.month}`);
    }
    db.payments = db.payments.filter((p: ChildPayment) => p.id !== id);
  }
  
  writeDB(db);
  res.json({ success: true });
});

// 11. Audit Logs Retrieve
app.get('/api/audit-logs', (req, res) => {
  const db = readDB();
  res.json(db.auditLogs || []);
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  if (!angularApp) {
    return next();
  }
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id'] || process.env['RUN_STANDALONE'] === 'true' || process.env['PORT'] === '4000') {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
