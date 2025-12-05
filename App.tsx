
import React, { useState, useEffect, useCallback } from 'react';
import { AuthState, Task, TaskStatus, User, UserRole } from './types';
import { STORAGE_KEYS, POLLING_INTERVAL } from './constants';
import { loginUser, registerUser, getTasks, saveTask, updateTaskStatus, markTaskAsRead, getApiUrl } from './services/storage';
import Login from './components/Login';
import TaskCard from './components/TaskCard';
import CreateTaskModal from './components/CreateTaskModal';
import Button from './components/Button';
import AdminPanel from './components/AdminPanel';
import SetupWizard from './components/SetupWizard';
import Input from './components/Input';
import { Bell, LogOut, Plus, Search, Filter, RefreshCw, Layout, Send, Database } from 'lucide-react';

function App() {
  const [isSetupRequired, setIsSetupRequired] = useState(true);
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'inbox' | 'outbox'>('inbox');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // --- Check for Setup ---
  useEffect(() => {
      // Check if URL is available (either from localStorage or hardcoded constant)
      const url = getApiUrl();
      if (url) {
          setIsSetupRequired(false);
      }
  }, []);

  // --- Auth Check ---
  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (storedUser) {
      setAuthState({
        user: JSON.parse(storedUser),
        isAuthenticated: true
      });
    }
  }, []);

  // --- Notification Request (Safe Mode) ---
  useEffect(() => {
    if (authState.isAuthenticated && 'Notification' in window && Notification.permission !== 'granted') {
        try {
            Notification.requestPermission().catch(e => console.log("Notification permission failed:", e));
        } catch (e) {
            console.log("Notifications not supported in this environment");
        }
    }
  }, [authState.isAuthenticated]);

  // --- Data Fetching & Polling ---
  const fetchTasks = useCallback(async (notify = false) => {
    if (!authState.user || isSetupRequired) return;
    
    if (!notify) setIsLoading(true);
    
    try {
      const allTasks = await getTasks();
      setTasks(allTasks);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      if (!notify) setIsLoading(false);
    }
  }, [authState.user, isSetupRequired]);

  // Separate polling logic to handle state diffs correctly
  useEffect(() => {
      let intervalId: ReturnType<typeof setInterval>;
      if (authState.isAuthenticated && !isSetupRequired) {
          // Initial fetch
          fetchTasks();

          const poll = async () => {
             try {
                 const serverTasks = await getTasks();
                 
                 setTasks(prevTasks => {
                     const prevIds = new Set(prevTasks.map(t => t.id));
                     const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || '{}');
                     
                     // Find tasks assigned to me that I haven't seen in the previous state list
                     const newAssigned = serverTasks.filter(t => 
                        t.assignedTo.includes(currentUser.id) && !prevIds.has(t.id)
                     );

                     // Safe Notification Logic for Mobile/Crash Prevention
                     if (newAssigned.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
                        try {
                            new Notification("新任務通知", {
                                body: `${newAssigned[0].createdByName} 指派了: ${newAssigned[0].title}`
                            });
                        } catch (e) {
                            console.log("Notification display failed (mobile or background restriction)", e);
                        }
                     }
                     return serverTasks;
                 });
             } catch (e) {
                 console.error("Polling error", e);
             }
          }
          
          intervalId = setInterval(poll, POLLING_INTERVAL);
      }
      return () => clearInterval(intervalId);
  }, [authState.isAuthenticated, isSetupRequired, fetchTasks]);


  const handleLogin = (user: User) => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    setAuthState({ user, isAuthenticated: true });
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    setAuthState({ user: null, isAuthenticated: false });
    setTasks([]);
  };

  const handleResetConnection = () => {
      if(confirm("確定要重置連線設定嗎？(如果是使用預設網址，重置後仍會連線到預設資料庫)")) {
          localStorage.removeItem(STORAGE_KEYS.GOOGLE_SCRIPT_URL);
          // Only enforce setup if there is no default hardcoded URL
          if (!getApiUrl()) {
             setIsSetupRequired(true);
          }
          handleLogout();
      }
  };

  const handleCreateTask = async (data: { title: string; description: string; assignedTo: string[]; dueDate: string }) => {
    if (!authState.user) return;
    
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: data.title,
      description: data.description,
      assignedTo: data.assignedTo,
      dueDate: data.dueDate,
      createdBy: authState.user.id,
      createdByName: authState.user.name,
      status: TaskStatus.ASSIGNED,
      createdAt: Date.now(),
      isRead: false
    };

    setIsLoading(true); // Manually set loading for better UX
    try {
        await saveTask(newTask);
        await fetchTasks();
    } catch (e) {
        alert("建立任務失敗，請檢查網路或 Google Sheet 連線");
    } finally {
        setIsLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      try {
        await updateTaskStatus(taskId, newStatus);
      } catch (e) {
        console.error("Failed to update status", e);
        // Revert on failure (could implement fetching again)
      }
  };

  // --- Filtering Logic ---
  const filteredTasks = tasks.filter(task => {
    if (!authState.user) return false;

    // View Mode Filter
    const isInbox = viewMode === 'inbox' && task.assignedTo.includes(authState.user.id);
    const isOutbox = viewMode === 'outbox' && task.createdBy === authState.user.id;
    if (!isInbox && !isOutbox) return false;

    // Search Filter
    const matchesSearch = 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.createdByName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // Status Filter
    if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;

    return true;
  }).sort((a, b) => b.createdAt - a.createdAt); // Newest first

  const myPendingCount = tasks.filter(t => 
    authState.user && 
    t.assignedTo.includes(authState.user.id) && 
    t.status !== TaskStatus.DONE
  ).length;

  // --- Renders ---

  if (isSetupRequired) {
      return <SetupWizard onComplete={() => setIsSetupRequired(false)} />;
  }

  if (!authState.isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-green-600 p-2 rounded-lg shrink-0">
                <Layout className="text-white w-6 h-6" />
            </div>
            {/* Mobile Fix: Remove 'hidden sm:block' so title is visible on mobile */}
            <h1 className="text-xl font-bold text-gray-800">TeamTask Sync</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative">
                <Bell className="text-gray-500 w-6 h-6" />
                {myPendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                        {myPendingCount}
                    </span>
                )}
            </div>
            {/* User info can remain hidden on very small screens to save space, or use icon */}
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-900">{authState.user?.name}</div>
              <div className="text-xs text-gray-500">{authState.user?.role === UserRole.ADMIN ? '管理員' : '一般成員'}</div>
            </div>
            <Button variant="ghost" onClick={handleResetConnection} className="p-2 text-gray-400 hover:text-blue-600" title="重置資料庫連線">
                <Database className="w-5 h-5" />
            </Button>
            <Button variant="ghost" onClick={handleLogout} className="p-2">
              <LogOut className="w-5 h-5 text-gray-600" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {authState.user?.role === UserRole.ADMIN && <AdminPanel />}

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm w-full md:w-auto">
            <button 
                onClick={() => setViewMode('inbox')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${viewMode === 'inbox' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                <Layout size={16} /> 
                收件匣
            </button>
            <button 
                onClick={() => setViewMode('outbox')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${viewMode === 'outbox' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                <Send size={16} /> 
                寄件備份
            </button>
          </div>

          <Button onClick={() => setIsCreateModalOpen(true)} className="w-full md:w-auto shadow-sm">
            <Plus className="w-5 h-5" /> 指派新任務
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5 relative">
                <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                <input 
                    type="text" 
                    placeholder="搜尋任務..." 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="md:col-span-3 relative">
                <Filter className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                <select 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none bg-white"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="ALL">所有狀態</option>
                    <option value={TaskStatus.ASSIGNED}>已指派 (未讀)</option>
                    <option value={TaskStatus.RECEIVED}>已收到 (處理中)</option>
                    <option value={TaskStatus.DONE}>已完成</option>
                </select>
            </div>
            <div className="md:col-span-4 flex justify-end">
                <Button variant="secondary" onClick={() => fetchTasks(false)} className="w-full md:w-auto">
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> 重新整理
                </Button>
            </div>
        </div>

        {/* Task Grid */}
        {filteredTasks.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500 text-lg">目前沒有符合條件的任務</p>
                {viewMode === 'outbox' && (
                    <Button variant="ghost" onClick={() => setIsCreateModalOpen(true)} className="mt-4">
                        立即指派任務
                    </Button>
                )}
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map(task => (
                <TaskCard 
                    key={task.id} 
                    task={task} 
                    currentUser={authState.user}
                    onStatusChange={handleStatusChange}
                />
            ))}
            </div>
        )}
      </main>

      <CreateTaskModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSubmit={handleCreateTask}
        currentUser={authState.user}
      />
    </div>
  );
}

export default App;
