import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { AdminUser, VisitPurpose } from '../types';
import { uploadBase64 } from '../lib/storage';
import { Card, Button, Input, Label } from '../components/ui/Button';
import { Loader2, Save, Image as ImageIcon, X, Palette, ClipboardList, Crop, Check, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const AdminSubscription: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'branding' | 'notification'>('branding');
  const [adminData, setAdminData] = useState<AdminUser | null>(null);
  const [purposes, setPurposes] = useState<VisitPurpose[]>([]);
  const [selectedPurposeId, setSelectedPurposeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Branding state
  const [tempLogo, setTempLogo] = useState<string | undefined>(undefined);
  const [tempTitle, setTempTitle] = useState('');
  const [tempType, setTempType] = useState<'icon' | 'banner'>('icon');
  const [tempColor, setTempColor] = useState('#2563eb');
  const [tempBannerPosition, setTempBannerPosition] = useState(50);
  const [tempBannerCrop, setTempBannerCrop] = useState<AdminUser['brandingBannerCrop']>({ x: 0, y: 25, width: 100, height: 50 });
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  
  // Notification state
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationType, setNotificationType] = useState<'text' | 'image' | 'both'>('image');
  const [notificationText, setNotificationText] = useState('');
  const [notificationImage, setNotificationImage] = useState<string | undefined>(undefined);
  
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setLoading(true);
      const [adminDoc, purposesSnapshot] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        getDocs(query(collection(db, 'purposes'), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc')))
      ]);

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

      const purposesData = purposesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitPurpose));
      setPurposes(purposesData);
      if (purposesData.length > 0) {
        handleSelectPurpose(purposesData[0].id, purposesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPurpose = (id: string, data: VisitPurpose[] = purposes) => {
    setSelectedPurposeId(id);
    const purpose = data.find(p => p.id === id);
    if (purpose) {
      setNotificationEnabled(purpose.notificationEnabled || false);
      setNotificationType(purpose.notificationType || 'image');
      setNotificationText(purpose.notificationText || '');
      setNotificationImage(purpose.notificationImage);
    }
  };

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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setTempLogo(dataUrl);
        if (tempType === 'banner') {
          setTempBannerCrop({ x: 0, y: 25, width: 100, height: 50 });
          setIsCropModalOpen(true);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleNotificationImageChange = (file: File | null) => {
    if (!file) {
      setNotificationImage(undefined);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 400;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setNotificationImage(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      let finalLogoUrl = tempLogo;
      if (tempLogo && tempLogo.startsWith('data:')) {
        finalLogoUrl = await uploadBase64(`branding/${user.uid}/logo_${new Date().getTime()}.jpg`, tempLogo);
      }

      await updateDoc(doc(db, 'users', user.uid), {
        brandingLogo: finalLogoUrl || null,
        brandingTitle: tempTitle,
        brandingType: tempType,
        brandingColor: tempColor,
        brandingBannerPosition: tempBannerPosition,
        brandingBannerCrop: tempBannerCrop,
      });
      setAdminData(prev => prev ? { 
        ...prev, 
        brandingLogo: finalLogoUrl, 
        brandingTitle: tempTitle,
        brandingType: tempType,
        brandingColor: tempColor,
        brandingBannerPosition: tempBannerPosition,
        brandingBannerCrop: tempBannerCrop,
      } : null);
      setTempLogo(finalLogoUrl);
      alert('브랜딩 설정이 저장되었습니다.');
    } catch (error) {
      console.error('Error saving branding:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotification = async () => {
    if (!selectedPurposeId || !auth.currentUser) return;

    setSaving(true);
    try {
      let finalImageUrl = notificationImage;
      if (notificationImage && notificationImage.startsWith('data:')) {
        finalImageUrl = await uploadBase64(`notifications/${auth.currentUser.uid}/${selectedPurposeId}_${new Date().getTime()}.jpg`, notificationImage);
      }

      await updateDoc(doc(db, 'purposes', selectedPurposeId), {
        notificationEnabled,
        notificationType,
        notificationText,
        notificationImage: finalImageUrl || null,
        updatedAt: serverTimestamp(),
      });
      
      setPurposes(prev => prev.map(p => p.id === selectedPurposeId ? {
        ...p,
        notificationEnabled,
        notificationType,
        notificationText,
        notificationImage: finalImageUrl
      } : p));
      
      setNotificationImage(finalImageUrl);
      alert('알림 설정이 저장되었습니다.');
    } catch (error) {
      console.error('Error saving notification:', error);
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

  const PRESET_COLORS = [
    '#2563eb', '#3b82f6', '#0ea5e9', '#06b6d4', 
    '#10b981', '#22c55e', '#84cc16', '#eab308', 
    '#f97316', '#ef4444', '#f43f5e', '#ec4899', 
    '#d946ef', '#a855f7', '#8b5cf6', '#6366f1',
    '#475569', '#1e293b', '#000000'
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">구독 서비스</h1>
            <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm">BETA</span>
          </div>
          <p className="text-gray-500">브랜딩 및 부가 기능을 관리합니다.</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('branding')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'branding' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            브랜딩 관리
          </button>
          <button
            onClick={() => setActiveTab('notification')}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'notification' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            알림 기능
          </button>
        </div>
      </div>

      {activeTab === 'branding' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="p-8 space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold">표시 방식 설정</h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setTempType('icon')}
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
                      <p className="text-[10px] text-gray-500">상단 전체를 덮는 레이아웃</p>
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
                              style={tempType === 'banner' ? { 
                                objectPosition: `center ${tempBannerPosition}%`,
                                backgroundPosition: `${tempBannerCrop!.width === 100 ? 0 : (tempBannerCrop!.x / (100 - tempBannerCrop!.width)) * 100}% ${tempBannerCrop!.height === 100 ? 0 : (tempBannerCrop!.y / (100 - tempBannerCrop!.height)) * 100}%`,
                                backgroundSize: `${10000 / (tempBannerCrop?.width || 100)}% ${10000 / (tempBannerCrop?.height || 100)}%`
                              } : {}}
                            />
                            <button 
                              onClick={() => setTempLogo(undefined)}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
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
                        "inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 shadow-sm"
                      )}>
                        파일 선택
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          onChange={(e) => handleLogoChange(e.target.files?.[0] || null)}
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
                          >
                            <Crop className="w-3.5 h-3.5" /> 노출 영역 조정
                          </Button>
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
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <Button 
                    className="w-full h-12 gap-2" 
                    onClick={handleSaveBranding} 
                    disabled={saving}
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="p-8 space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold">알림 기능 설정</h2>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>방문 목적 선택</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {purposes.map(purpose => (
                        <button
                          key={purpose.id}
                          onClick={() => handleSelectPurpose(purpose.id)}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                            selectedPurposeId === purpose.id
                              ? "border-blue-600 bg-blue-50"
                              : "border-gray-100 hover:border-gray-200"
                          )}
                        >
                          <span className="font-medium text-sm">{purpose.name}</span>
                          {purpose.notificationEnabled && (
                            <Bell className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedPurposeId && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6 pt-6 border-t border-gray-100"
                    >
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-bold text-gray-900">해당 목적 알림 사용</Label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={notificationEnabled}
                            onChange={(e) => setNotificationEnabled(e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {notificationEnabled && (
                        <div className="space-y-6 p-6 bg-blue-50 rounded-2xl border border-blue-100">
                          <div className="space-y-3">
                            <Label className="text-xs text-blue-600 font-bold uppercase tracking-wider">알림 유형</Label>
                            <div className="flex gap-4">
                              {['text', 'image', 'both'].map((type) => (
                                <label key={type} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="notifType"
                                    checked={notificationType === type}
                                    onChange={() => setNotificationType(type as any)}
                                    className="w-4 h-4 text-blue-600"
                                  />
                                  <span className="text-sm font-medium text-gray-700">
                                    {type === 'text' ? '문구만' : type === 'image' ? '이미지만' : '둘 다'}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {(notificationType === 'text' || notificationType === 'both') && (
                            <div className="space-y-2">
                              <Label className="text-xs text-blue-600 font-bold uppercase tracking-wider">알림 문구</Label>
                              <textarea
                                className="w-full min-h-[100px] p-4 rounded-xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="방문객에게 보여줄 알림 내용을 입력하세요"
                                value={notificationText}
                                onChange={(e) => setNotificationText(e.target.value)}
                              />
                            </div>
                          )}

                          {(notificationType === 'image' || notificationType === 'both') && (
                            <div className="space-y-2">
                              <Label className="text-xs text-blue-600 font-bold uppercase tracking-wider">알림 이미지</Label>
                              <div className="flex items-center gap-4">
                                <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-blue-200 rounded-xl p-6 bg-white hover:bg-blue-50 cursor-pointer transition-colors">
                                  {notificationImage ? (
                                    <div className="relative w-full aspect-video max-h-[200px]">
                                      <img src={notificationImage} className="w-full h-full object-contain rounded-lg" alt="Notification" />
                                      <button 
                                        onClick={(e) => { e.preventDefault(); setNotificationImage(undefined); }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <ImageIcon className="w-8 h-8 text-blue-400 mb-2" />
                                      <span className="text-sm text-blue-500 font-medium">알림 이미지 업로드</span>
                                    </>
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleNotificationImageChange(e.target.files?.[0] || null)}
                                  />
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <Button 
                        className="w-full h-12 gap-2" 
                        onClick={handleSaveNotification} 
                        disabled={saving}
                        isLoading={saving}
                      >
                        <Save className="w-4 h-4" /> 알림 설정 저장
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-8 bg-gray-100/50 border-none sticky top-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">알림 미리보기</h2>
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

              <div className="flex-1 flex flex-col items-center justify-center px-6">
                <AnimatePresence mode="wait">
                  {notificationEnabled ? (
                    <motion.div
                      key="modal"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-full"
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-2 text-blue-600">
                          <Bell className="w-4 h-4" />
                          <p className="text-[10px] font-bold">시설관리자 알림</p>
                        </div>
                        
                        {(notificationType === 'text' || notificationType === 'both') && notificationText && (
                          <p className="text-[10px] text-gray-700 bg-blue-50 p-2 rounded-lg leading-relaxed">
                            {notificationText}
                          </p>
                        )}
                        
                        {(notificationType === 'image' || notificationType === 'both') && notificationImage && (
                          <img src={notificationImage} className="w-full rounded-lg" alt="Preview" />
                        )}
                        
                        <Button className="w-full h-8 text-[10px] rounded-lg">확인했습니다</Button>
                      </div>
                    </motion.div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center">알림이 활성화되지 않았습니다.</p>
                  )}
                </AnimatePresence>
              </div>

              {/* Home Indicator */}
              <div className="h-1 w-24 bg-gray-200 rounded-full absolute bottom-2 left-1/2 -translate-x-1/2"></div>
            </div>
          </Card>
        </div>
      )}

      {/* Crop Modal */}
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
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsCropModalOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 bg-gray-900 p-8 flex items-center justify-center overflow-hidden relative min-h-[300px]">
                <div ref={containerRef} className="relative inline-block max-w-full max-h-full">
                  <img 
                    src={tempLogo} 
                    className="max-w-full max-h-full object-contain pointer-events-none select-none" 
                    alt="Original" 
                  />
                  
                  <motion.div
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.stopPropagation();
                      if (!containerRef.current || !tempBannerCrop) return;
                      
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startBoxX = tempBannerCrop.x;
                      const startBoxY = tempBannerCrop.y;
                      const rect = containerRef.current.getBoundingClientRect();

                      const onPointerMove = (moveEvent: PointerEvent) => {
                        const deltaX = ((moveEvent.clientX - startX) / rect.width) * 100;
                        const deltaY = ((moveEvent.clientY - startY) / rect.height) * 100;
                        
                        setTempBannerCrop(prev => {
                          if (!prev) return null;
                          const newX = Math.max(0, Math.min(100 - prev.width, startBoxX + deltaX));
                          const newY = Math.max(0, Math.min(100 - prev.height, startBoxY + deltaY));
                          return { ...prev, x: newX, y: newY };
                        });
                      };

                      const onPointerUp = () => {
                        window.removeEventListener('pointermove', onPointerMove);
                        window.removeEventListener('pointerup', onPointerUp);
                      };

                      window.addEventListener('pointermove', onPointerMove, { passive: false });
                      window.addEventListener('pointerup', onPointerUp);
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
                      zIndex: 10,
                      touchAction: 'none'
                    }}
                  >
                    <div 
                      className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 border-2 border-white rounded-full -mr-4 -mb-4 cursor-nwse-resize z-20 flex items-center justify-center shadow-lg"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        if (!containerRef.current || !tempBannerCrop) return;
                        
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startW = tempBannerCrop.width;
                        const startH = tempBannerCrop.height;
                        const rect = containerRef.current.getBoundingClientRect();

                        const onPointerMove = (moveEvent: PointerEvent) => {
                          const deltaX = ((moveEvent.clientX - startX) / rect.width) * 100;
                          const deltaY = ((moveEvent.clientY - startY) / rect.height) * 100;
                          
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

                        window.addEventListener('pointermove', onPointerMove, { passive: false });
                        window.addEventListener('pointerup', onPointerUp);
                      }}
                    >
                      <div className="w-3 h-3 border-r-2 border-b-2 border-white rotate-45 -mt-1 -ml-1" />
                    </div>
                  </motion.div>
                </div>
              </div>

              <div className="p-6 bg-white border-t border-gray-100 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setIsCropModalOpen(false)}>취소</Button>
                <Button className="gap-2" onClick={() => setIsCropModalOpen(false)}>
                  <Check className="w-4 h-4" /> 영역 확정
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
