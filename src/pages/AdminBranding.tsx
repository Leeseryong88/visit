import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { AdminUser } from '../types';
import { Card, Button, Input, Label } from '../components/ui/Button';
import { Loader2, Save, Image as ImageIcon, Lock, X, Palette, ClipboardList, Crop, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  const [tempBannerCrop, setTempBannerCrop] = useState<AdminUser['brandingBannerCrop']>({ x: 0, y: 25, width: 100, height: 50 });
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

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
          setTempBannerCrop(data.brandingBannerCrop || { x: 0, y: 25, width: 100, height: 50 });
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
        const MAX_SIZE = tempType === 'banner' ? 1600 : 400;

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
        // Reset crop for new image
        if (tempType === 'banner') {
          setTempBannerCrop({ x: 0, y: 25, width: 100, height: 50 });
          setIsCropModalOpen(true);
        }
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
        brandingBannerCrop: tempBannerCrop,
      });
      setAdminData(prev => prev ? { 
        ...prev, 
        brandingLogo: tempLogo, 
        brandingTitle: tempTitle,
        brandingType: tempType,
        brandingColor: tempColor,
        brandingBannerPosition: tempBannerPosition,
        brandingBannerCrop: tempBannerCrop,
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
                        <Label>배너 노출 영역 설정</Label>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2"
                          onClick={() => setIsCropModalOpen(true)}
                          disabled={!isSubscribed}
                        >
                          <Crop className="w-3.5 h-3.5" /> 노출 영역 조정
                        </Button>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-[10px] text-gray-500 leading-relaxed">
                        배너는 모바일 화면 상단에 꽉 차게 표시됩니다. <br />
                        위의 버튼을 눌러 이미지의 어느 부분을 보여줄지 박스를 이동하여 설정하세요.
                      </div>
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
                  <div 
                    className="absolute inset-0 bg-cover bg-no-repeat"
                    style={{ 
                      backgroundImage: `url(${tempLogo})`,
                      backgroundPosition: `${tempBannerCrop!.width === 100 ? 0 : (tempBannerCrop!.x / (100 - tempBannerCrop!.width)) * 100}% ${tempBannerCrop!.height === 100 ? 0 : (tempBannerCrop!.y / (100 - tempBannerCrop!.height)) * 100}%`,
                      backgroundSize: `${10000 / (tempBannerCrop?.width || 100)}% ${10000 / (tempBannerCrop?.height || 100)}%`
                    }}
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
      {/* Banner Area (Crop) Modal */}
      <AnimatePresence>
        {isCropModalOpen && tempLogo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Crop className="w-5 h-5 text-blue-600" /> 노출 영역 조정
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">박스를 드래그하거나 모서리를 조절하여 노출할 영역을 선택하세요.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsCropModalOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 bg-gray-900 p-8 flex items-center justify-center overflow-hidden relative min-h-[300px]">
                <div className="relative inline-block max-w-full max-h-full">
                  <img 
                    src={tempLogo} 
                    className="max-w-full max-h-full object-contain pointer-events-none select-none" 
                    alt="Original" 
                  />
                  
                  {/* Crop Box */}
                  <motion.div
                    drag
                    dragMomentum={false}
                    dragElastic={0}
                    onDrag={(e, info) => {
                      const container = e.currentTarget.parentElement;
                      if (!container) return;
                      const rect = container.getBoundingClientRect();
                      const box = e.currentTarget.getBoundingClientRect();
                      
                      const x = Math.max(0, Math.min(100 - tempBannerCrop!.width, ((box.left - rect.left) / rect.width) * 100));
                      const y = Math.max(0, Math.min(100 - tempBannerCrop!.height, ((box.top - rect.top) / rect.height) * 100));
                      
                      setTempBannerCrop(prev => prev ? { ...prev, x, y } : null);
                    }}
                    style={{
                      position: 'absolute',
                      left: `${tempBannerCrop?.x}%`,
                      top: `${tempBannerCrop?.y}%`,
                      width: `${tempBannerCrop?.width}%`,
                      height: `${tempBannerCrop?.height}%`,
                      border: '2px solid #2563eb',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                      cursor: 'move',
                      zIndex: 10
                    }}
                  >
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
                      <div className="border border-white/50"></div><div className="border border-white/50"></div><div className="border border-white/50"></div>
                      <div className="border border-white/50"></div><div className="border border-white/50"></div><div className="border border-white/50"></div>
                      <div className="border border-white/50"></div><div className="border border-white/50"></div><div className="border border-white/50"></div>
                    </div>
                    
                    {/* Handles */}
                    {/* Bottom-Right Handle for Resizing */}
                    <div 
                      className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 border-2 border-white rounded-full -mr-3 -mb-3 cursor-nwse-resize z-20 flex items-center justify-center"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startW = tempBannerCrop!.width;
                        const startH = tempBannerCrop!.height;
                        const containerRect = e.currentTarget.closest('.relative')?.getBoundingClientRect();
                        if (!containerRect) return;

                        const onPointerMove = (moveEvent: PointerEvent) => {
                          const deltaX = ((moveEvent.clientX - startX) / containerRect.width) * 100;
                          const deltaY = ((moveEvent.clientY - startY) / containerRect.height) * 100;
                          
                          setTempBannerCrop(prev => {
                            if (!prev) return null;
                            const newW = Math.max(10, Math.min(100 - prev.x, startW + deltaX));
                            const newH = Math.max(10, Math.min(100 - prev.y, startH + deltaY));
                            return { ...prev, width: newW, height: newH };
                          });
                        };

                        const onPointerUp = () => {
                          window.removeEventListener('pointermove', onPointerMove);
                          window.removeEventListener('pointerup', onPointerUp);
                        };

                        window.addEventListener('pointermove', onPointerMove);
                        window.addEventListener('pointerup', onPointerUp);
                      }}
                    >
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                  </motion.div>
                </div>
              </div>

              <div className="p-6 bg-white border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">배너는 가로가 긴 형태(3:1 권장)가 가장 예쁘게 표시됩니다.</p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setIsCropModalOpen(false)}>취소</Button>
                  <Button className="gap-2" onClick={() => setIsCropModalOpen(false)}>
                    <Check className="w-4 h-4" /> 영역 확정
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
