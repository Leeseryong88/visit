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
  const [tempType, setTempType] = useState<'icon' | 'banner'>('icon');
  const [tempColor, setTempColor] = useState('#2563eb');
  const [tempBannerPosition, setTempBannerPosition] = useState(50);

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
          setTempType(data.brandingType || 'icon');
          setTempColor(data.brandingColor || '#2563eb');
          setTempBannerPosition(data.brandingBannerPosition ?? 50);
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
        
        // For banner, we might want higher resolution
        const MAX_SIZE = tempType === 'banner' ? 1200 : 400;

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
        // Use higher quality for banners
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
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
        brandingType: tempType,
        brandingColor: tempColor,
        brandingBannerPosition: tempBannerPosition,
      });
      setAdminData(prev => prev ? { 
        ...prev, 
        brandingLogo: tempLogo, 
        brandingTitle: tempTitle,
        brandingType: tempType,
        brandingColor: tempColor,
        brandingBannerPosition: tempBannerPosition,
      } : null);
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

  const PRESET_COLORS = [
    '#2563eb', '#3b82f6', '#0ea5e9', '#06b6d4', 
    '#10b981', '#22c55e', '#84cc16', '#eab308', 
    '#f97316', '#ef4444', '#f43f5e', '#ec4899', 
    '#d946ef', '#a855f7', '#8b5cf6', '#6366f1',
    '#475569', '#1e293b', '#000000'
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">브랜딩 관리</h1>
          <p className="text-gray-500">방문객 화면의 로고와 문구를 커스터마이징합니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="p-8 space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold">표시 방식 설정</h2>
                {!isSubscribed && <Lock className="w-4 h-4 text-gray-400" />}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTempType('icon')}
                  disabled={!isSubscribed}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all text-left space-y-2",
                    tempType === 'icon' 
                      ? "border-blue-600 bg-blue-50" 
                      : "border-gray-100 hover:border-gray-200"
                  )}
                >
                  <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">아이콘 로고형</p>
                    <p className="text-[10px] text-gray-500">중앙에 원형/사각형 로고와 배경색 적용</p>
                  </div>
                </button>

                <button
                  onClick={() => setTempType('banner')}
                  disabled={!isSubscribed}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all text-left space-y-2",
                    tempType === 'banner' 
                      ? "border-blue-600 bg-blue-50" 
                      : "border-gray-100 hover:border-gray-200"
                  )}
                >
                  <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center overflow-hidden">
                    <div className="w-full h-4 bg-gray-200 absolute top-0"></div>
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">상부 게시형 (배너)</p>
                    <p className="text-[10px] text-gray-500">상단 전체를 덮는 이미지형 레이아웃</p>
                  </div>
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{tempType === 'icon' ? '로고 이미지' : '배너 이미지'}</Label>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "relative bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden",
                      tempType === 'icon' ? "w-24 h-24" : "w-full h-32"
                    )}>
                      {tempLogo ? (
                        <>
                          <img 
                            src={tempLogo} 
                            alt="Preview" 
                            className={cn(
                              "w-full h-full",
                              tempType === 'icon' ? "object-contain p-2" : "object-cover"
                            )} 
                            style={tempType === 'banner' ? { objectPosition: `center ${tempBannerPosition}%` } : {}}
                          />
                          <button 
                            onClick={() => setTempLogo(undefined)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                            disabled={!isSubscribed}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                          <p className="text-[10px] text-gray-400">이미지를 선택하세요</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-gray-500">
                      {tempType === 'icon' 
                        ? '투명 배경 PNG 권장 (400x400)' 
                        : '가로가 긴 고해상도 이미지 권장 (1200x400)'}
                    </p>
                    <label className={cn(
                      "inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                      isSubscribed ? "bg-white border border-gray-300 hover:bg-gray-50 shadow-sm" : "bg-gray-100 text-gray-400 cursor-not-allowed"
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

                {tempType === 'icon' ? (
                  <div className="space-y-3 pt-2">
                    <Label>로고 배경색</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => setTempColor(color)}
                          disabled={!isSubscribed}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-transform active:scale-90",
                            tempColor === color ? "border-white ring-2 ring-blue-500 scale-110" : "border-transparent"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <div className="relative">
                        <input 
                          type="color" 
                          value={tempColor}
                          onChange={(e) => setTempColor(e.target.value)}
                          disabled={!isSubscribed}
                          className="w-8 h-8 rounded-full border-none p-0 overflow-hidden cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  tempLogo && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <Label>이미지 노출 위치 (세로 방향)</Label>
                        <span className="text-[10px] font-mono text-gray-500">{tempBannerPosition}%</span>
                      </div>
                      <Input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={tempBannerPosition} 
                        onChange={(e) => setTempBannerPosition(parseInt(e.target.value))}
                        disabled={!isSubscribed}
                        className="h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <p className="text-[10px] text-gray-400">이미지의 어느 부분을 강조할지 슬라이더를 움직여 조정하세요.</p>
                    </div>
                  )
                )}

                <div className="space-y-2 pt-2">
                  <Label>메인 문구</Label>
                  <Input 
                    placeholder="예: 우리 회사 방문을 환영합니다"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    disabled={!isSubscribed}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                {!isSubscribed && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <Lock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-amber-900">구독이 필요한 기능입니다</p>
                      <p className="text-xs text-amber-700 mt-1">
                        로고 스타일 및 배경색 변경은 구독 회원 전용 기능입니다.
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
        </div>

        <Card className="p-8 bg-gray-100/50 border-none sticky top-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">실시간 미리보기</h2>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <div className="w-2 h-2 rounded-full bg-amber-400"></div>
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
            </div>
          </div>
          
          <div className="bg-white rounded-[2.5rem] shadow-2xl border-8 border-gray-900 overflow-hidden max-w-[280px] mx-auto aspect-[9/19] flex flex-col relative scale-90 origin-top">
            {/* Status Bar */}
            <div className="h-6 w-full flex justify-between items-center px-6 pt-2">
              <span className="text-[10px] font-bold">9:41</span>
              <div className="flex gap-1">
                <div className="w-3 h-2 bg-black rounded-[1px]"></div>
                <div className="w-2 h-2 bg-black rounded-full"></div>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-y-auto">
              {tempType === 'banner' && tempLogo ? (
                <div className="w-full h-40 flex-shrink-0 relative overflow-hidden">
                  <img 
                    src={tempLogo} 
                    className="w-full h-full object-cover" 
                    style={{ objectPosition: `center ${tempBannerPosition}%` }}
                    alt="Banner" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent"></div>
                </div>
              ) : null}

              <header className={cn(
                "text-center p-6",
                tempType === 'banner' ? "mt-2" : "mt-8"
              )}>
                {tempType === 'icon' && (
                  <div 
                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-6 overflow-hidden transition-colors"
                    style={{ backgroundColor: tempColor }}
                  >
                    {tempLogo ? (
                      <img src={tempLogo} alt="Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <ClipboardList className="w-8 h-8 text-white" />
                    )}
                  </div>
                )}
                <h1 className="text-xl font-bold text-gray-900 leading-tight">{tempTitle || '디지털 방문일지'}</h1>
                <p className="text-[11px] text-gray-500 mt-2 font-medium">방문 목적을 선택해 주세요.</p>
              </header>

              <div className="px-6 pb-8 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 rounded-2xl border border-gray-100 bg-white shadow-sm flex items-center justify-between">
                    <div className="space-y-1.5">
                      <div className="h-2.5 w-20 bg-gray-100 rounded-full"></div>
                      <div className="h-2 w-32 bg-gray-50 rounded-full"></div>
                    </div>
                    <div className="w-5 h-5 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                      <ImageIcon className="w-3 h-3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Home Indicator */}
            <div className="h-1 w-24 bg-gray-200 rounded-full absolute bottom-2 left-1/2 -translate-x-1/2"></div>
          </div>
        </Card>
      </div>
    </div>
  );
};
