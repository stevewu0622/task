
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { User, TaskPriority } from '../types';
import { getUsers } from '../services/storage';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '../constants';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; assignedTo: string[]; dueDate: string; priority: TaskPriority }) => void;
  currentUser: User | null;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, onSubmit, currentUser }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
          const allUsers = await getUsers();
          setUsers(allUsers.filter(u => u.id !== currentUser?.id && u.status === 'ACTIVE'));
        } catch (e) {
          console.error(e);
        } finally {
            setIsLoadingUsers(false);
        }
      };
      fetchUsers();
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority(TaskPriority.MEDIUM);
      setSelectedUsers([]);
    }
  }, [isOpen, currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsers.length === 0) {
      alert("請至少選擇一位同事");
      return;
    }
    onSubmit({ title, description, assignedTo: selectedUsers, dueDate, priority });
    onClose();
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="指派新任務">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
            <div className="flex-1">
                <Input 
                label="任務標題" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                required 
                placeholder="例如：請協助確認客戶報價單"
                />
            </div>
            <div className="w-1/3">
                 <label className="block text-sm font-medium text-gray-700 mb-1">優先級</label>
                 <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                 >
                    {Object.values(TaskPriority).map(p => (
                        <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                    ))}
                 </select>
            </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">任務詳情</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="請輸入詳細內容..."
          />
        </div>

        <Input 
          label="截止日期 (Due Date)" 
          type="date" 
          value={dueDate} 
          onChange={(e) => setDueDate(e.target.value)} 
          required 
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">指派給 (多選)</label>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border p-2 rounded-lg bg-gray-50">
            {isLoadingUsers ? (
                <p className="text-sm text-gray-500 p-2">載入同事名單中...</p>
            ) : users.length === 0 ? (
                <p className="text-sm text-gray-500 p-2">沒有其他可指派的同事</p>
            ) : (
                users.map(user => (
                <div 
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className={`p-2 rounded cursor-pointer text-sm border transition-all select-none ${
                    selectedUsers.includes(user.id) 
                        ? 'bg-blue-100 border-blue-300 text-blue-800' 
                        : 'bg-white border-gray-200 hover:border-blue-300'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full border ${selectedUsers.includes(user.id) ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-400'}`}></div>
                        {user.name}
                    </div>
                </div>
                ))
            )}
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>取消</Button>
          <Button type="submit">確認指派</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTaskModal;
