import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface Child {
  id?: string;
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
  swimmingFee?: number;
  horsebackFee?: number;
  diagnosis?: string;
  photoUrl?: string;
}

export interface Employee {
  id?: string;
  name: string;
  phone: string;
  gradYear: number;
  salary: number;
  role: 'secretary' | 'nanny' | 'worker' | 'specialist' | 'supervisor';
  specialties: string[];
  swimFee?: number;
  horseFee?: number;
  isBooked?: boolean;
}

export interface Session {
  id?: string;
  childId: string;
  childName: string;
  employeeId: string;
  employeeName: string;
  specialty: string;
  date: string;
  timeSlot: string;
  type: 'morning' | 'evening' | 'individual';
}

export interface Expense {
  id?: string;
  title: string;
  amount: number;
  category: 'center_rent' | 'pool_rent' | 'horse_rent' | 'electricity_bill' | 'water_bill' | 'gas_bill' | 'phone_internet_bill' | 'cleaning_supplies' | 'consumables' | 'durable_tools' | 'salaries' | 'rent' | 'bills' | 'purchases' | 'other';
  date: string;
}

export interface ChildActivity {
  id?: string;
  activityName: 'swim' | 'horse' | 'skills' | 'recreational' | string;
  coachId: string;
  coachName: string;
  childId: string;
  childName: string;
  date: string;
  timeSlot: string;
}

export interface SalaryAdvance {
  id?: string;
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

export interface UnpaidLeave {
  id?: string;
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

export interface Bonus {
  id?: string;
  employeeId: string;
  employeeName: string;
  type: 'fixed' | 'one_day' | 'multi_day';
  amount: number;
  daysCount?: number;
  date: string;
  notes: string;
  status: 'pending' | 'approved';
}

export interface Deduction {
  id?: string;
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

export interface PayrollRun {
  id?: string;
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

export interface AuditLog {
  id?: string;
  action: string;
  user: string;
  date: string;
  details: string;
}

export interface ChildPayment {
  id?: string;
  childId: string;
  childName: string;
  amount: number;
  date: string;
  month: string;
  paymentMethod: 'cash' | 'bank' | string;
  notes?: string;
}

interface DBPayload {
  children?: Child[];
  employees?: Employee[];
  sessions?: Session[];
  expenses?: Expense[];
  activities?: ChildActivity[];
  advances?: SalaryAdvance[];
  leaves?: UnpaidLeave[];
  bonuses?: Bonus[];
  deductions?: Deduction[];
  payrollRuns?: PayrollRun[];
  auditLogs?: AuditLog[];
  payments?: ChildPayment[];
}

@Injectable({
  providedIn: 'root'
})
export class AppState {
  children = signal<Child[]>([]);
  employees = signal<Employee[]>([]);
  sessions = signal<Session[]>([]);
  expenses = signal<Expense[]>([]);
  activities = signal<ChildActivity[]>([]);
  advances = signal<SalaryAdvance[]>([]);
  leaves = signal<UnpaidLeave[]>([]);
  bonuses = signal<Bonus[]>([]);
  deductions = signal<Deduction[]>([]);
  payrollRuns = signal<PayrollRun[]>([]);
  auditLogs = signal<AuditLog[]>([]);
  payments = signal<ChildPayment[]>([]);
  
  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  // Role-Based Access Control State
  // Allows testing all 3 user roles: Admin, Secretary, Specialist
  selectedRole = signal<'admin' | 'secretary' | 'specialist'>('admin');
  
  // If the selected role is Specialist, we can select which specialist we are mimicking
  selectedSpecialistId = signal<string>('emp_1');

  private platformId = inject(PLATFORM_ID);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadAllData().catch(err => {
        console.error('Failed to run initial loadAllData:', err);
      });
    } else {
      this.isLoading.set(false);
    }
  }

  // Calculate current age from DOB
  calculateAge(dobString: string): string {
    if (!dobString) return '';
    const birthDate = new Date(dobString);
    const today = new Date();
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months += 12;
    }
    
    if (years === 0) {
      return `${months} أشهر`;
    }
    
    if (months === 0) {
      return `${years} سنوات`;
    }
    
    return `${years} سنوات و ${months} أشهر`;
  }

