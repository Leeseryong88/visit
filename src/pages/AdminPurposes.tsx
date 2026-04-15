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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">방문 목적 관리</h1>
          <p className="text-gray-500">방문 목적별 서식을 구성하고 관리합니다.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="w-4 h-4" /> 새 목적 추가
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingPurpose?.id ? '방문 목적 수정' : '새 방문 목적 추가'}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>목적명</Label>
                    <Input
                      placeholder="예: 일반 방문, 공사성 방문"
                      value={editingPurpose?.name || ''}
                      onChange={(e) => setEditingPurpose({ ...editingPurpose, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>설명</Label>
                    <Input
                      placeholder="간단한 설명을 입력하세요"
                      value={editingPurpose?.description || ''}
                      onChange={(e) => setEditingPurpose({ ...editingPurpose, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg">입력 항목 구성</Label>
                    <Button variant="outline" size="sm" onClick={handleAddField} className="gap-2">
                      <Plus className="w-3.5 h-3.5" /> 항목 추가
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {editingPurpose?.fields?.map((field, index) => (
                      <div key={field.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-4">
                        <div className="pt-2 text-gray-400">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-gray-500">라벨</Label>
                            <Input
                              value={field.label}
                              onChange={(e) => handleFieldChange(field.id, { label: e.target.value })}
                              className="h-8 text-xs disabled:opacity-50"
                              disabled={field.id === 'name' || field.id === 'contact'}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-gray-500">유형</Label>
                            <select
                              className="w-full h-8 rounded-md border border-gray-300 bg-white px-2 text-xs disabled:opacity-50"
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
                          <div className="flex items-center gap-4 pt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.required}
                                disabled={field.id === 'name' || field.id === 'contact'}
                                onChange={(e) => handleFieldChange(field.id, { required: e.target.checked })}
                                className="w-3.5 h-3.5 rounded text-blue-600 disabled:opacity-50"
                              />
                              <span className="text-xs font-medium text-gray-600">필수</span>
                            </label>
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
                          
                          {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                            <div className="md:col-span-3 space-y-1">
                              <Label className="text-[10px] uppercase text-gray-500">옵션 (쉼표로 구분)</Label>
                              <Input
                                placeholder="예: 옵션1, 옵션2, 옵션3"
                                value={field.options?.join(',') || ''}
                                onChange={(e) => handleFieldChange(field.id, { options: e.target.value.split(',') })}
                                className="h-8 text-xs"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPurpose?.isActive}
                    onChange={(e) => setEditingPurpose({ ...editingPurpose, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">활성화 상태</span>
                </label>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>취소</Button>
                  <Button onClick={handleSave} className="gap-2">
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
