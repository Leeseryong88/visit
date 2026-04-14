import React, { useState, useEffect } from 'react';
import { 
  signInWithRedirect, 
  getRedirectResult, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Label } from '../components/ui/Button';
import { ClipboardList, LogIn, AlertCircle, Loader2, UserPlus, Mail, Lock, User } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

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

  const handleUserLogin = async (user: any, manualDisplayName?: string) => {
    // Check if user already in DB
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Create admin profile for the first time for ANY user who signs up
      await setDoc(userDocRef, {
        email: user.email,
        displayName: user.displayName || manualDisplayName || '관리자',
        photoURL: user.photoURL || null,
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

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        if (displayName) {
          await updateProfile(user, { displayName });
        }

        await handleUserLogin(user, displayName);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await handleUserLogin(userCredential.user);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('이미 사용 중인 이메일입니다.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (err.code === 'auth/weak-password') {
        setError('비밀번호는 최소 6자 이상이어야 합니다.');
      } else {
        setError('인증 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
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
      <Card className="max-w-md w-full p-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-6">
            <ClipboardList className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'login' ? '관리자 로그인' : '관리자 가입하기'}
          </h1>
          <p className="text-gray-500 mt-2">디지털 방문일지 관리 시스템</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <Label htmlFor="displayName">이름 / 기관명</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="홍길동"
                  className="pl-10"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">이메일</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">비밀번호</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                className="pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 gap-2" isLoading={loading}>
            {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {mode === 'login' ? '로그인' : '회원가입'}
          </Button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-400">또는</span>
          </div>
        </div>

        <Button
          onClick={handleGoogleLogin}
          className="w-full h-12 gap-3"
          variant="outline"
          disabled={loading}
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
          Google 계정으로 계속하기
        </Button>

        <div className="mt-8 text-center text-sm">
          <p className="text-gray-500">
            {mode === 'login' ? '아직 계정이 없으신가요?' : '이미 계정이 있으신가요?'}
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="ml-2 text-blue-600 font-bold hover:underline"
            >
              {mode === 'login' ? '회원가입' : '로그인'}
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
};
