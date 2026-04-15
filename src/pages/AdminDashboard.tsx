import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { VisitorLog } from '../types';
import { Card } from '../components/ui/Button';
import { Users, ClipboardList, Clock, ArrowUpRight, Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    todayCount: 0,
    totalCount: 0,
    purposeCount: 0,
  });
  const [recentLogs, setRecentLogs] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleFirestoreError = (error: unknown, operationType: string, path: string) => {
      const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          emailVerified: auth.currentUser?.emailVerified,
        },
        operationType,
        path
      };
      console.error('Firestore Error: ', JSON.stringify(errInfo));
      throw new Error(JSON.stringify(errInfo));
    };

    const fetchStats = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Today's logs
        let todaySnapshot;
        try {
          const todayQuery = query(
            collection(db, 'logs'),
            where('ownerId', '==', user.uid),
            where('visitDate', '>=', Timestamp.fromDate(startOfToday))
          );
          todaySnapshot = await getDocs(todayQuery);
        } catch (error) {
          handleFirestoreError(error, 'list', 'logs (today)');
        }
        
        // Total logs
        let totalSnapshot;
        try {
          const totalQuery = query(
            collection(db, 'logs'),
            where('ownerId', '==', user.uid)
          );
          totalSnapshot = await getDocs(totalQuery);
        } catch (error) {
          handleFirestoreError(error, 'list', 'logs (total)');
        }
        
        // Purposes
        let purposeSnapshot;
        try {
          const purposeQuery = query(
            collection(db, 'purposes'),
            where('ownerId', '==', user.uid)
          );
          purposeSnapshot = await getDocs(purposeQuery);
        } catch (error) {
          handleFirestoreError(error, 'list', 'purposes');
        }
        
        // Recent logs
        let recentSnapshot;
        try {
          const recentQuery = query(
            collection(db, 'logs'),
            where('ownerId', '==', user.uid),
            orderBy('visitDate', 'desc'),
            limit(5)
          );
          recentSnapshot = await getDocs(recentQuery);
        } catch (error) {
          handleFirestoreError(error, 'list', 'logs (recent)');
        }

        if (todaySnapshot && totalSnapshot && purposeSnapshot && recentSnapshot) {
          setStats({
            todayCount: todaySnapshot.size,
            totalCount: totalSnapshot.size,
            purposeCount: purposeSnapshot.size,
          });
          
          setRecentLogs(recentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitorLog)));
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const statCards = [
    { name: '오늘 방문', value: stats.todayCount, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: '누적 방문', value: stats.totalCount, icon: FileText, color: 'text-green-600', bg: 'bg-green-50' },
    { name: '활성 서식', value: stats.purposeCount, icon: ClipboardList, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-500">방문 현황을 한눈에 확인하세요.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {statCards.map((stat) => (
          <Card key={stat.name} className="p-4 md:p-6 flex items-center gap-4 md:gap-5">
            <div className={cn('p-3 md:p-4 rounded-2xl', stat.bg)}>
              <stat.icon className={cn('w-5 h-5 md:w-6 md:h-6', stat.color)} />
            </div>
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-500">{stat.name}</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
              최근 방문 기록
            </h2>
            <Link to="/admin/logs" className="text-xs md:text-sm text-blue-600 hover:underline flex items-center gap-1">
              전체 보기 <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3 md:space-y-4">
            {recentLogs.length === 0 ? (
              <p className="text-center py-10 text-gray-400 text-sm">기록이 없습니다.</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 md:p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="font-bold text-sm md:text-base text-gray-900 truncate">{log.visitorName}</p>
                    <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 truncate">{log.purposeName} • {log.visitorContact}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] md:text-xs font-medium text-gray-900">
                      {log.visitDate?.toDate ? format(log.visitDate.toDate(), 'HH:mm', { locale: ko }) : ''}
                    </p>
                    <p className="text-[9px] md:text-[10px] text-gray-400">
                      {log.visitDate?.toDate ? format(log.visitDate.toDate(), 'MM/dd', { locale: ko }) : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <h2 className="text-base md:text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
            운영 안내
          </h2>
          <div className="space-y-3 md:space-y-4 text-xs md:text-sm text-gray-600 leading-relaxed">
            <p>• 새로운 방문 목적을 추가하려면 '방문 목적' 메뉴를 이용하세요.</p>
            <p>• 각 목적별로 고유한 QR코드를 생성하여 현장에 비치할 수 있습니다.</p>
            <p>• 방문자가 제출한 정보는 실시간으로 '기록 조회'에서 확인 가능합니다.</p>
            <p>• 개인정보 보호를 위해 방문 기록은 주기적으로 관리해 주세요.</p>
          </div>
        </Card>
      </div>
    </div>
  );
};
