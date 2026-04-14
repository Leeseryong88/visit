import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ClipboardList, 
  QrCode, 
  ShieldCheck, 
  Smartphone, 
  BarChart3, 
  CheckCircle2, 
  ArrowRight,
  ChevronRight,
  Users,
  FileSignature
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { motion } from 'motion/react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">디지털 방문일지</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin/login" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">로그인</Link>
            <Link to="/admin/login">
              <Button size="sm" className="rounded-full px-6">무료로 시작하기</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-24 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block py-1 px-4 rounded-full bg-blue-50 text-blue-600 text-sm font-semibold mb-6">
              종이 방문일지 대신 스마트한 선택
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-8 leading-[1.1]">
              QR코드 하나로 끝내는<br />
              <span className="text-blue-600">디지털 방문객 관리</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-12 leading-relaxed">
              수기 작성의 번거로움과 개인정보 유출 걱정은 이제 그만.<br />
              누구나 1분 만에 우리 매장만의 방문일지를 만들고 관리할 수 있습니다.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/admin/login">
                <Button size="lg" className="h-16 px-10 text-lg rounded-2xl shadow-xl shadow-blue-200 gap-2">
                  지금 바로 시작하기 <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <p className="text-sm text-gray-400">신용카드 정보 없이 무료 시작</p>
            </div>
          </motion.div>

          {/* Hero Image / Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-20 relative max-w-5xl mx-auto"
          >
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-gray-100 bg-gray-50 p-4">
              <img 
                src="https://picsum.photos/seed/dashboard/1200/800" 
                alt="Dashboard Preview" 
                className="rounded-2xl w-full shadow-inner"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Floating Elements */}
            <div className="absolute -bottom-10 -left-10 bg-white p-6 rounded-2xl shadow-2xl hidden lg:block border border-gray-50">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold">오늘 방문자</p>
                  <p className="text-2xl font-black text-gray-900">128명</p>
                </div>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 bg-white p-6 rounded-2xl shadow-2xl hidden lg:block border border-gray-50">
              <div className="flex items-center gap-4">
                <QrCode className="w-12 h-12 text-blue-600" />
                <p className="text-sm font-bold leading-tight">스캔 즉시<br />작성 페이지 연결</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">강력한 기능으로 관리 효율을 높이세요</h2>
            <p className="text-gray-500">필요한 모든 기능을 하나에 담았습니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: '맞춤형 서식 설정',
                desc: '방문 목적에 따라 이름, 연락처, 사진 첨부 등 필요한 항목을 자유롭게 구성하세요.',
                icon: Smartphone,
                color: 'bg-blue-100 text-blue-600'
              },
              {
                title: '안전한 전자서명',
                desc: '종이 없이 화면에서 직접 서명하고, 개인정보 수집 동의 절차까지 한 번에 처리합니다.',
                icon: FileSignature,
                color: 'bg-purple-100 text-purple-600'
              },
              {
                title: '실시간 통계 및 관리',
                desc: '방문 현황을 실시간으로 확인하고, 기록을 엑셀로 다운로드하여 간편하게 관리하세요.',
                icon: BarChart3,
                color: 'bg-green-100 text-green-600'
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-4xl font-bold mb-8 leading-tight">단 3단계면<br />운영 준비가 끝납니다</h2>
              <div className="space-y-8">
                {[
                  { step: '01', title: '회원가입 및 로그인', desc: 'Google 계정으로 간편하게 시작하세요.' },
                  { step: '02', title: '방문 목적 및 서식 생성', desc: '우리 매장에 맞는 방문 항목을 설정하세요.' },
                  { step: '03', title: 'QR코드 비치', desc: '생성된 QR코드를 인쇄하여 입구에 비치하면 끝!' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <span className="text-4xl font-black text-blue-100">{item.step}</span>
                    <div>
                      <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                      <p className="text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:w-1/2 bg-blue-600 rounded-[3rem] p-12 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-6">방문자 화면 예시</h3>
                <div className="bg-white rounded-3xl p-6 text-gray-900 shadow-2xl max-w-xs mx-auto">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                    <ClipboardList className="w-6 h-6 text-white" />
                  </div>
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                    <div className="h-10 bg-gray-50 rounded border border-gray-100"></div>
                    <div className="h-10 bg-gray-50 rounded border border-gray-100"></div>
                    <div className="h-12 bg-blue-600 rounded-xl"></div>
                  </div>
                </div>
              </div>
              {/* Decorative circles */}
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-500 rounded-full opacity-50"></div>
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-400 rounded-full opacity-30"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto bg-gray-900 rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-8">지금 바로 디지털 방문일지를<br />무료로 도입해 보세요</h2>
            <Link to="/admin/login">
              <Button size="lg" className="h-16 px-12 text-lg rounded-2xl bg-white text-gray-900 hover:bg-gray-100 gap-2">
                무료로 시작하기 <ChevronRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10 w-32 h-32 border-4 border-white rounded-full"></div>
            <div className="absolute bottom-10 right-10 w-64 h-64 border-8 border-white rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold">디지털 방문일지</span>
          </div>
          <div className="flex gap-6">
            <Link to="/admin/login" className="text-sm text-gray-500 hover:text-gray-900">관리자 로그인</Link>
            <a href="#" className="text-sm text-gray-500 hover:text-gray-900">이용약관</a>
            <a href="#" className="text-sm text-gray-500 hover:text-gray-900">개인정보처리방침</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
