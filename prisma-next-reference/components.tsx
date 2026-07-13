"use client";

import React, { useState, useEffect, useTransition } from "react";

// ==========================================
// 1. COMPONENT FOR SEARCH & EDIT CHILDREN
// ==========================================

export interface Child {
  id: string;
  name: string;
  dob: string;
  photoUrl?: string;
  address?: string;
  phone: string;
  whatsapp?: string;
  careType: "DAY" | "EVENING" | "INDIVIDUAL";
  specialties: string[];
  swimming: boolean;
  horseback: boolean;
  baseFee: number;
  swimmingFee: number;
  horsebackFee: number;
  totalFee: number;
  diagnosis?: string;
}

export function ChildrenManagerComponent() {
  const [children, setChildren] = useState<Child[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingChild, setEditingChild] = useState<Partial<Child> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch children matching search
  const fetchChildren = async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/children?search=${encodeURIComponent(query)}`);
      const payload = await res.json();
      if (payload.success) {
        setChildren(payload.data);
      } else {
        setError(payload.error);
      }
    } catch (err) {
      setError("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchChildren(search);
    }, 400); // Debounce search input
    return () => clearTimeout(delayDebounce);
  }, [search]);

  // Handle Photo Upload via Vercel Blob
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingChild) return;
    
    setUploading(true);
    try {
      const res = await fetch(`/api/upload-photo?filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        body: file,
      });
      const data = await res.json();
      if (data.success) {
        setEditingChild({ ...editingChild, photoUrl: data.url });
      } else {
        alert("فشل رفع الصورة: " + data.error);
      }
    } catch (err) {
      alert("خطأ أثناء رفع الملف");
    } finally {
      setUploading(false);
    }
  };

  // Calculate age from DOB
  const getAge = (dobString: string) => {
    if (!dobString) return "";
    const birth = new Date(dobString);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
      years--;
      months += 12;
    }
    return years === 0 ? `${months} أشهر` : `${years} سنة`;
  };

  // Save changes (POST/PUT)
  const saveChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChild) return;

    try {
      const res = await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingChild),
      });
      const data = await res.json();
      if (data.success) {
        setEditingChild(null);
        fetchChildren(search); // Refresh list
      } else {
        alert(data.error || "فشل حفظ البيانات");
      }
    } catch (err) {
      alert("حدث خطأ أثناء الاتصال بالخادم");
    }
  };

  // Toggle dynamic specialty selection
  const handleSpecialtyToggle = (spec: string) => {
    if (!editingChild) return;
    const currentSpecs = editingChild.specialties || [];
    const updatedSpecs = currentSpecs.includes(spec)
      ? currentSpecs.filter((s) => s !== spec)
      : [...currentSpecs, spec];
    setEditingChild({ ...editingChild, specialties: updatedSpecs });
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6" dir="rtl">
      {/* Header and Search Box */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 mb-6">
        <h2 className="text-xl font-bold text-stone-800 mb-2">إدارة سجلات الأطفال</h2>
        <p className="text-xs text-stone-400 mb-4">البحث الفوري عن الأطفال المسجلين وتعديل ملفاتهم وتكلفة اشتراكاتهم</p>
        
        <div className="relative">
          <input
            type="text"
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-11 pl-4 py-3 text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
            placeholder="ابحث باسم الطفل أو برقم هاتف ولي الأمر..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 material-icons">search</span>
        </div>
      </div>

      {/* Grid of Results */}
      {loading ? (
        <div className="text-center py-12 text-stone-500">جاري تحميل البيانات...</div>
      ) : children.length === 0 ? (
        <div className="bg-stone-50 text-center py-12 rounded-2xl text-stone-400 border border-dashed border-stone-200">
          لا توجد سجلات مطابقة لطلب البحث الخاص بك.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((child) => (
            <div key={child.id} className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="flex gap-4 items-start mb-4">
                <img
                  src={child.photoUrl || "/default-avatar.png"}
                  alt={child.name}
                  className="w-14 h-14 rounded-full object-cover border border-stone-200"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1">
                  <h3 className="font-bold text-stone-800">{child.name}</h3>
                  <div className="flex gap-2 items-center text-xs text-stone-400 mt-1">
                    <span>العمر: {getAge(child.dob)}</span>
                    <span className="w-1.5 h-1.5 bg-stone-200 rounded-full"></span>
                    <span>{child.careType === "DAY" ? "رعاية صباحية" : child.careType === "EVENING" ? "رعاية مسائية" : "جلسات فردية"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-stone-500 border-t border-stone-50 pt-3">
                <div className="flex justify-between">
                  <span>هاتف ولي الأمر:</span>
                  <span className="font-mono text-stone-800 font-medium">{child.phone}</span>
                </div>
                {child.whatsapp && (
                  <div className="flex justify-between">
                    <span>واتساب ولي الأمر:</span>
                    <span className="font-mono text-emerald-600 font-medium">{child.whatsapp}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-stone-700">
                  <span>الرسوم المستحقة شهرياً:</span>
                  <span className="text-emerald-700 font-mono">{child.totalFee} ج.م</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingChild(child)}
                  className="px-3 py-1.5 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors flex items-center gap-1"
                >
                  <span className="material-icons text-sm">edit</span>
                  تعديل الملف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Child Modal Overlay */}
      {editingChild && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl p-6 shadow-2xl border border-stone-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-stone-800 flex items-center gap-2">
                <span className="material-icons text-emerald-600">face</span>
                تعديل ملف الطفل: {editingChild.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingChild(null)}
                className="w-8 h-8 rounded-full bg-stone-50 hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors"
              >
                <span className="material-icons text-sm">close</span>
              </button>
            </div>

            <form onSubmit={saveChild} className="space-y-4 text-stone-700">
              {/* Profile Image & Uploader */}
              <div className="flex items-center gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-150">
                <img
                  src={editingChild.photoUrl || "/default-avatar.png"}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full object-cover border border-stone-200"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <span className="block text-xs font-bold text-stone-600 mb-1">الصورة الشخصية للطفل</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-xs text-stone-500 file:mr-0 file:ml-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  {uploading && <span className="text-[10px] text-emerald-600 block mt-1">جاري الرفع...</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <span className="block text-xs font-bold text-stone-500 mb-1">الاسم الكامل للطفل *</span>
                  <input
                    type="text"
                    required
                    value={editingChild.name || ""}
                    onChange={(e) => setEditingChild({ ...editingChild, name: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* DOB */}
                <div>
                  <span className="block text-xs font-bold text-stone-500 mb-1">تاريخ الميلاد *</span>
                  <input
                    type="date"
                    required
                    value={editingChild.dob ? editingChild.dob.substring(0, 10) : ""}
                    onChange={(e) => setEditingChild({ ...editingChild, dob: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>

                {/* Address */}
                <div>
                  <span className="block text-xs font-bold text-stone-500 mb-1">عنوان الإقامة والسكن</span>
                  <input
                    type="text"
                    value={editingChild.address || ""}
                    onChange={(e) => setEditingChild({ ...editingChild, address: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    placeholder="مثال: القاهرة، مصر الجديدة"
                  />
                </div>

                {/* Phone */}
                <div>
                  <span className="block text-xs font-bold text-stone-500 mb-1">هاتف ولي الأمر الأساسي *</span>
                  <input
                    type="text"
                    required
                    pattern="^01[0-9]{9}$"
                    value={editingChild.phone || ""}
                    onChange={(e) => setEditingChild({ ...editingChild, phone: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    placeholder="مثال: 01012345678"
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <span className="block text-xs font-bold text-stone-500 mb-1">رقم الواتساب</span>
                  <input
                    type="text"
                    value={editingChild.whatsapp || ""}
                    onChange={(e) => setEditingChild({ ...editingChild, whatsapp: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    placeholder="مثال: 01112345678"
                  />
                </div>

                {/* Care Type */}
                <div>
                  <span className="block text-xs font-bold text-stone-500 mb-1">نوع الرعاية والاشتراك *</span>
                  <select
                    value={editingChild.careType || "DAY"}
                    onChange={(e) => setEditingChild({ ...editingChild, careType: e.target.value as any })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  >
                    <option value="DAY">رعاية نهارية كاملة (صباحاً)</option>
                    <option value="EVENING">رعاية مسائية</option>
                    <option value="INDIVIDUAL">جلسات فردية تأهيلية</option>
                  </select>
                </div>
              </div>

              {/* Conditional Specialty Checklist for Individual Sessions */}
              {editingChild.careType === "INDIVIDUAL" && (
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
                  <span className="block text-xs font-bold text-stone-600">التخصصات التأهيلية المطلوبة للطفل:</span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {["speech", "sensory", "motor", "academic", "skills", "vocational"].map((spec) => (
                      <label key={spec} className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingChild.specialties?.includes(spec) || false}
                          onChange={() => handleSpecialtyToggle(spec)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                        />
                        <span>
                          {spec === "speech" && "🗣️ تخاطب ونطق"}
                          {spec === "sensory" && "🧱 تكامل حسي"}
                          {spec === "motor" && "🏃 علاج حركي"}
                          {spec === "academic" && "📚 تأسيس أكاديمي"}
                          {spec === "skills" && "🧩 تنمية مهارات"}
                          {spec === "vocational" && "🔨 تأهيل مهني"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial Subscriptions Details */}
              <div className="bg-amber-50/30 p-4 rounded-2xl border border-amber-200/45 space-y-3">
                <span className="block text-xs font-bold text-amber-800 flex items-center gap-1">
                  <span className="material-icons text-sm text-amber-600">payments</span>
                  تحديد الاشتراكات والأنشطة الإضافية (ج.م)
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-stone-400 mb-1">رسوم الرعاية الأساسية</label>
                    <input
                      type="number"
                      value={editingChild.baseFee || 0}
                      onChange={(e) => setEditingChild({ ...editingChild, baseFee: Number(e.target.value) })}
                      className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-400 mb-1">نشاط السباحة الاضافي</label>
                    <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5">
                      <input
                        type="checkbox"
                        checked={editingChild.swimming || false}
                        onChange={(e) => setEditingChild({ ...editingChild, swimming: e.target.checked })}
                        className="rounded text-emerald-600"
                      />
                      <input
                        type="number"
                        disabled={!editingChild.swimming}
                        value={editingChild.swimmingFee || 0}
                        onChange={(e) => setEditingChild({ ...editingChild, swimmingFee: Number(e.target.value) })}
                        className="w-full border-0 p-0 text-xs font-mono focus:ring-0 disabled:bg-stone-50 disabled:text-stone-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-400 mb-1">نشاط ركوب الخيل الاضافي</label>
                    <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5">
                      <input
                        type="checkbox"
                        checked={editingChild.horseback || false}
                        onChange={(e) => setEditingChild({ ...editingChild, horseback: e.target.checked })}
                        className="rounded text-emerald-600"
                      />
                      <input
                        type="number"
                        disabled={!editingChild.horseback}
                        value={editingChild.horsebackFee || 0}
                        onChange={(e) => setEditingChild({ ...editingChild, horsebackFee: Number(e.target.value) })}
                        className="w-full border-0 p-0 text-xs font-mono focus:ring-0 disabled:bg-stone-50 disabled:text-stone-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingChild(null)}
                  className="px-4 py-2.5 text-xs font-bold text-stone-500 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shadow-sm"
                >
                  حفظ التعديلات والبيانات المحدثة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
