import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { VisitPurpose, AdminUser } from '../types';
import { Card, Button, Input } from '../components/ui/Button';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, Loader2, Save, Edit2, X } from 'lucide-react';

export const AdminQRCodes: React.FC = () => {
  const [purposes, setPurposes] = useState<VisitPurpose[]>([]);
  const [adminData, setAdminData] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [tempQrText, setTempQrText] = useState('');
  const [tempQrTitle, setTempQrTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // Fetch Admin Data
        const adminDoc = await getDoc(doc(db, 'users', user.uid));
        if (adminDoc.exists()) {
          const data = adminDoc.data() as AdminUser;
          setAdminData(data);
          setTempQrText(data.qrText || '모든 방문 목적을 선택할 수 있는\n메인 페이지로 연결됩니다 작성후 관리자에게 보여주시기 바랍니다.');
          setTempQrTitle(data.qrTitle || '공통 방문 QR');
        }

        const q = query(
          collection(db, 'purposes'),
          where('ownerId', '==', user.uid),
          where('isActive', '==', true)
        );
        const snapshot = await getDocs(q);
        setPurposes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitPurpose)));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSaveQrSettings = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        qrText: tempQrText,
        qrTitle: tempQrTitle
      });
      setAdminData(prev => prev ? { ...prev, qrText: tempQrText, qrTitle: tempQrTitle } : null);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving QR settings:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const downloadQR = (id: string, name: string) => {
    const svg = document.getElementById(`qr-${id}`);
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `qr_${name}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const printQR = (id: string, name: string) => {
    const svg = document.getElementById(`qr-${id}`);
    if (!svg) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const svgHtml = svg.outerHTML;
    const qrTitle = adminData?.qrTitle || '공통 방문 QR';
    const qrText = adminData?.qrText || '모든 방문 목적을 선택할 수 있는\n메인 페이지로 연결됩니다 작성후 관리자에게 보여주시기 바랍니다.';
    const formattedText = qrText.replace(/\n/g, '<br />');

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${qrTitle}</title>
          <style>
            @page { size: auto; margin: 0; }
            body { 
              margin: 0; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              font-family: sans-serif; 
              background: white;
            }
            .container { 
              text-align: center; 
              padding: 40px; 
              width: 100%;
              max-width: 500px;
              box-sizing: border-box;
            }
            .qr-wrapper {
              margin-bottom: 30px;
            }
            .qr-wrapper svg {
              width: 300px !important;
              height: 300px !important;
            }
            h1 { 
              margin: 20px 0; 
              font-size: 32px; 
              font-weight: bold;
              color: #000;
            }
            p { 
              color: #333; 
              margin-top: 15px; 
              font-size: 18px;
              line-height: 1.6;
              white-space: pre-wrap;
            }
            @media print {
              body { height: auto; }
              .container { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="qr-wrapper">${svgHtml}</div>
            <h1>${qrTitle}</h1>
            <p>${formattedText}</p>
          </div>
          <script>
            window.onload = () => { 
              setTimeout(() => {
                window.print(); 
                window.close(); 
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const baseUrl = window.location.origin;
  const adminId = auth.currentUser?.uid;
  const qrUrl = `${baseUrl}/s/${adminId}`;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR코드 관리</h1>
          <p className="text-gray-500">현장에 비치할 QR코드를 생성하고 출력합니다.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Entry QR */}
        <Card className="p-10 flex flex-col items-center text-center border-2 border-blue-100 bg-blue-50/30 max-w-md w-full h-fit">
          <div className="bg-white p-6 rounded-3xl shadow-md mb-8">
            <QRCodeSVG
              id="qr-main"
              value={qrUrl}
              size={240}
              level="H"
              includeMargin
            />
          </div>
          <div className="w-full space-y-6">
            {isEditing ? (
              <div className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">QR 제목</label>
                  <Input 
                    value={tempQrTitle}
                    onChange={(e) => setTempQrTitle(e.target.value)}
                    placeholder="QR코드 제목을 입력하세요"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">하단 안내 문구</label>
                  <textarea
                    className="w-full p-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                    value={tempQrText}
                    onChange={(e) => setTempQrText(e.target.value)}
                    placeholder="QR코드 아래에 표시될 문구를 입력하세요"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 gap-2 h-11" onClick={handleSaveQrSettings} isLoading={saving}>
                    <Save className="w-4 h-4" /> 설정 저장
                  </Button>
                  <Button variant="outline" className="h-11 px-4" onClick={() => { 
                    setIsEditing(false); 
                    setTempQrTitle(adminData?.qrTitle || '');
                    setTempQrText(adminData?.qrText || '');
                  }}>
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="group relative inline-block">
                  <h3 className="font-bold text-xl text-gray-900">{adminData?.qrTitle || '공통 방문 QR'}</h3>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="absolute -right-8 top-1/2 -translate-y-1/2 p-1 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-sm text-gray-500 whitespace-pre-wrap leading-relaxed">
                  {adminData?.qrText || '모든 방문 목적을 선택할 수 있는\n메인 페이지로 연결됩니다 작성후 관리자에게 보여주시기 바랍니다.'}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1 gap-2 h-12" onClick={() => downloadQR('main', adminData?.qrTitle || '공통_방문')}>
              <Download className="w-4 h-4" /> 이미지 저장
            </Button>
            <Button variant="outline" className="flex-1 gap-2 h-12" onClick={() => printQR('main', adminData?.qrTitle || '공통 방문')}>
              <Printer className="w-4 h-4" /> 인쇄하기
            </Button>
          </div>
        </Card>

        <Card className="flex-1 p-8">
          <h3 className="font-bold text-lg mb-4">QR코드 활용 안내</h3>
          <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="font-bold text-gray-900 mb-1">1. 문구 커스터마이징</p>
              <p>QR코드 아래의 문구를 회사 이름이나 환영 인사로 변경할 수 있습니다. 수정 버튼을 눌러 원하는 내용을 입력하세요.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="font-bold text-gray-900 mb-1">2. 인쇄 최적화</p>
              <p>인쇄하기 버튼을 누르면 A4 한 페이지에 최적화된 크기로 출력됩니다. 브라우저 인쇄 설정에서 '배경 그래픽'을 체크하면 더 깔끔하게 출력됩니다.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="font-bold text-gray-900 mb-1">3. 비치 방법</p>
              <p>출력된 QR코드를 안내 데스크나 출입구 등 방문객의 눈에 잘 띄는 곳에 비치해 주세요.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
