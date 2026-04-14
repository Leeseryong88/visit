import React, { useState, useEffect } from 'react';
import { signInWithRedirect, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui/Button';
import { ClipboardList, LogIn, AlertCircle, Loader2 } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          await handleUserLogin(result.user);
        }
      } catch (err: any) {
        console.error('Redirect result error:', err);
        setError('로그인 처리 중 오류가 발생했습니다.');
      } finally {
        setCheckingAuth(false);
      }
    };

    checkRedirect();
  }, []);

  const handleUserLogin = async (user: any) => {
    // Check if user already in DB
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Create admin profile for the first time for ANY user who signs up
      await setDoc(userDocRef, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: 'admin',
        createdAt: serverTimestamp(),
        qrText: '모든 방문 목적을 선택할 수 있는\n메인 페이지로 연결됩니다 작성후 관리자에게 보여주시기 바랍니다.',
        qrTitle: '공통 방문 QR',
      });

      // Seed default purposes
      await seedDefaultPurposes(user.uid);
    }
    
    navigate('/admin');
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.error('Login error:', err);
      setError('로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const seedDefaultPurposes = async (userId: string) => {
    const defaultPurposes = [
      {
        name: '미팅 (회의/상담)',
        description: '업무 미팅 및 상담을 위해 방문하신 경우',
        isActive: true,
        fields: [
          { id: 'name', label: '방문자 성함', type: 'text', required: true },
          { id: 'contact', label: '연락처', type: 'tel', required: true },
          { id: 'company', label: '소속/업체명', type: 'text', required: true },
          { id: 'person_to_meet', label: '접견 대상자', type: 'text', required: true },
          { id: 'meeting_room', label: '회의실/장소', type: 'select', required: false, options: ['1층 대회의실', '2층 소회의실', '상담실', '사무실'] },
        ],
      },
      {
        name: '납품 & 택배',
        description: '물품 납품 또는 택배 배송을 위해 방문하신 경우',
        isActive: true,
        fields: [
          { id: 'name', label: '방문자 성함', type: 'text', required: true },
          { id: 'contact', label: '연락처', type: 'tel', required: true },
          { id: 'company', label: '배송업체명', type: 'text', required: true },
          { id: 'item_type', label: '물품 종류', type: 'text', required: true },
          { id: 'recipient', label: '수령인/부서', type: 'text', required: true },
        ],
      },
      {
        name: '시설 공사 & 점검',
        description: '시설 유지보수, 공사 및 정기 점검 방문',
        isActive: true,
        fields: [
          { id: 'name', label: '방문자 성함', type: 'text', required: true },
          { id: 'contact', label: '연락처', type: 'tel', required: true },
          { id: 'company', label: '업체명', type: 'text', required: true },
          { id: 'work_desc', label: '작업 내용', type: 'textarea', required: true },
          { id: 'safety_check', label: '안전 수칙 준수 동의', type: 'checkbox', required: true, options: ['동의함'] },
        ],
      },
    ];

    for (const purpose of defaultPurposes) {
      await addDoc(collection(db, 'purposes'), {
        ...purpose,
        ownerId: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-6">
          <ClipboardList className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">관리자 로그인 / 시작하기</h1>
        <p className="text-gray-500 mt-2 mb-8">디지털 방문일지 관리 시스템</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-700 text-sm text-left">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <Button
          onClick={handleGoogleLogin}
          className="w-full h-12 gap-3"
          variant="outline"
          isLoading={loading}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google 계정으로 시작하기
        </Button>

        <p className="mt-8 text-xs text-gray-400">
          Google 계정으로 로그인하면 즉시 서비스를 이용하실 수 있습니다.
        </p>
      </Card>
    </div>
  );
};
