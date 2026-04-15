import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { VisitPurpose, FormField } from '../types';
import { Card, Button, Input, Label } from '../components/ui/Button';
import { Plus, Trash2, Edit2, Save, X, GripVertical, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const AdminPurposes: React.FC = () => {
  const [purposes, setPurposes] = useState<VisitPurpose[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPurpose, setEditingPurpose] = useState<Partial<VisitPurpose> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchPurposes();
  }, []);

  const fetchPurposes = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, 'purposes'),
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      setPurposes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitPurpose)));
    } catch (error) {
      console.error('Error fetching purposes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (purpose?: VisitPurpose) => {
    if (purpose) {
      setEditingPurpose({ ...purpose });
    } else {
      setEditingPurpose({
        name: '',
        description: '',
        isActive: true,
        fields: [
          { id: 'name', label: '방문자 성함', type: 'text', required: true },
          { id: 'contact', label: '연락처', type: 'tel', required: true },
        ],
      });
    }
    setIsModalOpen(true);
  };

  const handleAddField = () => {
    if (!editingPurpose) return;
    const newField: FormField = {
      id: `field_${Date.now()}`,
      label: '새 항목',
      type: 'text',
      required: false,
    };
    setEditingPurpose({
      ...editingPurpose,
      fields: [...(editingPurpose.fields || []), newField],
    });
  };

  const handleRemoveField = (id: string) => {
    if (!editingPurpose) return;
    setEditingPurpose({
      ...editingPurpose,
      fields: editingPurpose.fields?.filter(f => f.id !== id),
    });
  };

  const handleFieldChange = (id: string, updates: Partial<FormField>) => {
    if (!editingPurpose) return;
    setEditingPurpose({
      ...editingPurpose,
      fields: editingPurpose.fields?.map(f => f.id === id ? { ...f, ...updates } : f),
    });
  };

  const handleSave = async () => {
    if (!editingPurpose || !editingPurpose.name) return;
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Clean up fields (especially options)
      const cleanedFields = editingPurpose.fields?.map(f => {
        if (f.options) {
          return {
            ...f,
            options: f.options.map(opt => opt.trim()).filter(Boolean)
          };
        }
        return f;
      });

      const purposeData = {
        ...editingPurpose,
        fields: cleanedFields,
        ownerId: user.uid,
        updatedAt: serverTimestamp(),
      };

      if (editingPurpose.id) {
        const { id, ...data } = purposeData;
        await updateDoc(doc(db, 'purposes', id), data);
      } else {
        await addDoc(collection(db, 'purposes'), {
          ...purposeData,
          createdAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
      fetchPurposes();
    } catch (error) {
      console.error('Error saving purpose:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'purposes', id));
      fetchPurposes();
    } catch (error) {
      console.error('Error deleting purpose:', error);
    }
  };

  if (loading && purposes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">방문 목적 관리</h1>
          <p className="text-sm text-gray-500">방문 목적별 서식을 구성하고 관리합니다.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2 w-full sm:w-auto h-11 sm:h-auto">
          <Plus className="w-4 h-4" /> 새 목적 추가
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {purposes.map((purpose) => (
          <Card key={purpose.id} className="p-6 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{purpose.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{purpose.description || '설명 없음'}</p>
              </div>
              <div className={cn(
                'px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider',
                purpose.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              )}>
                {purpose.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
            
            <div className="mt-auto pt-6 flex items-center gap-2 border-t border-gray-100">
              <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => handleOpenModal(purpose)}>
                <Edit2 className="w-3.5 h-3.5" /> 수정
              </Button>
              <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-100" onClick={() => handleDelete(purpose.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white md:rounded-2xl shadow-2xl w-full h-full md:h-auto md:max-w-2xl md:max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-lg md:text-xl font-bold text-gray-900">
                  {editingPurpose?.id ? '방문 목적 수정' : '새 방문 목적 추가'}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 pb-24 md:pb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs md:text-sm font-bold text-gray-700">목적명</Label>
                    <Input
                      placeholder="예: 일반 방문, 공사성 방문"
                      value={editingPurpose?.name || ''}
                      onChange={(e) => setEditingPurpose({ ...editingPurpose, name: e.target.value })}
                      className="h-11 md:h-auto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs md:text-sm font-bold text-gray-700">설명</Label>
                    <Input
                      placeholder="간단한 설명을 입력하세요"
                      value={editingPurpose?.description || ''}
                      onChange={(e) => setEditingPurpose({ ...editingPurpose, description: e.target.value })}
                      className="h-11 md:h-auto"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base md:text-lg font-bold text-gray-900">입력 항목 구성</Label>
                    <Button variant="outline" size="sm" onClick={handleAddField} className="gap-2 h-9 md:h-auto">
                      <Plus className="w-3.5 h-3.5" /> 항목 추가
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {editingPurpose?.fields?.map((field, index) => (
                      <div key={field.id} className="p-3 md:p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col md:flex-row items-start gap-4">
                        <div className="hidden md:block pt-2 text-gray-400">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="flex-1 w-full space-y-4">
                          <div className="flex items-center justify-between md:hidden">
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase">Item #{index + 1}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:bg-red-50 disabled:opacity-30"
                              onClick={() => handleRemoveField(field.id)}
                              disabled={field.id === 'name' || field.id === 'contact'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] md:text-xs uppercase text-gray-500 font-bold">라벨</Label>
                              <Input
                                value={field.label}
                                onChange={(e) => handleFieldChange(field.id, { label: e.target.value })}
                                className="h-10 md:h-8 text-sm md:text-xs disabled:opacity-50"
                                disabled={field.id === 'name' || field.id === 'contact'}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] md:text-xs uppercase text-gray-500 font-bold">유형</Label>
                              <select
                                className="w-full h-10 md:h-8 rounded-md border border-gray-300 bg-white px-2 text-sm md:text-xs disabled:opacity-50"
                                value={field.type}
                                onChange={(e) => {
                                  const newType = e.target.value as any;
                                  handleFieldChange(field.id, { type: newType });
                                }}
                                disabled={field.id === 'name' || field.id === 'contact'}
                              >
                                <option value="text">단문 입력</option>
                                <option value="textarea">장문 입력</option>
                                <option value="tel">연락처</option>
                                <option value="date">날짜</option>
                                <option value="time">시간</option>
                                <option value="file">첨부파일(사진)</option>
                                <option value="select">선택(드롭다운)</option>
                                <option value="radio">선택(라디오)</option>
                                <option value="checkbox">다중 선택</option>
                              </select>
                            </div>
                            <div className="flex items-center justify-between md:justify-start gap-4 h-10 md:h-8 md:pt-6">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  disabled={field.id === 'name' || field.id === 'contact'}
                                  onChange={(e) => handleFieldChange(field.id, { required: e.target.checked })}
                                  className="w-4 h-4 md:w-3.5 md:h-3.5 rounded text-blue-600 disabled:opacity-50"
                                />
                                <span className="text-sm md:text-xs font-medium text-gray-600">필수 입력</span>
                              </label>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hidden md:flex h-8 w-8 text-red-500 hover:bg-red-50 disabled:opacity-30"
                                onClick={() => handleRemoveField(field.id)}
                                disabled={field.id === 'name' || field.id === 'contact'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            
                            {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                              <div className="md:col-span-3 space-y-1.5">
                                <Label className="text-[10px] md:text-xs uppercase text-gray-500 font-bold">옵션 (쉼표로 구분)</Label>
                                <Input
                                  placeholder="예: 옵션1, 옵션2, 옵션3"
                                  value={field.options?.join(',') || ''}
                                  onChange={(e) => handleFieldChange(field.id, { options: e.target.value.split(',') })}
                                  className="h-10 md:h-8 text-sm md:text-xs"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-6 border-t border-gray-100 bg-gray-50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 sticky bottom-0 z-20">
                <label className="flex items-center gap-3 cursor-pointer py-2 md:py-0">
                  <input
                    type="checkbox"
                    checked={editingPurpose?.isActive}
                    onChange={(e) => setEditingPurpose({ ...editingPurpose, isActive: e.target.checked })}
                    className="w-5 h-5 md:w-4 md:h-4 rounded text-blue-600"
                  />
                  <span className="text-sm md:text-base font-medium text-gray-700">이 목적을 활성화합니다</span>
                </label>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 md:flex-none h-12 md:h-auto">취소</Button>
                  <Button onClick={handleSave} className="gap-2 flex-[2] md:flex-none h-12 md:h-auto">
                    <Save className="w-4 h-4" /> 저장하기
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
