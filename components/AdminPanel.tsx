import React, { useEffect, useState } from 'react';
import { User, UserStatus } from '../types';
import { getUsers, updateUserStatus } from '../services/storage';
import Button from './Button';
import { Check, X } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPending = async () => {
    setLoading(true);
    const allUsers = await getUsers();
    setPendingUsers(allUsers.filter(u => u.status === UserStatus.PENDING));
    setLoading(false);
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async (userId: string, status: UserStatus) => {
    await updateUserStatus(userId, status);
    fetchPending();
  };

  if (pendingUsers.length === 0 && !loading) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-orange-200">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
        待審核用戶 ({pendingUsers.length})
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">申請時間</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pendingUsers.map(user => (
              <tr key={user.id}>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    className="text-green-600 hover:text-green-900 hover:bg-green-50 p-1"
                    onClick={() => handleAction(user.id, UserStatus.ACTIVE)}
                    title="核准"
                  >
                    <Check size={18} /> 核准
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="text-red-600 hover:text-red-900 hover:bg-red-50 p-1"
                    onClick={() => handleAction(user.id, UserStatus.REJECTED)}
                    title="拒絕"
                  >
                    <X size={18} /> 拒絕
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPanel;