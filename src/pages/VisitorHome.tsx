import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { VisitPurpose } from '../types';
import { Card, Button } from '../components/ui/Button';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { ClipboardList, ChevronRight, Loader2, Search, Calendar, User, Phone, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export const VisitorHome: React.FC = () => {
  const { adminId } = useParams<{ adminId: string }>();
  const [purposes, setPurposes] = useState<VisitPurpose[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [checkData, setCheckData] = useState({ date: format(new Date(), 'yyyy-MM-dd'), name: '', contact: '' });
  const [foundLog, setFoundLog] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchPurposes = async () => {
      if (!adminId) return;
      try {
        const q = query(
          collection(db, 'purposes'),
          where('ownerId', '==', adminId),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitPurpose));
        setPurposes(data);
      } catch (error) {
        console.error('Error fetching purposes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPurposes();
  }, [adminId]);

  const handleCheckLog = async () => {
    if (!adminId || !checkData.name || !checkData.contact || !checkData.date) return;
    setChecking(true);
    setCheckError(null);
    setFoundLog(null);

    try {
      const startOfDay = new Date(checkData.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(checkData.date);
      endOfDay.setHours(23, 59, 59, 999);

      // We need to query by ownerId, name, and contact. 
      // Firestore doesn't support range filters on one field and equality on others without composite indexes.
      // But here we have equality on ownerId, name, contact and range on visitDate.
      // This requires a composite index. To avoid index issues for now, let's fetch by name/contact and filter date in memory if needed,
      // OR ensure the query is correct.
      const q = query(
        collection(db, 'logs'),
        where('ownerId', '==', adminId),
        where('visitorName', '==', checkData.name),
        where('visitorContact', '==', checkData.contact)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setCheckError('일치하는 방문 기록을 찾을 수 없습니다.');
      } else {
        // Filter by date in memory to avoid index requirement for now
        const logs = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(log => {
            const logDate = log.visitDate?.toDate();
            return logDate >= startOfDay && logDate <= endOfDay;
          })
          .sort((a, b) => b.visitDate.toMillis() - a.visitDate.toMillis());

        if (logs.length === 0) {
          setCheckError('해당 날짜의 방문 기록이 없습니다.');
        } else {
          setFoundLog(logs[0]);
        }
      }
    } catch (error) {
      console.error('Error checking log:', error);
      setCheckError('조회 중 오류가 발생했습니다.');
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6 relative">
      <header className="w-full max-w-md text-center mb-10 mt-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
          <ClipboardList className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">디지털 방문일지</h1>
        <p className="text-gray-500 mt-2">방문 목적을 선택해 주세요.</p>
      </header>

      <main className="w-full max-w-md space-y-4">
        {purposes.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">등록된 방문 목적이 없습니다.</p>
            <p className="text-sm text-gray-400 mt-1">관리자에게 문의해 주세요.</p>
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
                onClick={() => navigate(`/s/${adminId}/visit/${purpose.id}`)}
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
