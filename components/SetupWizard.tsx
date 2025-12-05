import React, { useState } from 'react';
import Input from './Input';
import Button from './Button';
import { STORAGE_KEYS } from '../constants';
import { Database, Link, AlertTriangle } from 'lucide-react';

interface SetupWizardProps {
  onComplete: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!url.includes('script.google.com') || !url.endsWith('/exec')) {
        setError("網址格式似乎不正確。必須是 script.google.com 開頭，並以 /exec 結尾。");
        setLoading(false);
        return;
    }

    try {
      // Test connection
      const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({ action: 'READ', sheet: 'Users' }), // Try to read Users sheet
      });
      
      const text = await response.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (err) {
         console.error("Parse error:", text);
         throw new Error("伺服器回傳了非 JSON 的內容。可能是 HTML 錯誤頁面 (如 404 或 需要登入)。");
      }

      if (json.status === 'success' || json.status === 'error') { 
        // 'error' is acceptable here (e.g., sheet doesn't exist yet), it means the script endpoint is reachable and running logic
        localStorage.setItem(STORAGE_KEYS.GOOGLE_SCRIPT_URL, url);
        onComplete();
      } else {
        throw new Error("API 回應格式無法識別，請確認 Script 程式碼是否正確。");
      }

    } catch (err: any) {
      console.error(err);
      let msg = "連線失敗 (Failed to fetch)。";
      
      // Common troubleshooting hints
      msg += "\n\n請檢查：\n";
      msg += "1. 部署權限是否設為「Anyone (所有人)」？(最常見原因)\n";
      msg += "2. 網址結尾是否為 /exec？\n";
      msg += "3. 是否使用了瀏覽器的無痕模式？(有時多重登入會導致干擾)\n";
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
           <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="text-green-600 w-8 h-8" />
           </div>
           <h1 className="text-2xl font-bold text-gray-800">連接 Google Sheets</h1>
           <p className="text-gray-500 mt-2">首次使用需要設定後端資料庫連結</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
            <h3 className="font-bold mb-2 flex items-center gap-2">
                <Link size={16}/> 如何取得網址？
            </h3>
            <ol className="list-decimal list-inside space-y-1 ml-1">
                <li>請查看專案中的 <b>GOOGLE_SHEETS_README.md</b> 文件。</li>
                <li>依照指示建立 Google Sheet 與 Apps Script。</li>
                <li>部署為 Web App 並將權限設為 "Anyone" (所有人)。</li>
                <li>將產生的網址貼在下方。</li>
            </ol>
        </div>

        <form onSubmit={handleConnect} className="space-y-4">
            <Input 
                label="Apps Script Web App URL"
                placeholder="https://script.google.com/macros/s/..../exec"
                value={url}
                onChange={(e) => setUrl(e.target.value.trim())}
                required
            />
            
            {error && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex gap-3 items-start">
                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                    <p className="text-red-600 text-sm whitespace-pre-wrap">{error}</p>
                </div>
            )}
            
            <Button type="submit" className="w-full" isLoading={loading}>
                驗證並連線
            </Button>
        </form>
      </div>
    </div>
  );
};

export default SetupWizard;