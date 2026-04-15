import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, updateDoc, getDoc, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { AdminUser, VisitPurpose } from '../types';
import { Card, Button, Input } from '../components/ui/Button';
import { Loader2, User, Shield, Check, X, Eye, FileText, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SuperAdmin: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userPurposes, setUserPurposes] = useState<VisitPurpose[]>([]);
  const [loadingPurposes, setLoadingPurposes] = useState(false);
  const [showPurposesModal, setShowPurposesModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AdminUser)));
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const toggleSubscription = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isSubscribed: !currentStatus
      });
      setUsers(users.map(u => u.uid === userId ? { ...u, isSubscribed: !currentStatus } : u));
    } catch (error) {
      console.error('Error updating subscription:', error);
    }
  };

  const viewPurposes = async (user: AdminUser) => {
    setSelectedUser(user);
    setLoadingPurposes(true);
    setShowPurposesModal(true);
    try {
      const q = query(collection(db, 'purposes'), where('ownerId', '==', user.uid));
      const snapshot = await getDocs(q);
      setUserPurposes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitPurpose)));
    } catch (error) {
      console.error('Error fetching purposes:', error);
    } finally {
      setLoadingPurposes(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.uid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">운영자 관리 페이지</h1>
        <p className="text-gray-500">전체 사용자 및 구독 권한을 관리합니다.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="이메일 또는 UID로 사용자 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-500">검색 결과가 없습니다.</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.uid} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{user.email}</h3>
                  <p className="text-xs text-gray-500">UID: {user.uid}</p>
                  <div className="flex gap-2 mt-1">
                    {user.isSubscribed ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> 구독 중
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full">
                        미구독
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => viewPurposes(user)}
                >
                  <Eye className="w-4 h-4" /> 양식 보기
                </Button>
                <Button 
                  variant={user.isSubscribed ? "outline" : "primary"}
                  size="sm"
                  className="gap-2"
                  onClick={() => toggleSubscription(user.uid, !!user.isSubscribed)}
                >
                  <Shield className="w-4 h-4" /> 
                  {user.isSubscribed ? "구독 취소" : "구독 부여"}
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Purposes Modal */}
      <AnimatePresence>
        {showPurposesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">사용자 양식 목록</h2>
                  <p className="text-sm text-gray-500">{selectedUser?.email}</p>
                </div>
                <button onClick={() => setShowPurposesModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                {loadingPurposes ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  </div>
                ) : userPurposes.length === 0 ? (
                  <p className="text-center py-10 text-gray-500">등록된 양식이 없습니다.</p>
                ) : (
                  <div className="space-y-4">
                    {userPurposes.map((purpose) => (
                      <div key={purpose.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-gray-900">{purpose.name}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${purpose.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {purpose.isActive ? '활성' : '비활성'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">{purpose.description}</p>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">필드 구성</p>
                          <div className="flex flex-wrap gap-2">
                            {purpose.fields.map(f => (
                              <span key={f.id} className="px-2 py-1 bg-white border border-gray-200 rounded text-[10px] text-gray-600">
                                {f.label} ({f.type})
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
