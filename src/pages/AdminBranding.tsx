import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { AdminUser } from '../types';
import { Card, Button, Input, Label } from '../components/ui/Button';
import { Loader2, Save, Image as ImageIcon, Lock, X, Palette, ClipboardList } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const AdminBranding: React.FC = () => {
  const [adminData, setAdminData] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tempLogo, setTempLogo] = useState<string | undefined>(undefined);
  const [tempTitle, setTempTitle] = useState('');

  useEffect(() => {
    const fetchAdminData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const adminDoc = await getDoc(doc(db, 'users', user.uid));
        if (adminDoc.exists()) {
          const data = adminDoc.data() as AdminUser;
          setAdminData(data);
          setTempLogo(data.brandingLogo);
          setTempTitle(data.brandingTitle || '디지털 방문일지');
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const handleLogoChange = (file: File | null) => {
    if (!file) {
      setTempLogo(undefined);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 400;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/png', 0.8);
        setTempLogo(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!adminData?.isSubscribed) {
      alert('브랜딩 관리 기능은 구독 회원만 이용 가능합니다.');
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        brandingLogo: tempLogo || null,
        brandingTitle: tempTitle,
      });
      setAdminData(prev => prev ? { ...prev, brandingLogo: tempLogo, brandingTitle: tempTitle } : null);
      alert('브랜딩 설정이 저장되었습니다.');
    } catch (error) {
      console.error('Error saving branding:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const isSubscribed = adminData?.isSubscribed || false;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">브랜딩 관리</h1>
          <p className="text-gray-500">방문객 화면의 로고와 문구를 커스터마이징합니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-8 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Palette className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold">화면 커스터마이징</h2>
              {!isSubscribed && <Lock className="w-4 h-4 text-gray-400" />}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>회사 로고 이미지</Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                    {tempLogo ? (
                      <>
                        <img src={tempLogo} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                        <button 
                          onClick={() => setTempLogo(undefined)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors"
                          disabled={!isSubscribed}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      투명 배경의 PNG 파일을 권장합니다.<br />
                      최적 크기: 400x400px 이하
                    </p>
                    <label className={cn(
                      "inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                      isSubscribed ? "bg-white border border-gray-300 hover:bg-gray-50" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}>
                      파일 선택
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleLogoChange(e.target.files?.[0] || null)}
                        disabled={!isSubscribed}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>메인 문구</Label>
                <Input 
                  placeholder="예: 우리 회사 방문을 환영합니다"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  disabled={!isSubscribed}
                />
                <p className="text-xs text-gray-400">방문객 접속 시 상단에 표시되는 제목입니다.</p>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              {!isSubscribed && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">구독이 필요한 기능입니다</p>
                    <p className="text-xs text-amber-700 mt-1">
                      회사 로고 변경 및 문구 커스터마이징은 구독 회원 전용 기능입니다. 운영자에게 문의하여 구독을 활성화하세요.
                    </p>
                  </div>
                </div>
              )}
              <Button 
                className="w-full h-12 gap-2" 
                onClick={handleSave} 
                disabled={!isSubscribed || saving}
                isLoading={saving}
              >
                <Save className="w-4 h-4" /> 설정 저장하기
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-8 bg-gray-50 border-none">
          <h2 className="text-lg font-bold mb-6">미리보기 (방문자 화면)</h2>
          <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden max-w-xs mx-auto aspect-[9/16] flex flex-col items-center p-6 scale-90 origin-top">
            <header className="text-center mb-8 mt-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg mb-4 overflow-hidden">
                {tempLogo ? (
                  <img src={tempLogo} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <ClipboardList className="w-6 h-6 text-white" />
                )}
              </div>
              <h1 className="text-xl font-bold text-gray-900">{tempTitle || '디지털 방문일지'}</h1>
              <p className="text-[10px] text-gray-500 mt-1">방문 목적을 선택해 주세요.</p>
            </header>

            <div className="w-full space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 rounded-xl border border-gray-50 bg-gray-50/50 flex items-center justify-between">
                  <div className="h-3 w-20 bg-gray-200 rounded"></div>
                  <div className="h-4 w-4 bg-gray-100 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
