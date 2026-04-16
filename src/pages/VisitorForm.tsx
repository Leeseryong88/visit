import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { VisitPurpose, AdminUser } from '../types';
import { Card, Button, Input, Label } from '../components/ui/Button';
import { DynamicForm } from '../components/DynamicForm';
import { SignaturePad } from '../components/SignaturePad';
import { uploadBase64 } from '../lib/storage';
import { ChevronLeft, Loader2, CheckCircle2, Download, Bell, X, ClipboardList, AlertCircle, ShieldAlert, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { domToPng } from 'modern-screenshot';

export const VisitorForm: React.FC = () => {
  const { adminId, purposeId } = useParams<{ adminId: string, purposeId: string }>();
  const [purpose, setPurpose] = useState<VisitPurpose | null>(null);
  const [adminData, setAdminData] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [signature, setSignature] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedLog, setSubmittedLog] = useState<any>(null);
  
  // Modal states
  const [showSafetyInfo, setShowSafetyInfo] = useState(true);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!purposeId || !adminId) return;
    
    const cleanAdminId = adminId.trim();
    const cleanPurposeId = purposeId.trim();
    
    setLoading(true);
    setError(null);
    
    // 1. Fetch Admin Data once
    const fetchAdmin = async () => {
      try {
        const adminDoc = await getDoc(doc(db, 'users', cleanAdminId));
        if (adminDoc.exists()) {
          setAdminData(adminDoc.data() as AdminUser);
        }
      } catch (err: any) {
        console.error('Error fetching admin:', err);
      }
    };
    
    fetchAdmin();

    // 2. Use onSnapshot for purpose to be more resilient on mobile
    const docRef = doc(db, 'purposes', cleanPurposeId);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.data() as VisitPurpose;
          // Verify this purpose belongs to the admin in the URL
          if (data.ownerId === cleanAdminId) {
            setPurpose({ id: snapshot.id, ...data });
          } else {
            console.warn('Purpose owner mismatch:', data.ownerId, 'expected:', cleanAdminId);
            setError('권한이 없는 접근입니다.');
          }
        } else {
          console.warn('Purpose not found:', cleanPurposeId);
          setError('해당 허가서 양식을 찾을 수 없습니다.');
        }
      } catch (err: any) {
        console.error('Data parsing error:', err);
        setError('데이터를 처리하는 중 오류가 발생했습니다: ' + err.message);
      }
      setLoading(false);
    }, (err) => {
      console.error('Firestore purpose snapshot error:', err);
      setError('서버와 연결할 수 없습니다. 네트워크 상태를 확인해 주세요. (' + err.message + ')');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [purposeId, adminId, navigate]);

  const safetyInfo = purpose?.showSafetyInfo ? {
    hazards: purpose.safetyHazards || [],
    precautions: purpose.safetyPrecautions || [],
  } : null;

  const handleFieldChange = (id: string, value: any) => {
    setFormData(prev => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!purpose) return false;

    purpose.fields.forEach(field => {
      if (field.required && !formData[field.id]) {
        newErrors[field.id] = '필수 입력 항목입니다.';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setShowPrivacyModal(true);
  };

  const handlePrivacyAgree = () => {
    setShowPrivacyModal(false);
    if (purpose?.notificationEnabled) {
      const hasContent = 
        (purpose.notificationType === 'text' && purpose.notificationText) ||
        (purpose.notificationType === 'image' && purpose.notificationImage) ||
        (purpose.notificationType === 'both' && (purpose.notificationText || purpose.notificationImage));
      
      if (hasContent) {
        setShowNotificationModal(true);
      } else {
        setShowSignatureModal(true);
      }
    } else {
      setShowSignatureModal(true);
    }
  };

  const handleFinalSubmit = async (signatureData: string) => {
    if (!purpose || !adminId) return;
    setSignature(signatureData);
    setSubmitting(true);
    
    try {
      const timestamp = new Date().getTime();
      
      // 1. Upload signature to storage
      const signatureUrl = await uploadBase64(`logs/${adminId}/${timestamp}_signature.png`, signatureData);
      
      // 2. Upload any files in formData to storage
      const updatedFormData = { ...formData };
      for (const field of purpose.fields) {
        if (field.type === 'file' && formData[field.id] && formData[field.id].startsWith('data:')) {
          const fileUrl = await uploadBase64(`logs/${adminId}/${timestamp}_${field.id}.jpg`, formData[field.id]);
          updatedFormData[field.id] = fileUrl;
        }
      }

      // Extract common fields for indexing
      const visitorNameField = purpose.fields.find(f => f.id === 'name' || f.label.includes('성함') || f.label.includes('방문자명') || f.label.includes('이름'));
      const visitorContactField = purpose.fields.find(f => f.id === 'contact' || f.label.includes('연락처') || f.label.includes('전화번호') || f.label.includes('휴대폰'));

      const logData = {
        purposeId: purpose.id,
        purposeName: purpose.name,
        visitorName: visitorNameField ? updatedFormData[visitorNameField.id] : (updatedFormData['name'] || 'Unknown'),
        visitorContact: visitorContactField ? updatedFormData[visitorContactField.id] : (updatedFormData['contact'] || 'Unknown'),
        data: updatedFormData,
        signature: signatureUrl,
        ownerId: adminId,
        visitDate: new Date(),
        createdAt: serverTimestamp(),
        safetyInfoSnapshot: purpose.showSafetyInfo ? {
          hazards: purpose.safetyHazards || [],
          precautions: purpose.safetyPrecautions || [],
        } : null,
      };

      await addDoc(collection(db, 'logs'), {
        ...logData,
        visitDate: serverTimestamp(),
      });
      
      setSubmittedLog(logData);
      setSubmitted(true);
      setShowSignatureModal(false);
    } catch (error) {
      console.error('Error submitting log:', error);
      alert('제출 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadImage = async () => {
    const element = document.getElementById('submission-summary');
    if (!element) return;
    
    try {
      // modern-screenshot can sometimes fail with oklch colors in Tailwind v4.
      // We'll temporarily apply a class that forces RGB colors or use a simpler capture method.
      const dataUrl = await domToPng(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        quality: 1,
        // This filter can help skip problematic elements if needed
        filter: (node) => {
          if (node instanceof HTMLElement && node.classList.contains('animate-spin')) return false;
          return true;
        },
      });
      
      const link = document.createElement('a');
      link.download = `visit-log-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error: any) {
      console.error('Detailed Error generating image:', error);
      
      // Fallback: If modern-screenshot fails due to oklch, try to provide a more helpful message
      // and perhaps a simpler alternative if available.
      if (error.message?.includes('oklch')) {
        alert('현재 브라우저에서 최신 색상 형식을 지원하지 않아 이미지 생성에 실패했습니다. 화면을 캡처(스크린샷)하여 보관해 주세요.');
      } else {
        alert(`이미지 생성 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
      }
    }
  };

  const handleDownloadNotificationImage = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `notification-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">접속 오류</h1>
        <p className="text-gray-500 mb-8 whitespace-pre-wrap">{error}</p>
        <Button className="w-full max-w-xs" onClick={() => navigate(`/s/${adminId}`)}>
          돌아가기
        </Button>
      </div>
    );
  }

  if (submitted && submittedLog) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md space-y-6"
        >
          <div id="submission-summary" className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
            <div className="text-center mb-8">
              {adminData?.brandingType === 'banner' && adminData?.brandingLogo ? (
                <div className="w-full h-32 rounded-2xl overflow-hidden mb-6 shadow-inner relative">
                  {adminData.brandingBannerCrop ? (
                    <div 
                      className="absolute inset-0 bg-cover bg-no-repeat"
                      style={{ 
                        backgroundImage: `url(${adminData.brandingLogo})`,
                        backgroundPosition: `${adminData.brandingBannerCrop.width === 100 ? 0 : (adminData.brandingBannerCrop.x / (100 - adminData.brandingBannerCrop.width)) * 100}% ${adminData.brandingBannerCrop.height === 100 ? 0 : (adminData.brandingBannerCrop.y / (100 - adminData.brandingBannerCrop.height)) * 100}%`,
                        backgroundSize: `${10000 / adminData.brandingBannerCrop.width}% ${10000 / adminData.brandingBannerCrop.height}%`
                      }}
                    />
                  ) : (
                    <img 
                      src={adminData.brandingLogo} 
                      alt="Banner" 
                      className="w-full h-full object-cover" 
                      style={{ objectPosition: `center ${adminData.brandingBannerPosition ?? 50}%` }}
                      crossOrigin="anonymous"
                    />
                  )}
                </div>
              ) : (
                <div 
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-6 overflow-hidden" 
                  style={{ backgroundColor: adminData?.brandingColor || '#2563eb' }}
                >
                  {adminData?.brandingLogo ? (
                    <img 
                      src={adminData.brandingLogo} 
                      alt="Logo" 
                      className="w-full h-full object-contain p-2"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <ClipboardList className="w-8 h-8 text-white" />
                  )}
                </div>
              )}
              <h2 className="text-2xl font-bold" style={{ color: '#111827' }}>{adminData?.brandingTitle || '안전작업 허가서'}</h2>
              <p className="text-sm font-medium mt-1" style={{ color: '#16a34a' }}>허가서가 성공적으로 접수되었습니다.</p>
            </div>

            <div className="space-y-4 border-t pt-6" style={{ borderTopColor: '#f3f4f6' }}>
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9fafb' }}>
                <p className="text-xs uppercase font-bold tracking-wider mb-1" style={{ color: '#9ca3af' }}>소속 (업체명)</p>
                <p className="text-lg font-bold" style={{ color: '#111827' }}>{submittedLog.data.worker_company || submittedLog.data.company || '-'}</p>
              </div>

              <div className="p-4 rounded-xl" style={{ backgroundColor: '#f9fafb' }}>
                <p className="text-xs uppercase font-bold tracking-wider mb-1" style={{ color: '#9ca3af' }}>작업 종류</p>
                <p className="text-lg font-bold" style={{ color: '#111827' }}>{submittedLog.purposeName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 px-2">
                <div>
                  <p className="text-xs" style={{ color: '#9ca3af' }}>작업자</p>
                  <p className="font-bold" style={{ color: '#111827' }}>{submittedLog.visitorName}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: '#9ca3af' }}>연락처</p>
                  <p className="font-bold" style={{ color: '#111827' }}>{submittedLog.visitorContact}</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {purpose?.fields.map(field => {
                  const skipKeys = ['name', 'contact', 'worker_name', 'worker_contact', 'company', 'worker_company'];
                  if (skipKeys.some(sk => field.id.toLowerCase().includes(sk.toLowerCase())) || (field.type as string) === 'file' || (field.type as string) === 'signature') return null;
                  const value = submittedLog.data[field.id];
                  if (!value) return null;
                  return (
                    <div key={field.id} className="border-b pb-2 px-2" style={{ borderBottomColor: '#f9fafb' }}>
                      <p className="text-xs" style={{ color: '#9ca3af' }}>{field.label}</p>
                      <p className="text-sm font-medium" style={{ color: '#111827' }}>{Array.isArray(value) ? value.join(', ') : value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4">
                <p className="text-xs mb-2" style={{ color: '#9ca3af' }}>전자서명</p>
                <div className="border rounded-xl p-2" style={{ borderColor: '#f3f4f6', backgroundColor: '#f9fafb' }}>
                  <img 
                    src={submittedLog.signature} 
                    alt="Signature" 
                    className="h-20 mx-auto object-contain" 
                    crossOrigin="anonymous"
                  />
                </div>
              </div>
              
              <p className="text-[10px] text-center pt-4 italic" style={{ color: '#d1d5db' }}>
                제출 일시: {new Date().toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button className="w-full h-12 gap-2" onClick={handleDownloadImage}>
              <Download className="w-4 h-4" /> 이미지로 저장하기
            </Button>
            <Button variant="outline" className="w-full h-12" onClick={() => navigate(`/s/${adminId}`)}>
              처음으로 돌아가기
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => navigate(`/s/${adminId}`)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center gap-3 truncate">
            <div 
              className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: adminData?.brandingType === 'banner' ? 'transparent' : (adminData?.brandingColor || '#2563eb') }}
            >
              {adminData?.brandingLogo ? (
                <img src={adminData.brandingLogo} alt="Logo" className={cn("w-full h-full", adminData.brandingType === 'banner' ? "object-cover" : "object-contain p-1")} crossOrigin="anonymous" />
              ) : (
                <ClipboardList className="w-4 h-4 text-white" />
              )}
            </div>
            <h1 className="font-bold text-gray-900 truncate">{adminData?.brandingTitle || '디지털 방문일지'}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-6">
        {!purpose ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-500 text-sm">정보를 불러오는 중입니다...<br/>잠시만 기다려 주세요.</p>
          </div>
        ) : (
          <form onSubmit={handleInitialSubmit} className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-blue-600 rounded-full" />
                허가서 정보 입력
              </h2>
              
              <DynamicForm
                fields={purpose.fields}
                values={formData}
                onChange={handleFieldChange}
                errors={errors}
              />
            </Card>

            <Button
              type="submit"
              className="w-full h-14 text-lg font-bold shadow-lg"
            >
              작업 허가서 제출하기
            </Button>
          </form>
        )}
      </main>

      {/* Safety Info Modal */}
      <AnimatePresence>
        {showSafetyInfo && safetyInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 bg-red-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{purpose?.name}</h2>
                  <p className="text-xs text-red-600 font-bold">작업 전 위험요인 및 주의사항 숙지</p>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-8">
                <section className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    주요 위험요인
                  </h3>
                  <ul className="space-y-2">
                    {safetyInfo.hazards.map((hazard, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                        {hazard}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    안전 주의사항
                  </h3>
                  <ul className="space-y-2">
                    {safetyInfo.precautions.map((precaution, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                        {precaution}
                      </li>
                    ))}
                  </ul>
                </section>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-xs text-gray-500 text-center leading-relaxed">
                    본 작업의 위험요인을 충분히 숙지하였으며,<br />
                    안전 주의사항을 준수하여 작업할 것을 서약합니다.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100">
                <Button 
                  className="w-full h-14 text-lg font-bold shadow-lg bg-red-600 hover:bg-red-700" 
                  onClick={() => setShowSafetyInfo(false)}
                >
                  위험요인 숙지 완료
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Privacy Modal */}
      <AnimatePresence>
        {showPrivacyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">개인정보 수집 및 이용 동의</h2>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto text-sm text-gray-600 space-y-4">
                <p>안전작업 허가서 시스템은 원활한 작업 안전 관리를 위해 아래와 같이 개인정보를 수집합니다.</p>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p><strong>1. 수집 항목:</strong> 성함, 연락처, 소속, 작업 종류 등 작성 항목 일체</p>
                  <p><strong>2. 수집 목적:</strong> 현장 안전 관리, 작업자 확인, 비상 시 연락</p>
                  <p><strong>3. 보유 기간:</strong> 수집일로부터 1년 또는 현장 규정 완료 시까지 (이후 복구 불가능한 방법으로 파기)</p>
                </div>
                <p>귀하는 동의를 거부할 권리가 있으나, 거부 시 작업 진행이 제한될 수 있습니다.</p>
              </div>
              <div className="p-6 bg-gray-50 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowPrivacyModal(false)}>취소</Button>
                <Button className="flex-1" onClick={handlePrivacyAgree}>동의 및 계속</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification Modal */}
      <AnimatePresence>
        {showNotificationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">안전관리자 공지사항</h2>
              </div>
              <div 
                className="p-6 space-y-4"
              >
                <div className="flex items-center gap-2 text-blue-600">
                  <p className="text-sm font-medium">안전관리자의 안내 사항이 있습니다. 내용을 확인해 주세요.</p>
                </div>

                {purpose?.notificationText && (purpose.notificationType === 'text' || purpose.notificationType === 'both') && (
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {purpose.notificationText}
                  </div>
                )}

                {purpose?.notificationImage && (purpose.notificationType === 'image' || purpose.notificationType === 'both') && (
                  <div className="space-y-2">
                    <div 
                      className="rounded-xl overflow-hidden border border-gray-100 shadow-inner cursor-pointer active:opacity-80 transition-opacity"
                      onClick={() => handleDownloadNotificationImage(purpose.notificationImage!)}
                      title="클릭하여 이미지 다운로드"
                    >
                      <img 
                        src={purpose.notificationImage} 
                        alt="Safety Notification" 
                        className="w-full h-auto"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 text-center">이미지를 클릭하면 기기에 저장됩니다.</p>
                  </div>
                )}
              </div>
              <div className="p-6 bg-gray-50">
                <Button className="w-full h-12" onClick={() => { setShowNotificationModal(false); setShowSignatureModal(true); }}>
                  확인했습니다
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Signature Modal */}
      <AnimatePresence>
        {showSignatureModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">전자서명</h2>
                <p className="text-sm text-gray-500 mt-1">본인 확인을 위해 서명해 주세요.</p>
              </div>
              <div className="p-6">
                <SignaturePad
                  onSave={(data) => setSignature(data)}
                  onClear={() => setSignature('')}
                />
              </div>
              <div className="p-6 bg-gray-50 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowSignatureModal(false)}>이전</Button>
                <Button 
                  className="flex-1" 
                  onClick={() => handleFinalSubmit(signature)}
                  disabled={!signature || submitting}
                  isLoading={submitting}
                >
                  작성 완료
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
