/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectionStrategy, Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppState, Child, Employee, Session, Expense, ChildActivity, SalaryAdvance, UnpaidLeave, Bonus, Deduction } from './data';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  state = inject(AppState);
  fb = inject(FormBuilder);

  // Navigation State
  currentTab = signal<'dashboard' | 'children' | 'employees' | 'sessions' | 'finance' | 'payroll'>('dashboard');

  // Currently selected Child in the sidebar/detail card on dashboard
  selectedChildId = signal<string | null>(null);

  // Computed: currently selected child object
  selectedChild = computed(() => {
    const id = this.selectedChildId();
    if (!id) {
      // Default to first child if none is selected
      const list = this.state.children();
      return list.length > 0 ? list[0] : null;
    }
    return this.state.children().find(c => c.id === id) || null;
  });

  // Computed: currently selected child in payment form
  selectedPaymentChild = computed(() => {
    const id = this.paymentChildId();
    if (!id) return null;
    return this.state.children().find(c => c.id === id) || null;
  });

  // Filters
  childSearchQuery = signal<string>('');
  employeeSearchQuery = signal<string>('');
  expenseFilterCategory = signal<string>('all');
  sessionChildSearchQuery = signal<string>('');

  // Payroll Filters & Active Views
  selectedPayrollMonth = signal<string>('2026-06');
  selectedPayrollDepartment = signal<string>('all');
  payrollSearchQuery = signal<string>('');
  payrollViewMode = signal<'dashboard' | 'runs' | 'advances' | 'leaves' | 'bonuses' | 'deductions' | 'logs'>('dashboard');

  // Modals Visibility
  isChildModalOpen = signal(false);
  isEmployeeModalOpen = signal(false);
  isSessionModalOpen = signal(false);
  isExpenseModalOpen = signal(false);
  isActivityModalOpen = signal(false);
  isPaymentModalOpen = signal(false);
  editingPaymentId = signal<string | null>(null);
  financeViewMode = signal<'expenses' | 'payments'>('expenses');

  // Payroll Modals Visibility
  isAdvanceModalOpen = signal(false);
  isLeaveModalOpen = signal(false);
  isBonusModalOpen = signal(false);
  isDeductionModalOpen = signal(false);
  isPayslipModalOpen = signal(false);

  // Selected Payslip object
  selectedRunForPayslip = signal<any | null>(null);

  // Editing State IDs (null means creating new)
  editingChildId = signal<string | null>(null);
  childFormSubmitAttempted = signal<boolean>(false);
  editingEmployeeId = signal<string | null>(null);
  editingExpenseId = signal<string | null>(null);

  // Payment Form State Signals for UI breakdown
  paymentChildId = signal<string>('');
  paymentMonth = signal<string>('');
  paymentAmount = signal<number>(0);

  // Payroll Editing State IDs
  editingAdvanceId = signal<string | null>(null);
  editingLeaveId = signal<string | null>(null);
  editingBonusId = signal<string | null>(null);
  editingDeductionId = signal<string | null>(null);

  // Reactive Forms
  childForm!: FormGroup;
  employeeForm!: FormGroup;
  sessionForm!: FormGroup;
  expenseForm!: FormGroup;
  activityForm!: FormGroup;
  paymentForm!: FormGroup;

  // Payroll Reactive Forms
  advanceForm!: FormGroup;
  leaveForm!: FormGroup;
  bonusForm!: FormGroup;
  deductionForm!: FormGroup;

  eligibleCoaches = computed(() => {
    return this.state.employees().filter(e => e.role === 'specialist' || e.role === 'supervisor');
  });

  // Search/Filters Computed Signals
  filteredChildren = computed(() => {
    const query = this.childSearchQuery().toLowerCase().trim();
    if (!query) return this.state.children();
    return this.state.children().filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.phone.includes(query) || 
      c.address.toLowerCase().includes(query)
    );
  });

  filteredSessionChildren = computed(() => {
    const query = this.sessionChildSearchQuery().toLowerCase().trim();
    const childrenList = this.state.children();
    if (!query) return childrenList;
    return childrenList.filter(c => {
      const nameMatch = c.name.toLowerCase().includes(query);
      const phoneMatch = c.phone.includes(query);
      const idMatch = c.id ? c.id.toLowerCase().includes(query) : false;
      return nameMatch || phoneMatch || idMatch;
    });
  });

  filteredEmployees = computed(() => {
    const query = this.employeeSearchQuery().toLowerCase().trim();
    if (!query) return this.state.employees();
    return this.state.employees().filter(e => 
      e.name.toLowerCase().includes(query) || 
      e.phone.includes(query) || 
      this.getRoleName(e.role).toLowerCase().includes(query)
    );
  });

  filteredExpenses = computed(() => {
    const cat = this.expenseFilterCategory();
    if (cat === 'all') return this.state.expenses();
    return this.state.expenses().filter(e => e.category === cat);
  });

  // Financial Stats Computed Signals
  // Financial Ledger Overview cards
  totalExpectedRevenues = computed(() => {
    return this.state.children().reduce((sum, c) => sum + c.totalFee, 0);
  });

  totalRevenues = computed(() => {
    return this.state.payments().reduce((sum, p) => sum + p.amount, 0);
  });

  totalSalaries = computed(() => {
    return this.state.employees().reduce((sum, e) => {
      const extraSwim = (e.specialties.includes('swim') && e.swimFee) ? Number(e.swimFee) : 0;
      const extraHorse = (e.specialties.includes('horse') && e.horseFee) ? Number(e.horseFee) : 0;
      return sum + e.salary + extraSwim + extraHorse;
    }, 0);
  });

  totalOtherExpenses = computed(() => {
    return this.state.expenses().reduce((sum, e) => sum + e.amount, 0);
  });

  totalExpenses = computed(() => {
    return this.totalSalaries() + this.totalOtherExpenses();
  });

  netProfit = computed(() => {
    return this.totalRevenues() - this.totalExpenses();
  });

  // Booking & Specialist Availability Calculation Helper
  // Filters specialists dynamically based on selected specialty & schedule availability
  availableSpecialists = computed(() => {
    const specialty = this.sessionForm.get('specialty')?.value;
    const date = this.sessionForm.get('date')?.value;
    const timeSlot = this.sessionForm.get('timeSlot')?.value;

    if (!specialty) return [];

    // Filter specialists who handle this specialty
    let specialists = this.state.employees().filter(e => 
      (e.role === 'specialist' || e.role === 'supervisor') && 
      e.specialties.includes(specialty)
    );

    // If date and timeSlot are filled, check schedule for conflicts
    if (date && timeSlot) {
      specialists = specialists.map(s => {
        const isBooked = this.state.sessions().some(session => 
          session.id !== this.sessionForm.get('id')?.value &&
          session.employeeId === s.id &&
          session.date === date &&
          session.timeSlot === timeSlot
        );
        return {
          ...s,
          isBooked
        };
      });
    }

    return specialists;
  });

  // Dynamic filter for kids matching selected care type in Booking Wizard
  eligibleChildren = computed(() => {
    const careType = this.sessionForm.get('type')?.value;
    if (!careType) return this.state.children();
    return this.state.children().filter(c => c.careType === careType);
  });

  // Convert specialty code to Arabic name
  getSpecialtyName(code: string): string {
    const map: Record<string, string> = {
      'skills': 'تنمية مهارات',
      'speech': 'تخاطب',
      'vocational': 'تأهيل مهني',
      'academic': 'أكاديمي',
      'motor': 'حركي',
      'sensory': 'حسي',
      'swim': 'سباحة',
      'horse': 'ركوب خيل'
    };
    return map[code] || code;
  }

  // Get job title/role name in Arabic
  getRoleName(role: string): string {
    const map: Record<string, string> = {
      'secretary': 'سكرتير',
      'nanny': 'حاضنة',
      'worker': 'عامل',
      'specialist': 'أخصائي',
      'supervisor': 'مشرف'
    };
    return map[role] || role;
  }

  // Get Expense category name in Arabic
  getExpenseCategoryName(cat: string): string {
    const map: Record<string, string> = {
      'center_rent': 'إيجار المركز',
      'pool_rent': 'إيجار المسبح',
      'horse_rent': 'إيجار الخيل',
      'electricity_bill': 'فواتير كهرباء',
      'water_bill': 'فواتير مياة',
      'gas_bill': 'فواتير غاز',
      'phone_internet_bill': 'فواتير تلفون وانترنت',
      'cleaning_supplies': 'أدوات نظافة',
      'consumables': 'أدوات مستهلكة',
      'durable_tools': 'أدوات دائمة الاستخدام',
      'salaries': 'رواتب الموظفين',
      'rent': 'إيجار المقر',
      'bills': 'فواتير وخدمات',
      'purchases': 'مشتريات وأدوات',
      'other': 'مصاريف أخرى'
    };
    return map[cat] || cat;
  }

  // Get care type in Arabic
  getCareTypeName(type: string): string {
    const map: Record<string, string> = {
      'day': 'رعاية نهارية',
      'evening': 'رعاية مسائية',
      'individual': 'جلسات فردية'
    };
    return map[type] || type;
  }

  // Active Specialist Sessions computed based on mimic settings
  specialistSessions = computed(() => {
    const specId = this.state.selectedSpecialistId();
    return this.state.sessions().filter(s => s.employeeId === specId);
  });

  // Active Specialist Kids computed based on mimic settings
  specialistChildren = computed(() => {
    const sessions = this.specialistSessions();
    const kidIds = new Set(sessions.map(s => s.childId));
    return this.state.children().filter(c => kidIds.has(c.id || ''));
  });

  constructor() {
    this.initForms();
    
    // Auto-recalculate Child totalFee in form dynamically as selections change
    effect(() => {
      if (this.childForm) {
        this.childForm.get('careType')?.valueChanges.subscribe((careType) => {
          let base = 1500;
          if (careType === 'evening') base = 1800;
          if (careType === 'individual') base = 2000;
          this.childForm.patchValue({ baseFee: base }, { emitEvent: false });
          this.updateFormFee();
        });
        this.childForm.get('swimming')?.valueChanges.subscribe(() => this.updateFormFee());
        this.childForm.get('horseback')?.valueChanges.subscribe(() => this.updateFormFee());
        this.childForm.get('baseFee')?.valueChanges.subscribe(() => this.updateFormFee());
        this.childForm.get('swimmingFee')?.valueChanges.subscribe(() => this.updateFormFee());
        this.childForm.get('horsebackFee')?.valueChanges.subscribe(() => this.updateFormFee());
      }
    });
  }

  initForms() {
    // 1. Child Form
    this.childForm = this.fb.group({
      id: [null],
      name: ['', [Validators.required, Validators.minLength(3)]],
      dob: ['', Validators.required],
      address: [''],
      phone: ['', [Validators.required, Validators.pattern(/^01[0-9]{9}$/)]],
      whatsapp: [''],
      careType: ['day', Validators.required],
      // Specialties checklists as booleans
      skills: [false],
      speech: [false],
      vocational: [false],
      academic: [false],
      motor: [false],
      sensory: [false],
      swim: [false],
      horse: [false],
      swimming: [false],
      horseback: [false],
      baseFee: [1500],
      swimmingFee: [400],
      horsebackFee: [500],
      totalFee: [1500],
      diagnosis: [''],
      photoUrl: ['']
    });

    // Handle conditional fields for individual sessions in Child Form
    this.childForm.get('careType')?.valueChanges.subscribe(val => {
      if (val !== 'individual') {
        // Uncheck all specialties if not individual care type
        this.childForm.patchValue({
          skills: false, speech: false, vocational: false,
          academic: false, motor: false, sensory: false,
          swim: false, horse: false
        });
      }
    });

    // 2. Employee Form
    this.employeeForm = this.fb.group({
      id: [null],
      name: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required, Validators.pattern(/^01[0-9]{9}$/)]],
      gradYear: [new Date().getFullYear() - 5, [Validators.required, Validators.min(1970), Validators.max(new Date().getFullYear())]],
      salary: [4000, [Validators.required, Validators.min(1)]],
      role: ['specialist', Validators.required],
      // Specialty checklists
      skills: [false],
      speech: [false],
      vocational: [false],
      academic: [false],
      motor: [false],
      sensory: [false],
      swim: [false],
      horse: [false],
      swimFee: [0],
      horseFee: [0]
    });

    // Handle required specialty conditional logic for Specialist / Supervisor roles
    this.employeeForm.get('role')?.valueChanges.subscribe(val => {
      if (val !== 'specialist' && val !== 'supervisor') {
        this.employeeForm.patchValue({
          skills: false, speech: false, vocational: false,
          academic: false, motor: false, sensory: false,
          swim: false, horse: false,
          swimFee: 0,
          horseFee: 0
        });
      }
    });

    // 3. Session Form
    this.sessionForm = this.fb.group({
      id: [null],
      type: ['individual', Validators.required],
      childId: ['', Validators.required],
      specialty: ['', Validators.required],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      timeSlot: ['09:00', Validators.required],
      employeeId: ['', Validators.required]
    });

    // 4. Activity Form
    this.activityForm = this.fb.group({
      id: [null],
      activityName: ['swim', Validators.required],
      childId: ['', Validators.required],
      coachId: ['', Validators.required],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      timeSlot: ['11:45', Validators.required]
    });

    // Dynamically filter session specialties based on selected child
    this.sessionForm.get('childId')?.valueChanges.subscribe(childId => {
      const child = this.state.children().find(c => c.id === childId);
      if (child) {
        // Auto-match session type to child's care type
        this.sessionForm.patchValue({ type: child.careType });
        if (child.careType === 'individual' && child.specialties.length > 0) {
          // Default to child's first requested specialty
          this.sessionForm.patchValue({ specialty: child.specialties[0] });
        } else if (child.careType !== 'individual') {
          // Default placeholder for non-individual care session categories
          this.sessionForm.patchValue({ specialty: 'skills' });
        }
      }
    });

    // 4. Expense Form
    this.expenseForm = this.fb.group({
      id: [null],
      title: ['', [Validators.required, Validators.minLength(4)]],
      amount: [null, [Validators.required, Validators.min(1)]],
      category: ['purchases', Validators.required],
      date: [new Date().toISOString().split('T')[0], Validators.required]
    });

    // 9. Payment Form (Subscription Payment)
    this.paymentForm = this.fb.group({
      id: [null],
      childId: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(1)]],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      month: [new Date().toISOString().slice(0, 7), Validators.required],
      paymentMethod: ['cash', Validators.required],
      notes: ['']
    });

    // Auto calculate amount and update signals when child/month is selected
    this.paymentForm.get('childId')?.valueChanges.subscribe(childId => {
      this.paymentChildId.set(childId || '');
      if (childId) {
        const child = this.state.children().find(c => c.id === childId);
        if (child) {
          const m = this.paymentForm.get('month')?.value || '';
          const unpaid = this.getChildRemainingFee(childId, m, this.editingPaymentId());
          this.paymentForm.get('amount')?.setValue(unpaid, { emitEvent: false });
          this.paymentAmount.set(unpaid);
        }
      } else {
        this.paymentAmount.set(0);
      }
    });

    this.paymentForm.get('month')?.valueChanges.subscribe(month => {
      this.paymentMonth.set(month || '');
      const childId = this.paymentForm.get('childId')?.value;
      if (childId) {
        const unpaid = this.getChildRemainingFee(childId, month || '', this.editingPaymentId());
        this.paymentForm.get('amount')?.setValue(unpaid, { emitEvent: false });
        this.paymentAmount.set(unpaid);
      }
    });

    this.paymentForm.get('amount')?.valueChanges.subscribe(amount => {
      this.paymentAmount.set(Number(amount) || 0);
    });

    // 5. Advance Form
    this.advanceForm = this.fb.group({
      id: [null],
      employeeId: ['', Validators.required],
      amount: [1000, [Validators.required, Validators.min(1)]],
      monthlyInstallment: [0, [Validators.min(0)]], // 0 means pay whole sum
      installmentsCount: [1, [Validators.required, Validators.min(1)]],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      paymentMethod: ['cash', Validators.required],
      notes: ['']
    });

    // Auto calculate installments
    this.advanceForm.get('amount')?.valueChanges.subscribe(() => {
      this.updateAdvanceInstallments();
    });
    this.advanceForm.get('installmentsCount')?.valueChanges.subscribe(() => {
      this.updateAdvanceInstallments();
    });

    // 6. Leave Form
    this.leaveForm = this.fb.group({
      id: [null],
      employeeId: ['', Validators.required],
      startDate: [new Date().toISOString().split('T')[0], Validators.required],
      endDate: [new Date().toISOString().split('T')[0], Validators.required],
      numberOfDays: [1, [Validators.required, Validators.min(1)]],
      reason: ['', Validators.required],
      approvedBy: ['مسؤول الموارد البشرية', Validators.required],
      notes: ['']
    });

    // Auto count leave days between start and end date
    this.leaveForm.get('startDate')?.valueChanges.subscribe(() => this.updateLeaveDaysCount());
    this.leaveForm.get('endDate')?.valueChanges.subscribe(() => this.updateLeaveDaysCount());

    // 7. Bonus Form
    this.bonusForm = this.fb.group({
      id: [null],
      employeeId: ['', Validators.required],
      type: ['fixed', Validators.required],
      amount: [0, [Validators.required, Validators.min(1)]],
      daysCount: [1, [Validators.min(1)]],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      notes: ['']
    });

    // Auto-calculate bonus amount
    this.bonusForm.get('employeeId')?.valueChanges.subscribe(() => this.updateBonusAmount());
    this.bonusForm.get('type')?.valueChanges.subscribe(() => this.updateBonusAmount());
    this.bonusForm.get('daysCount')?.valueChanges.subscribe(() => this.updateBonusAmount());

    // 8. Deduction Form
    this.deductionForm = this.fb.group({
      id: [null],
      employeeId: ['', Validators.required],
      type: ['absence', Validators.required],
      amount: [0, [Validators.required, Validators.min(1)]],
      daysCount: [1, [Validators.min(1)]],
      sessionsCount: [1, [Validators.min(1)]],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      notes: ['']
    });

    // Auto-calculate deduction amount
    this.deductionForm.get('employeeId')?.valueChanges.subscribe(() => this.updateDeductionAmount());
    this.deductionForm.get('type')?.valueChanges.subscribe(() => this.updateDeductionAmount());
    this.deductionForm.get('daysCount')?.valueChanges.subscribe(() => this.updateDeductionAmount());
    this.deductionForm.get('sessionsCount')?.valueChanges.subscribe(() => this.updateDeductionAmount());
  }

  updateAdvanceInstallments() {
    const amt = Number(this.advanceForm.get('amount')?.value || 0);
    const count = Number(this.advanceForm.get('installmentsCount')?.value || 1);
    if (amt > 0 && count > 0) {
      const installment = Number((amt / count).toFixed(2));
      this.advanceForm.get('monthlyInstallment')?.setValue(installment, { emitEvent: false });
    }
  }

  updateLeaveDaysCount() {
    const startStr = this.leaveForm.get('startDate')?.value;
    const endStr = this.leaveForm.get('endDate')?.value;
    if (startStr && endStr) {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > 0) {
        this.leaveForm.get('numberOfDays')?.setValue(diffDays, { emitEvent: false });
      }
    }
  }

  updateBonusAmount() {
    const empId = this.bonusForm.get('employeeId')?.value;
    const type = this.bonusForm.get('type')?.value;
    const days = Number(this.bonusForm.get('daysCount')?.value || 1);
    if (!empId) return;
    
    const emp = this.state.employees().find(e => e.id === empId);
    if (!emp) return;

    if (type === 'one_day') {
      const daily = Number((emp.salary / 30).toFixed(0));
      this.bonusForm.get('amount')?.setValue(daily, { emitEvent: false });
      this.bonusForm.get('daysCount')?.setValue(1, { emitEvent: false });
    } else if (type === 'multi_day') {
      const daily = Number((emp.salary / 30).toFixed(0));
      this.bonusForm.get('amount')?.setValue(daily * days, { emitEvent: false });
    }
  }

  updateDeductionAmount() {
    const empId = this.deductionForm.get('employeeId')?.value;
    const type = this.deductionForm.get('type')?.value;
    const days = Number(this.deductionForm.get('daysCount')?.value || 1);
    const sessions = Number(this.deductionForm.get('sessionsCount')?.value || 1);
    if (!empId) return;

    const emp = this.state.employees().find(e => e.id === empId);
    if (!emp) return;

    if (type === 'absence') {
      const daily = Number((emp.salary / 30).toFixed(0));
      this.deductionForm.get('amount')?.setValue(daily * days, { emitEvent: false });
    } else if (type === 'swim') {
      const swimFee = emp.swimFee || 0;
      const rate = Number((swimFee / 8).toFixed(0));
      this.deductionForm.get('amount')?.setValue(rate * sessions, { emitEvent: false });
    } else if (type === 'horse') {
      const horseFee = emp.horseFee || 0;
      const rate = Number((horseFee / 4).toFixed(0));
      this.deductionForm.get('amount')?.setValue(rate * sessions, { emitEvent: false });
    }
  }

  // Real-time Total Due calculation helper in Child Form
  updateFormFee() {
    const careType = this.childForm.get('careType')?.value;
    const swimming = this.childForm.get('swimming')?.value;
    const horseback = this.childForm.get('horseback')?.value;

    let base = this.childForm.get('baseFee')?.value;
    if (base === null || base === undefined || isNaN(Number(base))) {
      base = 1500;
      if (careType === 'evening') base = 1800;
      if (careType === 'individual') base = 2000;
    }

    let swimFee = this.childForm.get('swimmingFee')?.value;
    if (swimFee === null || swimFee === undefined || isNaN(Number(swimFee))) {
      swimFee = 400;
    }

    let horseFee = this.childForm.get('horsebackFee')?.value;
    if (horseFee === null || horseFee === undefined || isNaN(Number(horseFee))) {
      horseFee = 500;
    }

    let total = Number(base);
    if (swimming) total += Number(swimFee);
    if (horseback) total += Number(horseFee);

    this.childForm.patchValue({
      totalFee: total
    }, { emitEvent: false });
  }

  // --- CRUD Modals Handlers ---

  // Child Modals
  openAddChildModal() {
    this.editingChildId.set(null);
    this.childFormSubmitAttempted.set(false);
    this.childForm.reset({
      careType: 'day',
      skills: false, speech: false, vocational: false,
      academic: false, motor: false, sensory: false,
      swim: false, horse: false,
      swimming: false, horseback: false,
      baseFee: 1500, swimmingFee: 400, horsebackFee: 500, totalFee: 1500,
      diagnosis: '',
      photoUrl: ''
    });
    this.isChildModalOpen.set(true);
  }

  openEditChildModal(child: Child) {
    this.editingChildId.set(child.id || null);
    this.childFormSubmitAttempted.set(false);
    
    // Map array specialty fields to form checkboxes
    this.childForm.reset({
      id: child.id,
      name: child.name,
      dob: child.dob,
      address: child.address,
      phone: child.phone,
      whatsapp: child.whatsapp,
      careType: child.careType,
      skills: child.specialties.includes('skills'),
      speech: child.specialties.includes('speech'),
      vocational: child.specialties.includes('vocational'),
      academic: child.specialties.includes('academic'),
      motor: child.specialties.includes('motor'),
      sensory: child.specialties.includes('sensory'),
      swim: child.specialties.includes('swim'),
      horse: child.specialties.includes('horse'),
      swimming: child.swimming,
      horseback: child.horseback,
      baseFee: child.baseFee,
      swimmingFee: child.swimmingFee !== undefined ? child.swimmingFee : 400,
      horsebackFee: child.horsebackFee !== undefined ? child.horsebackFee : 500,
      totalFee: child.totalFee,
      diagnosis: child.diagnosis || '',
      photoUrl: child.photoUrl || ''
    });
    this.isChildModalOpen.set(true);
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 400; // max size of the photo bounding box
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            this.childForm.patchValue({ photoUrl: dataUrl });
          } else {
            this.childForm.patchValue({ photoUrl: reader.result as string });
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  async onSaveChild() {
    this.childFormSubmitAttempted.set(true);
    if (this.childForm.invalid) {
      this.childForm.markAllAsTouched();
      this.scrollModal('child-modal-content', 'top');
      return;
    }

    const formVal = this.childForm.value;
    
    // Gather true specialties checklist values into an array
    const specialties: string[] = [];
    if (formVal.careType === 'individual') {
      ['skills', 'speech', 'vocational', 'academic', 'motor', 'sensory', 'swim', 'horse'].forEach(key => {
        if (formVal[key]) specialties.push(key);
      });
    }

    const childData: Child = {
      id: formVal.id || undefined,
      name: formVal.name,
      dob: formVal.dob,
      address: formVal.address,
      phone: formVal.phone,
      whatsapp: formVal.whatsapp || formVal.phone, // Default to phone if whatsapp empty
      careType: formVal.careType,
      specialties,
      swimming: !!formVal.swimming,
      horseback: !!formVal.horseback,
      baseFee: Number(formVal.baseFee),
      swimmingFee: Number(formVal.swimmingFee),
      horsebackFee: Number(formVal.horsebackFee),
      totalFee: Number(formVal.totalFee),
      diagnosis: formVal.diagnosis || '',
      photoUrl: formVal.photoUrl || ''
    };

    const success = await this.state.saveChild(childData);
    if (success) {
      this.isChildModalOpen.set(false);
      if (!childData.id) {
        // Set newly created child as selected
        const newest = this.state.children()[this.state.children().length - 1];
        if (newest) this.selectedChildId.set(newest.id || null);
      }
    }
  }

  async onDeleteChild(id: string) {
    if (confirm('هل أنت متأكد من حذف ملف هذا الطفل نهائياً؟ سيتم حذف جميع جلساته المجدولة أيضاً.')) {
      const success = await this.state.deleteChild(id);
      if (success && this.selectedChildId() === id) {
        this.selectedChildId.set(null);
      }
    }
  }

  // Employee Modals
  openAddEmployeeModal() {
    this.editingEmployeeId.set(null);
    this.employeeForm.reset({
      role: 'specialist',
      gradYear: new Date().getFullYear() - 5,
      salary: 4000,
      skills: false, speech: false, vocational: false,
      academic: false, motor: false, sensory: false,
      swim: false, horse: false,
      swimFee: 0,
      horseFee: 0
    });
    this.isEmployeeModalOpen.set(true);
  }

  openEditEmployeeModal(emp: Employee) {
    this.editingEmployeeId.set(emp.id || null);
    this.employeeForm.reset({
      id: emp.id,
      name: emp.name,
      phone: emp.phone,
      gradYear: emp.gradYear,
      salary: emp.salary,
      role: emp.role,
      skills: emp.specialties.includes('skills'),
      speech: emp.specialties.includes('speech'),
      vocational: emp.specialties.includes('vocational'),
      academic: emp.specialties.includes('academic'),
      motor: emp.specialties.includes('motor'),
      sensory: emp.specialties.includes('sensory'),
      swim: emp.specialties.includes('swim'),
      horse: emp.specialties.includes('horse'),
      swimFee: emp.swimFee !== undefined ? emp.swimFee : 0,
      horseFee: emp.horseFee !== undefined ? emp.horseFee : 0
    });
    this.isEmployeeModalOpen.set(true);
  }

  async onSaveEmployee() {
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }

    const formVal = this.employeeForm.value;
    const specialties: string[] = [];
    if (formVal.role === 'specialist' || formVal.role === 'supervisor') {
      ['skills', 'speech', 'vocational', 'academic', 'motor', 'sensory', 'swim', 'horse'].forEach(key => {
        if (formVal[key]) specialties.push(key);
      });
    }

    const employeeData: Employee = {
      id: formVal.id || undefined,
      name: formVal.name,
      phone: formVal.phone,
      gradYear: formVal.gradYear,
      salary: formVal.salary,
      role: formVal.role,
      specialties,
      swimFee: formVal.swim ? Number(formVal.swimFee) : 0,
      horseFee: formVal.horse ? Number(formVal.horseFee) : 0
    };

    const success = await this.state.saveEmployee(employeeData);
    if (success) {
      this.isEmployeeModalOpen.set(false);
    }
  }

  async onDeleteEmployee(id: string) {
    if (confirm('هل أنت متأكد من حذف هذا الموظف؟ سيتم إلغاء جميع جلساته المجدولة أيضاً.')) {
      await this.state.deleteEmployee(id);
    }
  }

  // Session Booking Modal
  openBookSessionModal() {
    this.sessionChildSearchQuery.set('');
    const kids = this.state.children();
    this.sessionForm.reset({
      type: 'individual',
      childId: kids.length > 0 ? kids[0].id : '',
      specialty: 'skills',
      date: new Date().toISOString().split('T')[0],
      timeSlot: '09:00',
      employeeId: ''
    });
    this.isSessionModalOpen.set(true);
  }

  async onSaveSession() {
    if (this.sessionForm.invalid) {
      this.sessionForm.markAllAsTouched();
      return;
    }

    const formVal = this.sessionForm.value;
    const child = this.state.children().find(c => c.id === formVal.childId);
    const employee = this.state.employees().find(e => e.id === formVal.employeeId);

    if (!child || !employee) {
      alert('الرجاء اختيار طفل وأخصائي صالحين');
      return;
    }

    const sessionData: Session = {
      id: formVal.id || undefined,
      childId: formVal.childId,
      childName: child.name,
      employeeId: formVal.employeeId,
      employeeName: employee.name,
      specialty: formVal.specialty,
      date: formVal.date,
      timeSlot: formVal.timeSlot,
      type: formVal.type
    };

    const result = await this.state.saveSession(sessionData);
    if (result.success) {
      this.isSessionModalOpen.set(false);
    } else {
      alert(result.message || 'فشل حجز الجلسة بسبب تعارض في المواعيد');
    }
  }

  async onDeleteSession(id: string) {
    if (confirm('هل تريد بالتأكيد إلغاء وحذف موعد هذه الجلسة؟')) {
      await this.state.deleteSession(id);
    }
  }

  // Expense Modals
  openAddExpenseModal() {
    this.editingExpenseId.set(null);
    this.expenseForm.reset({
      category: 'purchases',
      date: new Date().toISOString().split('T')[0]
    });
    this.isExpenseModalOpen.set(true);
  }

  openEditExpenseModal(exp: Expense) {
    this.editingExpenseId.set(exp.id || null);
    this.expenseForm.reset({
      id: exp.id,
      title: exp.title,
      amount: exp.amount,
      category: exp.category,
      date: exp.date
    });
    this.isExpenseModalOpen.set(true);
  }

  async onSaveExpense() {
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }

    const formVal = this.expenseForm.value;
    const expenseData: Expense = {
      id: formVal.id || undefined,
      title: formVal.title,
      amount: formVal.amount,
      category: formVal.category,
      date: formVal.date
    };

    const success = await this.state.saveExpense(expenseData);
    if (success) {
      this.isExpenseModalOpen.set(false);
    }
  }

  async onDeleteExpense(id: string) {
    if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
      await this.state.deleteExpense(id);
    }
  }

  // Get total paid by child in a specific month
  getChildTotalPaid(childId: string, month: string, excludePaymentId?: string | null): number {
    if (!childId || !month) return 0;
    return this.state.payments()
      .filter(p => p.childId === childId && p.month === month && p.id !== excludePaymentId)
      .reduce((sum, p) => sum + p.amount, 0);
  }

  // Get remaining balance for child in a specific month
  getChildRemainingFee(childId: string, month: string, excludePaymentId?: string | null): number {
    if (!childId || !month) return 0;
    const child = this.state.children().find(c => c.id === childId);
    if (!child) return 0;
    const paid = this.getChildTotalPaid(childId, month, excludePaymentId);
    return Math.max(0, child.totalFee - paid);
  }

  // Get current system month in YYYY-MM format
  getCurrentMonthString(): string {
    return new Date().toISOString().slice(0, 7);
  }

  // Payment Modals & Actions
  openAddPaymentModal() {
    this.editingPaymentId.set(null);
    const m = new Date().toISOString().slice(0, 7);
    this.paymentForm.reset({
      id: null,
      childId: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      month: m,
      paymentMethod: 'cash',
      notes: ''
    });
    this.paymentChildId.set('');
    this.paymentMonth.set(m);
    this.paymentAmount.set(0);
    this.isPaymentModalOpen.set(true);
  }

  openEditPaymentModal(pay: any) {
    this.editingPaymentId.set(pay.id || null);
    this.paymentForm.reset({
      id: pay.id || null,
      childId: pay.childId,
      amount: pay.amount,
      date: pay.date,
      month: pay.month,
      paymentMethod: pay.paymentMethod,
      notes: pay.notes || ''
    });
    this.paymentChildId.set(pay.childId || '');
    this.paymentMonth.set(pay.month || '');
    this.paymentAmount.set(pay.amount || 0);
    this.isPaymentModalOpen.set(true);
  }

  closePaymentModal() {
    this.isPaymentModalOpen.set(false);
  }

  async onSavePaymentSubmit() {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    const val = this.paymentForm.value;
    const child = this.state.children().find(c => c.id === val.childId);
    const paymentData = {
      ...val,
      childName: child ? child.name : 'طفل مجهول'
    };

    const success = await this.state.savePayment(paymentData);
    if (success) {
      this.isPaymentModalOpen.set(false);
    }
  }

  async onDeletePayment(id: string) {
    if (confirm('هل أنت متأكد من حذف عملية السداد هذه؟')) {
      await this.state.deletePayment(id);
    }
  }

  // Change active mimicking role for RBAC testing
  changeRole(role: 'admin' | 'secretary' | 'specialist') {
    this.state.selectedRole.set(role);
    
    // Automatically match tab to most relevant for role
    if (role === 'specialist') {
      this.currentTab.set('sessions');
      // Set to first available specialist
      const specs = this.state.employees().filter(e => e.role === 'specialist');
      if (specs.length > 0) {
        this.state.selectedSpecialistId.set(specs[0].id || '');
      }
    } else if (role === 'secretary') {
      this.currentTab.set('sessions');
    } else {
      this.currentTab.set('dashboard');
    }
  }

  // Specialty options lookup
  specialtyOptions = [
    { code: 'skills', name: 'تنمية مهارات' },
    { code: 'speech', name: 'تخاطب' },
    { code: 'vocational', name: 'تأهيل مهني' },
    { code: 'academic', name: 'أكاديمي' },
    { code: 'motor', name: 'حركي' },
    { code: 'sensory', name: 'حسي' },
    { code: 'swim', name: 'سباحة' },
    { code: 'horse', name: 'ركوب خيل' }
  ];

  // Activities Schedule helper methods
  getActivityName(code: string): string {
    const map: Record<string, string> = {
      'swim': 'سباحة',
      'horse': 'ركوب خيل',
      'skills': 'تنمية مهارات',
      'recreational': 'ألعاب ترفيهية'
    };
    return map[code] || code;
  }

  activityOptions = [
    { code: 'swim', name: 'سباحة' },
    { code: 'horse', name: 'ركوب خيل' },
    { code: 'skills', name: 'تنمية مهارات' },
    { code: 'recreational', name: 'ألعاب ترفيهية' }
  ];

  openBookActivityModal() {
    const kids = this.state.children();
    const coaches = this.eligibleCoaches();
    this.activityForm.reset({
      activityName: 'swim',
      childId: kids.length > 0 ? kids[0].id : '',
      coachId: coaches.length > 0 ? coaches[0].id : '',
      date: new Date().toISOString().split('T')[0],
      timeSlot: '11:45'
    });
    this.isActivityModalOpen.set(true);
  }

  async onSaveActivity() {
    if (this.activityForm.invalid) {
      this.activityForm.markAllAsTouched();
      return;
    }

    const formVal = this.activityForm.value;
    const child = this.state.children().find(c => c.id === formVal.childId);
    const coach = this.state.employees().find(e => e.id === formVal.coachId);

    if (!child || !coach) {
      alert('الرجاء اختيار طفل ومدرب صالحين');
      return;
    }

    const activityData: ChildActivity = {
      id: formVal.id || undefined,
      activityName: formVal.activityName,
      childId: formVal.childId,
      childName: child.name,
      coachId: formVal.coachId,
      coachName: coach.name,
      date: formVal.date,
      timeSlot: formVal.timeSlot
    };

    const result = await this.state.saveActivity(activityData);
    if (result.success) {
      this.isActivityModalOpen.set(false);
    } else {
      alert(result.message || 'فشل حجز النشاط بسبب تعارض في المواعيد');
    }
  }

  async onDeleteActivity(id: string) {
    if (confirm('هل تريد بالتأكيد إلغاء وحذف هذا النشاط المجدول؟')) {
      await this.state.deleteActivity(id);
    }
  }

  // Time slots lookup
  timeSlots = ['09:00', '10:30', '11:45', '13:00', '14:30', '16:00', '17:30'];

  // Easy scroll navigation helpers
  scrollModal(backdropId: string, target: 'top' | 'bottom') {
    const el = document.getElementById(backdropId);
    if (el) {
      if (target === 'top') {
        el.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    }
  }

  scrollToTop() {
    if (this.isChildModalOpen()) {
      this.scrollModal('child-modal-content', 'top');
    } else if (this.isEmployeeModalOpen()) {
      this.scrollModal('employee-modal-content', 'top');
    } else if (this.isSessionModalOpen()) {
      this.scrollModal('session-modal-content', 'top');
    } else if (this.isExpenseModalOpen()) {
      this.scrollModal('expense-modal-content', 'top');
    } else if (this.isPaymentModalOpen()) {
      this.scrollModal('payment-modal-content', 'top');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  scrollToBottom() {
    if (this.isChildModalOpen()) {
      this.scrollModal('child-modal-content', 'bottom');
    } else if (this.isEmployeeModalOpen()) {
      this.scrollModal('employee-modal-content', 'bottom');
    } else if (this.isSessionModalOpen()) {
      this.scrollModal('session-modal-content', 'bottom');
    } else if (this.isExpenseModalOpen()) {
      this.scrollModal('expense-modal-content', 'bottom');
    } else if (this.isPaymentModalOpen()) {
      this.scrollModal('payment-modal-content', 'bottom');
    } else {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  }

  // --- PAYROLL SYSTEM HANDLERS ---

  // Computed signal for current monthly runs
  monthlyPayrollDrafts = computed(() => {
    const month = this.selectedPayrollMonth();
    const dept = this.selectedPayrollDepartment();
    const query = this.payrollSearchQuery().trim().toLowerCase();
    const employees = this.state.employees();
    const runs = this.state.payrollRuns().filter(r => r.month === month) as any[];
    const advances = this.state.advances();
    const leaves = this.state.leaves();
    const bonuses = this.state.bonuses();
    const deductions = this.state.deductions();

    let results = employees.map(emp => {
      // Check if a run is already saved for this month
      const savedRun = runs.find((r: any) => r.employeeId === emp.id);
      if (savedRun) {
        return {
          ...savedRun,
          isSaved: true
        };
      }

      // Otherwise, calculate dynamic draft values!
      const baseSalary = emp.salary || 0;

      // Allowances: Swimming is in specialties, Horseback is specialty
      const swimAllowance = emp.specialties?.includes('swim') && emp.swimFee ? emp.swimFee : 0;
      const horseAllowance = emp.specialties?.includes('horse') && emp.horseFee ? emp.horseFee : 0;

      // Unpaid Leaves overlap calculation
      const empLeaves = leaves.filter(l => l.employeeId === emp.id && l.status === 'approved');
      let totalLeaveDaysInMonth = 0;
      const logs: string[] = [];
      
      empLeaves.forEach(l => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        
        const [yearStr, monthStr] = month.split('-');
        const y = parseInt(yearStr);
        const m = parseInt(monthStr) - 1; // 0-indexed
        const firstDayOfMonth = new Date(y, m, 1);
        const lastDayOfMonth = new Date(y, m + 1, 0); // last day
        
        const overlapStart = start > firstDayOfMonth ? start : firstDayOfMonth;
        const overlapEnd = end < lastDayOfMonth ? end : lastDayOfMonth;
        
        if (overlapStart <= overlapEnd) {
          const diff = overlapEnd.getTime() - overlapStart.getTime();
          const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
          totalLeaveDaysInMonth += days;
          logs.push(`إجازة بدون راتب: ${days} أيام (${l.startDate} إلى ${l.endDate})`);
        }
      });

      let leaveDeduction = 0;
      let isSuspended = false;

      if (totalLeaveDaysInMonth >= 30) {
        isSuspended = true;
        leaveDeduction = baseSalary;
      } else if (totalLeaveDaysInMonth > 0) {
        const dailyRate = baseSalary / 30;
        leaveDeduction = Number((dailyRate * totalLeaveDaysInMonth).toFixed(2));
      }

      // Bonuses
      const empBonuses = bonuses.filter(b => b.employeeId === emp.id && b.status === 'approved' && b.date.startsWith(month));
      let fixedBonuses = 0;
      let dayBonuses = 0;
      let totalBonuses = 0;

      empBonuses.forEach(b => {
        if (b.type === 'fixed') {
          fixedBonuses += b.amount;
        } else {
          dayBonuses += b.amount;
        }
        totalBonuses += b.amount;
        logs.push(`مكافأة (${b.type === 'fixed' ? 'مبلغ ثابت' : 'أيام'}): +${b.amount} ج.م`);
      });

      // Deductions
      const empDeductions = deductions.filter(d => d.employeeId === emp.id && d.status === 'approved' && d.date.startsWith(month));
      let absenceDeduction = 0;
      let swimDeduction = 0;
      let horseDeduction = 0;
      let fixedPenalty = 0;
      let totalDeductions = 0;

      empDeductions.forEach(d => {
        if (d.type === 'absence') {
          absenceDeduction += d.amount;
        } else if (d.type === 'swim') {
          swimDeduction += d.amount;
        } else if (d.type === 'horse') {
          horseDeduction += d.amount;
        } else if (d.type === 'fixed_penalty') {
          fixedPenalty += d.amount;
        }
        totalDeductions += d.amount;
        logs.push(`خصم (${d.type === 'absence' ? 'غياب' : d.type === 'swim' ? 'غياب مسبح' : d.type === 'horse' ? 'غياب خيل' : 'جزاء ثابت'}): -${d.amount} ج.م`);
      });

      // Advances
      const empAdvances = advances.filter(a => a.employeeId === emp.id && a.status === 'approved');
      let advanceDeduction = 0;
      let remainingAdvanceBalance = 0;

      empAdvances.forEach(adv => {
        const remaining = adv.amount - (adv.paidAmount || 0);
        remainingAdvanceBalance += remaining;
        if (remaining > 0) {
          const installment = adv.monthlyInstallment === 0 ? remaining : Math.min(adv.monthlyInstallment, remaining);
          advanceDeduction += installment;
        }
      });

      if (advanceDeduction > 0) {
        totalDeductions += advanceDeduction;
        logs.push(`قسط سلفة مستقطع: -${advanceDeduction} ج.م (المتبقي الإجمالي: ${remainingAdvanceBalance - advanceDeduction} ج.م)`);
      }

      if (leaveDeduction > 0 && !isSuspended) {
        totalDeductions += leaveDeduction;
      }

      // Calculations
      const grossSalary = baseSalary + swimAllowance + horseAllowance;
      let netSalary = (grossSalary + totalBonuses) - totalDeductions;
      if (isSuspended) {
        netSalary = 0;
        logs.push('حالة الراتب: موقوف بسبب إجازة كامل الشهر');
      }
      
      netSalary = Number(Math.max(0, netSalary).toFixed(2));

      return {
        id: savedRun ? savedRun.id : undefined,
        employeeId: emp.id || '',
        employeeName: emp.name,
        role: emp.role,
        month,
        baseSalary,
        swimAllowance,
        horseAllowance,
        fixedBonuses,
        dayBonuses,
        totalBonuses,
        absenceDeduction,
        swimDeduction,
        horseDeduction,
        fixedPenalty,
        advanceDeduction,
        leaveDeduction,
        totalDeductions,
        grossSalary,
        netSalary,
        status: savedRun ? savedRun.status : (isSuspended ? 'draft' : 'draft') as any,
        isSuspended,
        remainingAdvanceBalance: remainingAdvanceBalance,
        dateGenerated: new Date().toISOString().split('T')[0],
        logs: logs.join('\n'),
        isSaved: !!savedRun
      };
    });

    // Filters
    if (dept !== 'all') {
      if (dept === 'specialist') {
        results = results.filter(r => r.role === 'specialist');
      } else if (dept === 'secretary') {
        results = results.filter(r => r.role === 'secretary');
      } else if (dept === 'admin') {
        results = results.filter(r => r.role === 'admin' || r.role === 'manager');
      }
    }

    if (query) {
      results = results.filter(r => r.employeeName.toLowerCase().includes(query));
    }

    return results;
  });

  // Dynamic Dashboard Stats
  payrollStats = computed(() => {
    const list = this.monthlyPayrollDrafts();
    const totalCost = list.reduce((acc, r) => acc + r.netSalary, 0);
    const paidCost = list.filter(r => r.status === 'paid').reduce((acc, r) => acc + r.netSalary, 0);
    const activeAdvances = this.state.advances().filter(a => a.status === 'approved');
    const totalAdvancesOutstanding = activeAdvances.reduce((acc, a) => acc + (a.amount - (a.paidAmount || 0)), 0);
    const leaveCount = this.state.leaves().filter(l => l.status === 'approved' && l.startDate.startsWith(this.selectedPayrollMonth())).length;

    return {
      totalCost,
      paidCost,
      remainingCost: totalCost - paidCost,
      totalAdvancesOutstanding,
      leaveCount,
      employeeCount: list.length
    };
  });

  // Modals management
  openAdvanceModal(adv?: SalaryAdvance) {
    if (adv) {
      this.editingAdvanceId.set(adv.id || null);
      this.advanceForm.reset(adv);
    } else {
      this.editingAdvanceId.set(null);
      this.advanceForm.reset({
        id: null,
        employeeId: '',
        amount: 1000,
        monthlyInstallment: 1000,
        installmentsCount: 1,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        notes: ''
      });
    }
    this.isAdvanceModalOpen.set(true);
  }

  closeAdvanceModal() {
    this.isAdvanceModalOpen.set(false);
  }

  async onSaveAdvanceSubmit() {
    if (this.advanceForm.invalid) {
      this.advanceForm.markAllAsTouched();
      return;
    }
    const val = this.advanceForm.value;
    const emp = this.state.employees().find(e => e.id === val.employeeId);
    val.employeeName = emp ? emp.name : '';
    val.paidAmount = val.paidAmount || 0;
    val.remainingBalance = val.amount - val.paidAmount;
    val.status = val.status || 'approved';

    const ok = await this.state.saveAdvance(val);
    if (ok) this.closeAdvanceModal();
  }

  async onDeleteAdvance(id: string) {
    if (confirm('هل أنت متأكد من حذف هذه السلفة؟')) {
      await this.state.deleteAdvance(id);
    }
  }

  openLeaveModal(leave?: UnpaidLeave) {
    if (leave) {
      this.editingLeaveId.set(leave.id || null);
      this.leaveForm.reset(leave);
    } else {
      this.editingLeaveId.set(null);
      this.leaveForm.reset({
        id: null,
        employeeId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        numberOfDays: 1,
        reason: '',
        approvedBy: 'مدير الموارد البشرية',
        notes: ''
      });
    }
    this.isLeaveModalOpen.set(true);
  }

  closeLeaveModal() {
    this.isLeaveModalOpen.set(false);
  }

  async onSaveLeaveSubmit() {
    if (this.leaveForm.invalid) {
      this.leaveForm.markAllAsTouched();
      return;
    }
    const val = this.leaveForm.value;
    const emp = this.state.employees().find(e => e.id === val.employeeId);
    val.employeeName = emp ? emp.name : '';
    val.status = val.status || 'approved';

    const ok = await this.state.saveLeave(val);
    if (ok) this.closeLeaveModal();
  }

  async onDeleteLeave(id: string) {
    if (confirm('هل أنت متأكد من إلغاء/حذف هذا الطلب؟')) {
      await this.state.deleteLeave(id);
    }
  }

  openBonusModal(bonus?: Bonus) {
    if (bonus) {
      this.editingBonusId.set(bonus.id || null);
      this.bonusForm.reset(bonus);
    } else {
      this.editingBonusId.set(null);
      this.bonusForm.reset({
        id: null,
        employeeId: '',
        type: 'fixed',
        amount: 500,
        daysCount: 1,
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
    this.isBonusModalOpen.set(true);
  }

  closeBonusModal() {
    this.isBonusModalOpen.set(false);
  }

  async onSaveBonusSubmit() {
    if (this.bonusForm.invalid) {
      this.bonusForm.markAllAsTouched();
      return;
    }
    const val = this.bonusForm.value;
    const emp = this.state.employees().find(e => e.id === val.employeeId);
    val.employeeName = emp ? emp.name : '';
    val.status = val.status || 'approved';

    const ok = await this.state.saveBonus(val);
    if (ok) this.closeBonusModal();
  }

  async onDeleteBonus(id: string) {
    if (confirm('هل أنت متأكد من حذف هذه المكافأة؟')) {
      await this.state.deleteBonus(id);
    }
  }

  openDeductionModal(ded?: Deduction) {
    if (ded) {
      this.editingDeductionId.set(ded.id || null);
      this.deductionForm.reset(ded);
    } else {
      this.editingDeductionId.set(null);
      this.deductionForm.reset({
        id: null,
        employeeId: '',
        type: 'absence',
        amount: 150,
        daysCount: 1,
        sessionsCount: 1,
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
    this.isDeductionModalOpen.set(true);
  }

  closeDeductionModal() {
    this.isDeductionModalOpen.set(false);
  }

  async onSaveDeductionSubmit() {
    if (this.deductionForm.invalid) {
      this.deductionForm.markAllAsTouched();
      return;
    }
    const val = this.deductionForm.value;
    const emp = this.state.employees().find(e => e.id === val.employeeId);
    val.employeeName = emp ? emp.name : '';
    val.status = val.status || 'approved';

    const ok = await this.state.saveDeduction(val);
    if (ok) this.closeDeductionModal();
  }

  async onDeleteDeduction(id: string) {
    if (confirm('هل أنت متأكد من حذف هذا الخصم؟')) {
      await this.state.deleteDeduction(id);
    }
  }

  // Finalize / save a single run
  async saveSinglePayrollRun(run: any, newStatus: 'draft' | 'approved' | 'paid') {
    const toSave = { ...run, status: newStatus } as any;
    delete toSave.isSaved; // remove UI flag
    const res = await this.state.savePayrollRun(toSave);
    if (!res.success) {
      alert(res.message);
    }
  }

  // Mass action: finalize drafts to Approved or Paid
  async massProcessPayroll(targetStatus: 'approved' | 'paid') {
    const list = this.monthlyPayrollDrafts();
    const drafts = list.filter(r => !r.isSaved);
    if (drafts.length === 0) {
      alert('لا توجد مسودات رواتب غير مسجلة حالياً لمعالجتها جماعياً.');
      return;
    }
    
    if (confirm(`هل أنت متأكد من اعتماد/دفع جميع مسودات الرواتب (${drafts.length} موظف) لهذا الشهر؟`)) {
      this.state.isLoading.set(true);
      for (const run of drafts) {
        const toSave = { ...run, status: targetStatus } as any;
        delete toSave.isSaved;
        await this.state.savePayrollRun(toSave);
      }
      this.state.isLoading.set(false);
      alert('تمت معالجة رواتب الموظفين بنجاح.');
    }
  }

  // Delete a saved payroll run
  async deletePayrollRun(id: string) {
    if (confirm('هل أنت متأكد من حذف وإعادة تصفير مسير الرواتب المعتمد هذا؟')) {
      await this.state.deletePayrollRun(id);
    }
  }

  // View & Print Payslip
  viewPayslip(run: any) {
    this.selectedRunForPayslip.set(run);
    this.isPayslipModalOpen.set(true);
  }

  closePayslip() {
    this.isPayslipModalOpen.set(false);
  }

  printPayslip() {
    const printContent = document.getElementById('payslip-print-section');
    if (!printContent) return;
    
    // Open a simple clean blank print layout
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>قسيمة راتب - ${this.selectedRunForPayslip()?.employeeName}</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; }
              @media print {
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
            <div class="mt-8 text-center no-print">
              <button onclick="window.print();" class="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium shadow-md hover:bg-indigo-700 transition">طباعة القسيمة</button>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      alert('الرجاء السماح بالنوافذ المنبثقة لطباعة قسيمة الراتب.');
    }
  }

  // Export to CSV
  exportPayrollToCSV() {
    const list = this.monthlyPayrollDrafts();
    if (list.length === 0) {
      alert('لا توجد بيانات لتصديرها.');
      return;
    }

    const headers = [
      'اسم الموظف',
      'الشهر',
      'الراتب الأساسي',
      'حافز المسبح',
      'حافز الخيل',
      'إجمالي المكافآت',
      'خصومات غياب/جزاءات',
      'خصم السلفة',
      'خصم الإجازة',
      'إجمالي الخصومات',
      'صافي الراتب',
      'الحالة'
    ];

    const rows = list.map(r => [
      r.employeeName,
      r.month,
      r.baseSalary,
      r.swimAllowance,
      r.horseAllowance,
      r.totalBonuses,
      (r.absenceDeduction + r.swimDeduction + r.horseDeduction + r.fixedPenalty),
      r.advanceDeduction,
      r.leaveDeduction,
      r.totalDeductions,
      r.netSalary,
      r.status === 'paid' ? 'تم الدفع' : r.status === 'approved' ? 'معتمد' : 'مسودة'
    ]);

    let csvContent = '\uFEFF'; // UTF-8 BOM for Arabic support in Excel
    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
      const escaped = row.map(val => `"${String(val).replace(/"/g, '""')}"`);
      csvContent += escaped.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `مسير_رواتب_${this.selectedPayrollMonth()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