  async loadAllData() {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const maxRetries = 3;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Data Service] Loading all data (Attempt ${attempt}/${maxRetries})...`);
        const res = await fetch('/api/data');
        if (!res.ok) {
          throw new Error(`فشل تحميل البيانات من الخادم (كود الاستجابة: ${res.status})`);
        }
        const data = await res.json() as DBPayload;
        this.children.set(data.children || []);
        this.employees.set(data.employees || []);
        this.sessions.set(data.sessions || []);
        this.expenses.set(data.expenses || []);
        this.activities.set(data.activities || []);
        this.advances.set(data.advances || []);
        this.leaves.set(data.leaves || []);
        this.bonuses.set(data.bonuses || []);
        this.deductions.set(data.deductions || []);
        this.payrollRuns.set(data.payrollRuns || []);
        this.auditLogs.set(data.auditLogs || []);
        this.payments.set(data.payments || []);
        
        // Success!
        this.errorMessage.set(null);
        this.isLoading.set(false);
        return;
      } catch (err: unknown) {
        console.error(`[Data Service] Attempt ${attempt} failed:`, err);
        lastError = err;
        if (attempt < maxRetries) {
          // Wait before retrying (e.g. 500ms, 1000ms)
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        }
      }
    }

    // All retries failed
    const msg = lastError instanceof Error ? lastError.message : 'خطأ أثناء الاتصال بالخادم بعد عدة محاولات';
    this.errorMessage.set(msg);
    this.isLoading.set(false);
  }

  async saveChild(child: Child) {
    this.isLoading.set(true);
    try {
      // If fees are not provided, compute them as fallback, otherwise keep the manual values
      if (child.baseFee === undefined || child.baseFee === null) {
        let base = 1500;
        if (child.careType === 'evening') base = 1800;
        if (child.careType === 'individual') base = 2000;
        child.baseFee = base;
      }

      if (child.totalFee === undefined || child.totalFee === null) {
        let extra = 0;
        if (child.swimming) extra += (child.swimmingFee !== undefined ? child.swimmingFee : 400);
        if (child.horseback) extra += (child.horsebackFee !== undefined ? child.horsebackFee : 500);
        child.totalFee = child.baseFee + extra;
      }

      const res = await fetch('/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(child)
      });
      if (!res.ok) throw new Error('فشل حفظ بيانات الطفل');
      await this.loadAllData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حفظ البيانات';
      this.errorMessage.set(msg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteChild(id: string) {
    this.isLoading.set(true);
    try {
      const res = await fetch(`/api/children/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('فشل حذف الطفل');
      await this.loadAllData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حذف البيانات';
      this.errorMessage.set(msg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveEmployee(employee: Employee) {
    this.isLoading.set(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employee)
      });
      if (!res.ok) throw new Error('فشل حفظ بيانات الموظف');
      await this.loadAllData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حفظ الموظف';
      this.errorMessage.set(msg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteEmployee(id: string) {
    this.isLoading.set(true);
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('فشل حذف الموظف');
      await this.loadAllData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حذف الموظف';
      this.errorMessage.set(msg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveSession(session: Session) {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
      });
      if (!res.ok) {
        const errorData = await res.json() as { message?: string };
        throw new Error(errorData.message || 'فشل حفظ الجلسة');
      }
      await this.loadAllData();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حفظ الجلسة';
      this.errorMessage.set(msg);
      return { success: false, message: msg };
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteSession(id: string) {
    this.isLoading.set(true);
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('فشل إلغاء الجلسة');
      await this.loadAllData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حذف الجلسة';
      this.errorMessage.set(msg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveExpense(expense: Expense) {
    this.isLoading.set(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
      });
      if (!res.ok) throw new Error('فشل حفظ المصروف');
      await this.loadAllData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حفظ المصروف';
      this.errorMessage.set(msg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteExpense(id: string) {
    this.isLoading.set(true);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('فشل حذف المصروف');
      await this.loadAllData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حذف المصروف';
      this.errorMessage.set(msg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveActivity(activity: ChildActivity) {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity)
      });
      if (!res.ok) {
        const errorData = await res.json() as { message?: string };
        throw new Error(errorData.message || 'فشل حفظ النشاط');
      }
      await this.loadAllData();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حفظ النشاط';
      this.errorMessage.set(msg);
      return { success: false, message: msg };
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteActivity(id: string) {
    this.isLoading.set(true);
    try {
      const res = await fetch(`/api/activities/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('فشل إلغاء النشاط');
      await this.loadAllData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء إلغاء النشاط';
      this.errorMessage.set(msg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  private getUserRoleHeader(): string {
    const roleMap: Record<string, string> = {
      admin: 'مدير النظام (أدمن)',
      secretary: 'السكرتارية',
      specialist: 'أخصائي'
    };
    return roleMap[this.selectedRole()] || 'مسؤول';
  }

  async saveAdvance(adv: SalaryAdvance) {
    this.isLoading.set(true);
    try {
      const res = await fetch('/api/advances', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': encodeURIComponent(this.getUserRoleHeader())
        },
        body: JSON.stringify(adv)
      });
      if (!res.ok) throw new Error('فشل حفظ السلفة');
      await this.loadAllData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حفظ السلفة';
      this.errorMessage.set(msg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteAdvance(id: string) {
    this.isLoading.set(true);
    try {
      const res = await fetch(`/api/advances/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': encodeURIComponent(this.getUserRoleHeader()) }
      });
      if (!res.ok) throw new Error('فشل حذف السلفة');
      await this.loadAllData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حذف السلفة';
      this.errorMessage.set(msg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveLeave(leave: UnpaidLeave) {
    this.isLoading.set(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': encodeURIComponent(this.getUserRoleHeader())
        },
        body: JSON.stringify(leave)
      });
      if (!res.ok) throw new Error('فشل حفظ الإجازة');
      await this.loadAllData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حفظ الإجازة';
      this.errorMessage.set(msg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteLeave(id: string) {
    this.isLoading.set(true);
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': encodeURIComponent(this.getUserRoleHeader()) }
      });
      if (!res.ok) throw new Error('فشل حذف الإجازة');
      await this.loadAllData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حذف الإجازة';
      this.errorMessage.set(msg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveBonus(bonus: Bonus) {
    this.isLoading.set(true);
    try {
      const res = await fetch('/api/bonuses', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': encodeURIComponent(this.getUserRoleHeader())
        },
        body: JSON.stringify(bonus)
      });
      if (!res.ok) throw new Error('فشل حفظ المكافأة');
      await this.loadAllData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حفظ المكافأة';
      this.errorMessage.set(msg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteBonus(id: string) {
    this.isLoading.set(true);
    try {
      const res = await fetch(`/api/bonuses/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': encodeURIComponent(this.getUserRoleHeader()) }
      });
      if (!res.ok) throw new Error('فشل حذف المكافأة');
      await this.loadAllData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حذف المكافأة';
      this.errorMessage.set(msg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveDeduction(ded: Deduction) {
    this.isLoading.set(true);
    try {
      const res = await fetch('/api/deductions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': encodeURIComponent(this.getUserRoleHeader())
        },
        body: JSON.stringify(ded)
      });
      if (!res.ok) throw new Error('فشل حفظ الخصم');
      await this.loadAllData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حفظ الخصم';
      this.errorMessage.set(msg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteDeduction(id: string) {
    this.isLoading.set(true);
    try {
      const res = await fetch(`/api/deductions/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': encodeURIComponent(this.getUserRoleHeader()) }
      });
      if (!res.ok) throw new Error('فشل حذف الخصم');
      await this.loadAllData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حذف الخصم';
      this.errorMessage.set(msg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async savePayrollRun(run: PayrollRun) {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': encodeURIComponent(this.getUserRoleHeader())
        },
        body: JSON.stringify(run)
      });
      if (!res.ok) {
        const errData = await res.json() as { message?: string };
        throw new Error(errData.message || 'فشل حفظ مسير الراتب');
      }
      await this.loadAllData();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حفظ مسير الراتب';
      this.errorMessage.set(msg);
      return { success: false, message: msg };
    } finally {
      this.isLoading.set(false);
    }
  }

  async deletePayrollRun(id: string) {
    this.isLoading.set(true);
    try {
      const res = await fetch(`/api/payroll/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': encodeURIComponent(this.getUserRoleHeader()) }
      });
      if (!res.ok) throw new Error('فشل حذف مسير الراتب');
      await this.loadAllData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حذف مسير الراتب';
      this.errorMessage.set(msg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async savePayment(payment: ChildPayment) {
    this.isLoading.set(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payment)
      });
      if (!res.ok) throw new Error('فشل حفظ السداد');
      await this.loadAllData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حفظ السداد';
      this.errorMessage.set(msg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async deletePayment(id: string) {
    this.isLoading.set(true);
    try {
      const res = await fetch(`/api/payments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('فشل حذف السداد');
      await this.loadAllData();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ أثناء حذف السداد';
      this.errorMessage.set(msg);
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }
}
