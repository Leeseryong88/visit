import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, where, Timestamp, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { VisitorLog } from '../types';
import { Card, Button, Input, Label } from '../components/ui/Button';
import { Search, Filter, Download, Eye, X, Loader2, Calendar, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const AdminLogs: React.FC = () => {
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<VisitorLog | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Date filter states
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

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

  const filteredLogs = logs.filter(log => 
    log.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.purposeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.visitorContact.includes(searchTerm)
  );

  const exportToCSV = () => {
    if (logs.length === 0) return;
    
    const headers = ['방문일시', '방문목적', '방문자명', '연락처', '상세데이터'];
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
    link.setAttribute('download', `visitor_logs_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">방문 기록 조회</h1>
          <p className="text-sm text-gray-500">제출된 모든 방문일지 기록을 확인합니다.</p>
        </div>
        <Button variant="outline" className="gap-2 h-11 md:h-auto w-full md:w-auto" onClick={exportToCSV}>
          <Download className="w-4 h-4" /> 엑셀 다운로드
        </Button>
      </div>

      <Card className="p-3 md:p-4">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="방문자명, 목적, 연락처로 검색..."
              className="pl-10 h-11 md:h-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">방문 일시</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">방문 목적</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">방문자명</th>
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
                      <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
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
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mt-1">
                    <Eye className="w-4 h-4 text-gray-400" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4 pb-10 md:pb-0">
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
                <h2 className="text-lg md:text-xl font-bold text-gray-900">방문 기록 상세</h2>
                <Button variant="ghost" size="icon" onClick={() => setSelectedLog(null)}>
                  <X className="w-5 h-5 text-gray-400" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8">
                <div className="grid grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase mb-1">방문자명</p>
                    <p className="text-base md:text-lg font-bold text-gray-900">{selectedLog.visitorName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase mb-1">연락처</p>
                    <p className="text-base md:text-lg font-bold text-gray-900">{selectedLog.visitorContact}</p>
                  </div>
                  <div>
                    <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase mb-1">방문 목적</p>
                    <p className="text-sm md:text-base text-gray-900">{selectedLog.purposeName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase mb-1">방문 일시</p>
                    <p className="text-sm md:text-base text-gray-900">
                      {selectedLog.visitDate?.toDate ? format(selectedLog.visitDate.toDate(), 'yyyy-MM-dd HH:mm') : '-'}
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase mb-4">입력 데이터</p>
                  <div className="space-y-3">
                    {Object.entries(selectedLog.data).map(([key, value]) => (
                      <div key={key} className="flex flex-col space-y-1 py-2 border-b border-gray-50 last:border-0">
                        <span className="text-[10px] md:text-xs text-gray-500 font-bold">{key}</span>
                        <div className="text-sm md:text-base font-medium text-gray-900">
                          {typeof value === 'string' && value.startsWith('http') && (value.includes('firebasestorage') || value.startsWith('data:image/')) ? (
                            <img 
                              src={value} 
                              alt={key} 
                              className="h-32 w-32 object-cover rounded-lg border border-gray-200 mt-1 cursor-zoom-in"
                              onClick={() => window.open(value, '_blank')}
                              crossOrigin="anonymous"
                            />
                          ) : Array.isArray(value) ? (
                            value.join(', ')
                          ) : (
                            String(value)
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase mb-4">전자서명</p>
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 flex justify-center">
                    <img src={selectedLog.signature} alt="Signature" className="max-h-32 object-contain" crossOrigin="anonymous" />
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-6 border-t border-gray-100 bg-gray-50 sticky bottom-0 z-10">
                <Button className="w-full h-12 md:h-10" variant="outline" onClick={() => setSelectedLog(null)}>
                  닫기
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
