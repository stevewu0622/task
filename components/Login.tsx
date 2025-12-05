import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { loginUser, registerUser } from '../services/storage';
import Input from './Input';
import Button from './Button';
import { Layout } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isRegistering) {
        await registerUser(name, email, password);
        setSuccessMsg('申請成功！請等待管理員核准後登入。第一位註冊者將自動成為管理員。');
        setIsRegistering(false);
        setPassword('');
      } else {
        const user = await loginUser(email, password);
        if (user) {
          onLogin(user);
        } else {
          setError('帳號或密碼錯誤，或帳號尚未開通');
        }
      }
    } catch (err: any) {
      setError(err.message || '發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
             <Layout className="text-white w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">TeamTask Sync</h1>
          <p className="text-gray-500 mt-2">
            {isRegistering ? '申請加入團隊' : '登入您的帳戶'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-100">
            {error}
          </div>
        )}
        
        {successMsg && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm border border-green-100">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <Input
              label="姓名"
              placeholder="您的稱呼"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          
          <Input
            label="Email"
            type="email"
            placeholder="example@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <Input
            label="密碼"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" className="w-full mt-6" isLoading={loading}>
            {isRegistering ? '提交申請' : '登入'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <button
            onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
                setSuccessMsg('');
            }}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {isRegistering ? '已有帳號？返回登入' : '還沒有帳號？立即申請'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;