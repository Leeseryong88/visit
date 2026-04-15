import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { VisitPurpose, AdminUser } from '../types';
import { Card, Button } from '../components/ui/Button';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { ClipboardList, ChevronRight, Loader2, Search, Calendar, User, Phone, X, Download, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export const VisitorHome: React.FC = () => {
  const { adminId } = useParams<{ adminId: string }>();
  const [purposes, setPurposes] = useState<VisitPurpose[]>([]);
  const [adminData, setAdminData] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [checkData, setCheckData] = useState({ date: format(new Date(), 'yyyy-MM-dd'), name: '', contact: '' });
  const [foundLog, setFoundLog] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!adminId) {
      setError('올바르지 않은 접근입니다. QR코드를 다시 확인해 주세요.');
      setLoading(false);
      return;
    }

    const cleanAdminId = adminId.trim();
    console.log('Fetching data for admin:', cleanAdminId);

    setLoading(true);
    setError(null);

    // 1. Fetch Admin Data (one-time is fine)
    const fetchAdmin = async () => {
      try {
        const adminDoc = await getDoc(doc(db, 'users', cleanAdminId));
        if (adminDoc.exists()) {
          setAdminData(adminDoc.data() as AdminUser);
        } else {
          console.error('Admin not found in Firestore:', cleanAdminId);
          setError('등록되지 않은 관리자 계정입니다.');
        }
      } catch (err) {
        console.error('Error fetching admin:', err);
      }
    };

    fetchAdmin();

    // 2. Use onSnapshot for purposes - more reliable on mobile/flaky networks
    const q = query(
      collection(db, 'purposes'),
      where('ownerId', '==', cleanAdminId),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitPurpose));
      
      // Sort in memory
      const sortedData = data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      
      setPurposes(sortedData);
      setLoading(false);
    }, (err) => {
      console.error('Firestore purposes snapshot error:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [adminId]);

  const handleNavigateToForm = (purposeId: string) => {
    const cleanAdminId = adminId?.trim();
    if (cleanAdminId) {
      navigate(`/s/${cleanAdminId}/visit/${purposeId}`);
    }
  };

  const handleCheckLog = async () => {
    if (!adminId || !checkData.name || !checkData.contact || !checkData.date) return;
    
    const cleanAdminId = adminId.trim();
    const cleanName = checkData.name.trim();
    const cleanContact = checkData.contact.trim();

    setChecking(true);
    setCheckError(null);
    setFoundLog(null);

    try {
      const startOfDay = new Date(checkData.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(checkData.date);
      endOfDay.setHours(23, 59, 59, 999);

      // We need to query by ownerId, name, and contact. 
      const q = query(
        collection(db, 'logs'),
        where('ownerId', '==', cleanAdminId),
        where('visitorName', '==', cleanName),
        where('visitorContact', '==', cleanContact)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setCheckError('일치하는 방문 기록을 찾을 수 없습니다.');
      } else {
        // Filter by date in memory to avoid index requirement for now
        const logs = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(log => {
            const logDate = log.visitDate?.toDate?.() || (log.visitDate instanceof Date ? log.visitDate : null);
            if (!logDate) return false;
            return logDate >= startOfDay && logDate <= endOfDay;
          })
          .sort((a, b) => {
            const timeA = a.visitDate?.toMillis?.() || 0;
            const timeB = b.visitDate?.toMillis?.() || 0;
            return timeB - timeA;
          });

        if (logs.length === 0) {
          setCheckError('해당 날짜의 방문 기록이 없습니다.');
        } else {
          setFoundLog(logs[0]);
        }
      }
    } catch (error: any) {
      console.error('Error checking log:', error);
      // Provide more specific error for debugging
      if (error.code === 'permission-denied') {
        setCheckError('접근 권한이 없습니다. 시스템 설정을 확인 중입니다.');
      } else {
        setCheckError('조회 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
      }
    } finally {
      setChecking(false);
    }
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
        <Button className="w-full max-w-xs" onClick={() => window.location.reload()}>
          다시 시도하기
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center relative">
      {adminData?.brandingType === 'banner' && adminData?.brandingLogo ? (
        <div className="w-full h-48 md:h-64 flex-shrink-0 relative overflow-hidden shadow-md">
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
              className="w-full h-full object-cover" 
              style={{ objectPosition: `center ${adminData.brandingBannerPosition ?? 50}%` }}
              alt="Banner" 
              crossOrigin="anonymous"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>
      ) : null}

      <header className={cn(
        "w-full max-w-md text-center mb-10",
        adminData?.brandingType === 'banner' ? "mt-8 px-6" : "mt-12 px-6"
      )}>
        {(!adminData?.brandingType || adminData.brandingType === 'icon') && (
          <div 
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl shadow-xl mb-6 overflow-hidden transition-colors"
            style={{ backgroundColor: adminData?.brandingColor || '#2563eb' }}
          >
            {adminData?.brandingLogo ? (
              <img src={adminData.brandingLogo} alt="Logo" className="w-full h-full object-contain p-3" crossOrigin="anonymous" />
            ) : (
              <ClipboardList className="w-10 h-10 text-white" />
            )}
          </div>
        )}
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{adminData?.brandingTitle || '디지털 방문일지'}</h1>
        <p className="text-gray-500 mt-3 font-medium">방문 목적을 선택해 주세요.</p>
        <p className="text-[10px] text-gray-300 mt-2 tracking-widest">v1.1.0</p>
      </header>

      <main className="w-full max-w-md px-6 space-y-4">
        {purposes.length === 0 ? (
          <Card className="p-10 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
              <ClipboardList className="w-8 h-8 text-gray-300" />
            </div>
            <div>
              <p className="text-gray-600 font-bold">등록된 방문 목적이 없습니다.</p>
              <p className="text-xs text-gray-400 mt-2">관리자 ID: {adminId}</p>
              <p className="text-sm text-gray-400 mt-2">관리자가 아직 서식을 생성하지 않았거나<br />일시적인 오류일 수 있습니다.</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              새로고침
            </Button>
          </Card>
        ) : (
          purposes.map((purpose, index) => (
            <motion.div
              key={purpose.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                onClick={() => handleNavigateToForm(purpose.id)}
                className="w-full text-left group"
              >
                <Card className="p-5 flex items-center justify-between hover:border-blue-500 hover:shadow-md transition-all active:scale-[0.98]">
                  <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {purpose.name}
                    </h3>
                    {purpose.description && (
                      <p className="text-sm text-gray-500 mt-1">{purpose.description}</p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                </Card>
              </button>
            </motion.div>
          ))
        )}

        <div className="pt-6">
          <Button 
            variant="outline" 
            className="w-full h-12 gap-2 border-dashed border-gray-300 text-gray-500 hover:text-blue-600 hover:border-blue-300"
            onClick={() => setShowCheckModal(true)}
          >
            <Search className="w-4 h-4" /> 작성한 방문일지 확인하기
          </Button>
        </div>
      </main>

      {/* Check Log Modal */}
      <AnimatePresence>
        {showCheckModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">방문 기록 확인</h2>
                <button onClick={() => { setShowCheckModal(false); setFoundLog(null); setCheckError(null); }} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                {!foundLog ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" /> 방문 일자
                      </label>
                      <input 
                        type="date" 
                        className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm"
                        value={checkData.date}
                        onChange={(e) => setCheckData({ ...checkData, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" /> 방문자명
                      </label>
                      <input 
                        type="text" 
                        placeholder="이름을 입력하세요"
                        className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm"
                        value={checkData.name}
                        onChange={(e) => setCheckData({ ...checkData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" /> 연락처
                      </label>
                      <input 
                        type="tel" 
                        placeholder="연락처를 입력하세요"
                        className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm"
                        value={checkData.contact}
                        onChange={(e) => setCheckData({ ...checkData, contact: e.target.value })}
                      />
                    </div>
                    {checkError && <p className="text-xs text-red-500">{checkError}</p>}
                    <Button className="w-full h-12 mt-2" onClick={handleCheckLog} isLoading={checking}>
                      조회하기
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">방문 정보 확인됨</p>
                      <h3 className="text-lg font-bold text-gray-900">{foundLog.visitorName}님</h3>
                      <p className="text-sm text-gray-600">{foundLog.purposeName} • {format(foundLog.visitDate.toDate(), 'yyyy.MM.dd HH:mm', { locale: ko })}</p>
                    </div>

                    <div className="space-y-4">
                      {Object.entries(foundLog.data).map(([key, value]: [string, any]) => {
                        const field = purposes.find(p => p.id === foundLog.purposeId)?.fields.find(f => f.id === key);
                        if (!field || (field.type as string) === 'file' || (field.type as string) === 'signature') return null;
                        return (
                          <div key={key} className="border-b border-gray-50 pb-2">
                            <p className="text-xs text-gray-400">{field.label}</p>
                            <p className="text-sm font-medium text-gray-900">{Array.isArray(value) ? value.join(', ') : value}</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-2">전자서명</p>
                      <img src={foundLog.signature} alt="Signature" className="h-20 object-contain border border-gray-100 rounded-lg" />
                    </div>

                    <Button variant="outline" className="w-full" onClick={() => setFoundLog(null)}>
                      다른 기록 조회하기
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="mt-auto pt-10 pb-6 text-center space-y-2">
        <div>
          <Link to="/admin/login" className="text-xs text-gray-400 hover:text-blue-600 hover:underline transition-colors">
            관리자 로그인
          </Link>
        </div>
      </footer>
    </div>
  );
};
