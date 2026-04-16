import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, where, Timestamp, limit, startAfter, QueryDocumentSnapshot, DocumentData, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { VisitorLog, VisitPurpose } from '../types';
import { Card, Button, Label } from '../components/ui/Button';
import { SignaturePad } from '../components/SignaturePad';
import { uploadBase64 } from '../lib/storage';
import { Filter, Download, Eye, X, Loader2, Calendar, ChevronDown, PenTool, Save, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const AdminLogs: React.FC = () => {
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [purposes, setPurposes] = useState<VisitPurpose[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPurposeId, setSelectedPurposeId] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<VisitorLog | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [adminSignData, setAdminSignData] = useState<string>('');
  const [savingSign, setSavingSign] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Date filter states
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    fetchPurposes();
    fetchLogs();
  }, []);

  const fetchPurposes = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const q = query(collection(db, 'purposes'), where('ownerId', '==', user.uid));
      const snapshot = await getDocs(q);
      setPurposes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitPurpose)));
    } catch (error) {
      console.error('Error fetching purposes:', error);
    }
  };

  const PAGE_SIZE = 50;

  const fetchLogs = async (sDate = startDate, eDate = endDate, isMore = false) => {
    const user = auth.currentUser;
    if (!user) return;

    if (isMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setLastDoc(null);
    }

    try {
      const start = new Date(sDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(eDate);
      end.setHours(23, 59, 59, 999);

      let q = query(
        collection(db, 'logs'),
        where('ownerId', '==', user.uid),
        where('visitDate', '>=', Timestamp.fromDate(start)),
        where('visitDate', '<=', Timestamp.fromDate(end)),
        orderBy('visitDate', 'desc'),
        limit(PAGE_SIZE)
      );

      if (isMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitorLog));
      
      if (isMore) {
        setLogs(prev => [...prev, ...newLogs]);
      } else {
        setLogs(newLogs);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleApplyFilter = () => {
    fetchLogs();
    setIsFilterOpen(false);
  };

  const handleResetFilter = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setStartDate(today);
    setEndDate(today);
    fetchLogs(today, today);
    setIsFilterOpen(false);
  };

  const handleAdminSign = async () => {
    if (!selectedLog || !adminSignData || !auth.currentUser) return;
    setSavingSign(true);
    try {
      const signatureUrl = await uploadBase64(
        `logs/${auth.currentUser.uid}/admin_sign_${selectedLog.id}_${Date.now()}.png`,
        adminSignData
      );

      await updateDoc(doc(db, 'logs', selectedLog.id), {
        adminSignature: signatureUrl,
        adminSignedAt: serverTimestamp()
      });

      // Update local state
      setLogs(prev => prev.map(l => 
        l.id === selectedLog.id 
          ? { ...l, adminSignature: signatureUrl, adminSignedAt: new Date() } 
          : l
      ));
      setSelectedLog(prev => prev ? { ...prev, adminSignature: signatureUrl, adminSignedAt: new Date() } : null);
      setShowSignModal(false);
      setAdminSignData('');
      alert('서명이 완료되었습니다.');
    } catch (error) {
      console.error('Error saving admin signature:', error);
      alert('서명 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingSign(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    selectedPurposeId === 'all' || log.purposeId === selectedPurposeId
  );

  const exportToCSV = () => {
    if (logs.length === 0) return;
    
    const headers = ['제출일시', '작업종류', '작업자명', '연락처', '상세데이터'];
    const rows = logs.map(log => [
      log.visitDate?.toDate ? format(log.visitDate.toDate(), 'yyyy-MM-dd HH:mm') : '',
      log.purposeName,
      log.visitorName,
      log.visitorContact,
      JSON.stringify(log.data).replace(/"/g, '""')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `safety_permit_logs_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 print:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">허가서 제출 내역</h1>
          <p className="text-sm text-gray-500">제출된 모든 안전작업 허가서 기록을 확인합니다.</p>
        </div>
        <Button variant="outline" className="gap-2 h-11 md:h-auto w-full md:w-auto" onClick={exportToCSV}>
          <Download className="w-4 h-4" /> 엑셀 다운로드
        </Button>
      </div>

      <Card className="p-3 md:p-4 print:hidden">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          <div className="relative flex-1">
            <div className="flex items-center w-full h-11 md:h-10 bg-white border border-gray-300 rounded-md px-3 gap-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
              <ClipboardList className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select
                className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-gray-700 cursor-pointer h-full"
                value={selectedPurposeId}
                onChange={(e) => setSelectedPurposeId(e.target.value)}
              >
                <option value="all">모든 작업 허가서</option>
                {purposes.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <Button 
            variant="outline" 
            className={cn(
              "gap-2 w-full md:min-w-[200px] justify-start font-normal h-11 md:h-10",
              isFilterOpen && "border-blue-500 ring-1 ring-blue-500"
            )}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="flex-1 text-left truncate">
              {startDate === endDate ? startDate : `${startDate} ~ ${endDate}`}
            </span>
          </Button>
        </div>

        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-gray-100 flex flex-col md:flex-row items-end gap-4">
                <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">시작일</Label>
                    <Input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-gray-400">종료일</Label>
                    <Input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <Button variant="ghost" onClick={handleResetFilter} className="flex-1 md:flex-none">초기화</Button>
                  <Button onClick={handleApplyFilter} className="flex-1 md:flex-none gap-2">
                    <Filter className="w-4 h-4" /> 필터 적용
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">제출 일시</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">작업 종류</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">작업자명</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">연락처</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-500">
                    기록이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.visitDate?.toDate ? format(log.visitDate.toDate(), 'yyyy-MM-dd HH:mm', { locale: ko }) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {log.purposeName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{log.visitorName}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{log.visitorContact}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {log.adminSignature ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-100">
                            허가
                          </span>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-2 text-[10px] gap-1 bg-blue-50 text-blue-700 border-blue-100"
                            onClick={() => {
                              setSelectedLog(log);
                              setShowSignModal(true);
                            }}
                          >
                            <PenTool className="w-3 h-3" /> 서명
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 print:hidden">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
            기록이 없습니다.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <Card key={log.id} className="p-4" onClick={() => setSelectedLog(log)}>
              <div className="flex justify-between items-start mb-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                  {log.purposeName}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {log.visitDate?.toDate ? format(log.visitDate.toDate(), 'HH:mm', { locale: ko }) : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{log.visitorName}</h3>
                  <p className="text-xs text-gray-500 mt-1">{log.visitorContact}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400">
                    {log.visitDate?.toDate ? format(log.visitDate.toDate(), 'MM/dd', { locale: ko }) : '-'}
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    {log.adminSignature ? (
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                        허가
                      </span>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 px-1.5 text-[9px] gap-1 bg-blue-50 text-blue-700 border-blue-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                          setShowSignModal(true);
                        }}
                      >
                        <PenTool className="w-2.5 h-2.5" /> 서명
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="w-4 h-4 text-gray-400" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4 pb-10 md:pb-0 print:hidden">
          <Button 
            variant="outline" 
            onClick={() => fetchLogs(startDate, endDate, true)}
            isLoading={loadingMore}
            className="gap-2 w-full md:w-auto h-11 md:h-10"
          >
            <ChevronDown className="w-4 h-4" /> 더 보기
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white md:rounded-2xl shadow-2xl w-full h-full md:h-auto md:max-w-lg md:max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-lg md:text-xl font-bold text-gray-900">허가서 제출 상세</h2>
                <div className="flex items-center gap-2">
                  {!selectedLog.adminSignature && (
                    <Button variant="outline" size="sm" className="flex gap-2 bg-blue-50 text-blue-700 border-blue-200" onClick={() => setShowSignModal(true)}>
                      <PenTool className="w-4 h-4" /> 서명하기
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="hidden md:flex gap-2" onClick={() => window.print()}>
                    <Download className="w-4 h-4" /> 인쇄/PDF
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedLog(null)}>
                    <X className="w-5 h-5 text-gray-400" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-12 space-y-10 pb-24 md:pb-12 bg-gray-50/30 print:bg-white print:p-0">
                {/* Document Style Container */}
                <div className="bg-white border border-gray-200 shadow-sm rounded-none md:rounded-sm p-6 md:p-12 max-w-[210mm] mx-auto min-h-[297mm] print:border-0 print:shadow-none print:p-0">
                  {/* Document Header */}
                  <div className="text-center space-y-4 mb-12 border-b-4 border-double border-gray-900 pb-8">
                    <h1 className="text-3xl font-black text-gray-900 tracking-[0.2em] underline underline-offset-8">안전작업 허가서</h1>
                    <div className="flex justify-between items-end pt-4">
                      <p className="text-sm font-bold text-gray-500">문서번호: PERMIT-{selectedLog.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                  </div>

                  {/* Basic Info Table */}
                  <section className="mb-10">
                    <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-1 h-4 bg-gray-900" />
                      1. 기본 인적 사항
                    </h3>
                    <div className="grid grid-cols-2 border-t-2 border-gray-900">
                      <div className="border-b border-r border-gray-200 p-3 bg-gray-50/50">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">소속 (업체명)</p>
                        <p className="text-sm font-bold text-gray-900">{selectedLog.data.worker_company || selectedLog.data.company || '-'}</p>
                      </div>
                      <div className="border-b border-gray-200 p-3 bg-gray-50/50">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">작업자 성함</p>
                        <p className="text-sm font-bold text-gray-900">{selectedLog.visitorName}</p>
                      </div>
                      <div className="border-b border-r border-gray-200 p-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">연락처</p>
                        <p className="text-sm font-bold text-gray-900">{selectedLog.visitorContact}</p>
                      </div>
                      <div className="border-b border-gray-200 p-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">작업 종류</p>
                        <p className="text-sm font-bold text-blue-700">{selectedLog.purposeName}</p>
                      </div>
                      <div className="col-span-2 border-b border-gray-200 p-3 bg-gray-50/50">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">제출 일시</p>
                        <p className="text-sm font-bold text-gray-900">
                          {selectedLog.visitDate?.toDate ? format(selectedLog.visitDate.toDate(), 'yyyy-MM-dd HH:mm') : '-'}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Safety Info Section */}
                  {selectedLog.safetyInfoSnapshot && (
                    <section className="mb-10">
                      <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                        <div className="w-1 h-4 bg-gray-900" />
                        2. 위험요인 및 안전 주의사항 (숙지 확인됨)
                      </h3>
                      <div className="border border-gray-200 p-4 rounded-sm space-y-4 bg-gray-50/30">
                        {selectedLog.safetyInfoSnapshot.hazards && selectedLog.safetyInfoSnapshot.hazards.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-red-500 mb-2">● 주요 위험요인</p>
                            <ul className="grid grid-cols-1 gap-1">
                              {selectedLog.safetyInfoSnapshot.hazards.map((h, i) => (
                                <li key={i} className="text-[11px] text-gray-600 flex items-start gap-1">
                                  <span>-</span> {h}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {selectedLog.safetyInfoSnapshot.precautions && selectedLog.safetyInfoSnapshot.precautions.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-blue-500 mb-2">● 안전 주의사항</p>
                            <ul className="grid grid-cols-1 gap-1">
                              {selectedLog.safetyInfoSnapshot.precautions.map((p, i) => (
                                <li key={i} className="text-[11px] text-gray-600 flex items-start gap-1">
                                  <span>-</span> {p}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Dynamic Data Section */}
                  <section className="mb-10">
                    <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-1 h-4 bg-gray-900" />
                      3. 작업 상세 내용 및 체크리스트
                    </h3>
                    <div className="border-t border-gray-200">
                      {Object.entries(selectedLog.data).map(([key, value]) => {
                        const skipKeys = ['name', 'contact', 'worker_name', 'worker_contact', 'visitorName', 'visitorContact'];
                        if (skipKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) return null;
                        return (
                          <div key={key} className="flex border-b border-gray-200 min-h-[40px]">
                            <div className="w-1/3 bg-gray-50/50 p-2 flex items-center border-r border-gray-200">
                              <span className="text-[10px] font-bold text-gray-500">{key}</span>
                            </div>
                            <div className="w-2/3 p-2 flex items-center">
                              <div className="text-xs font-medium text-gray-900">
                                {typeof value === 'string' && value.startsWith('http') && (value.includes('firebasestorage') || value.startsWith('data:image/')) ? (
                                  <img 
                                    src={value} 
                                    alt={key} 
                                    className="h-24 w-auto object-contain rounded-sm border border-gray-100"
                                    crossOrigin="anonymous"
                                  />
                                ) : Array.isArray(value) ? (
                                  <div className="flex flex-wrap gap-1">
                                    {value.map((v, i) => (
                                      <span key={i} className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] border border-gray-200">✓ {v}</span>
                                    ))}
                                  </div>
                                ) : (
                                  String(value)
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Signature Section */}
                  <section className="mt-16 pt-10 border-t-2 border-gray-900">
                    <div className="flex flex-col items-center space-y-6">
                      <p className="text-sm font-bold text-gray-900">위와 같이 안전작업 허가서를 제출하며, 현장 안전 수칙을 준수할 것을 서약합니다.</p>
                      <div className="flex items-center gap-12">
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-gray-400 mb-2">작업자 확인</p>
                          <div className="relative w-32 h-20 border border-gray-100 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
                            <img src={selectedLog.signature} alt="Signature" className="h-full w-full object-contain mix-blend-multiply" crossOrigin="anonymous" />
                            <p className="absolute bottom-1 right-2 text-[8px] text-gray-300">(인)</p>
                          </div>
                          <p className="text-xs font-bold mt-2 text-gray-900">{selectedLog.visitorName}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-gray-400 mb-2">안전관리자 확인</p>
                          <div className="relative w-32 h-20 border border-gray-100 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
                            {selectedLog.adminSignature ? (
                              <>
                                <img src={selectedLog.adminSignature} alt="Admin Signature" className="h-full w-full object-contain mix-blend-multiply" crossOrigin="anonymous" />
                                <p className="absolute bottom-1 right-2 text-[8px] text-gray-300">(인)</p>
                              </>
                            ) : (
                              <span className="text-[10px] text-gray-300 italic">서명 대기</span>
                            )}
                          </div>
                          <p className="text-xs font-bold mt-2 text-gray-400">
                            {selectedLog.adminSignedAt ? format(selectedLog.adminSignedAt.toDate ? selectedLog.adminSignedAt.toDate() : selectedLog.adminSignedAt, 'MM/dd HH:mm') : '(서명)'}
                          </p>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 pt-8">제출일: {format(selectedLog.visitDate.toDate(), 'yyyy년 MM월 dd일 HH시 mm분', { locale: ko })}</p>
                    </div>
                  </section>
                </div>
              </div>

              <div className="p-4 md:p-6 border-t border-gray-100 bg-gray-50 sticky bottom-0 z-10 print:hidden">
                <div className="flex gap-3">
                  <Button className="flex-1 h-12 md:h-10" variant="outline" onClick={() => setSelectedLog(null)}>
                    닫기
                  </Button>
                  <Button className="flex-1 h-12 md:h-10 gap-2" onClick={() => window.print()}>
                    <Download className="w-4 h-4" /> 인쇄/PDF 저장
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Signing Modal */}
      <AnimatePresence>
        {showSignModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">안전관리자 승인 서명</h2>
                <button onClick={() => setShowSignModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <SignaturePad
                  onSave={(data) => setAdminSignData(data)}
                  onClear={() => setAdminSignData('')}
                />
                <p className="text-xs text-gray-400 mt-4 text-center">
                  위 작업의 내용을 확인하였으며, 작업을 승인합니다.
                </p>
              </div>
              <div className="p-6 bg-gray-50 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowSignModal(false)}>취소</Button>
                <Button 
                  className="flex-1 gap-2" 
                  onClick={handleAdminSign}
                  disabled={!adminSignData || savingSign}
                  isLoading={savingSign}
                >
                  <Save className="w-4 h-4" /> 서명 완료
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
