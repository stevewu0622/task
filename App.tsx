
import React, { useState, useEffect, useCallback } from 'react';
import { AuthState, Task, TaskStatus, User, UserRole, TaskPriority } from './types';
import { STORAGE_KEYS, POLLING_INTERVAL } from './constants';
import { loginUser, registerUser, getTasks, saveTask, updateTaskStatus, getApiUrl } from './services/storage';
import Login from './components/Login';
import TaskCard from './components/TaskCard';
import CreateTaskModal from './components/CreateTaskModal';
import Button from './components/Button';
import AdminPanel from './components/AdminPanel';
import SetupWizard from './components/SetupWizard';
import { Bell, LogOut, Plus, Search, Filter, RefreshCw, Layout, Send, Database, PieChart, CheckCircle2, CircleDashed, ListTodo, Activity } from 'lucide-react';

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

  // --- Notification Request ---
  useEffect(() => {
    if (authState.isAuthenticated && 'Notification' in window && Notification.permission !== 'granted') {
        try {
            Notification.requestPermission().catch(e => console.log("Notification permission failed:", e));
        } catch (e) {
            console.log("Notifications not supported");
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

  useEffect(() => {
      let intervalId: ReturnType<typeof setInterval>;
      if (authState.isAuthenticated && !isSetupRequired) {
          fetchTasks();

          const poll = async () => {
             try {
                 const serverTasks = await getTasks();
                 
                 setTasks(prevTasks => {
                     const prevIds = new Set(prevTasks.map(t => t.id));
                     const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || '{}');
                     
                     // Find new tasks assigned to me
                     const newAssigned = serverTasks.filter(t => 
                        t.assignedTo.includes(currentUser.id) && !prevIds.has(t.id)
                     );

                     if (newAssigned.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
                        try {
                            new Notification("新任務通知", {
                                body: `${newAssigned[0].createdByName} 指派了: ${newAssigned[0].title}`
                            });
                        } catch (e) {}
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
      if(confirm("確定要重置連線設定嗎？")) {
          localStorage.removeItem(STORAGE_KEYS.GOOGLE_SCRIPT_URL);
          if (!getApiUrl()) setIsSetupRequired(true);
          handleLogout();
      }
  };

  const handleCreateTask = async (data: { title: string; description: string; assignedTo: string[]; dueDate: string; priority: TaskPriority }) => {
    if (!authState.user) return;
    
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: data.title,
      description: data.description,
      assignedTo: data.assignedTo,
      dueDate: data.dueDate,
      priority: data.priority,
      createdBy: authState.user.id,
      createdByName: authState.user.name,
      status: TaskStatus.ASSIGNED,
      createdAt: Date.now(),
      readBy: [] // Initialize empty
    };

    setIsLoading(true);
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
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      try {
        await updateTaskStatus(taskId, newStatus);
      } catch (e) {
        console.error("Failed to update status", e);
      }
  };

  // --- Filtering Logic ---
  
  // 1. First determine the "Universe" of tasks based on View Mode (Inbox vs Outbox)
  // This is used for Statistics regardless of Search filters
  const viewTasks = tasks.filter(task => {
      if (!authState.user) return false;
      if (viewMode === 'inbox') return task.assignedTo.includes(authState.user.id);
      if (viewMode === 'outbox') return task.createdBy === authState.user.id;
      return false;
  });

  // 2. Statistics Calculation
  const stats = {
      pending: viewTasks.filter(t => t.status === TaskStatus.ASSIGNED || t.status === TaskStatus.RECEIVED).length,
      inProgress: viewTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      done: viewTasks.filter(t => t.status === TaskStatus.DONE).length,
      total: viewTasks.length
  };
  const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  // 3. Apply Search and Status Filters for the Grid
  const filteredTasks = viewTasks.filter(task => {
    const matchesSearch = 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.createdByName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;

    return true;
  }).sort((a, b) => b.createdAt - a.createdAt);

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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
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

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 text-sm font-medium">待處理</span>
                    <div className="p-1.5 bg-red-100 rounded-lg">
                        <ListTodo className="w-4 h-4 text-red-600" />
                    </div>
                </div>
                <div className="text-2xl font-bold text-gray-800">{stats.pending}</div>
                <div className="text-xs text-gray-400 mt-1">未讀取或未開始</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 text-sm font-medium">進行中</span>
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                        <Activity className="w-4 h-4 text-blue-600" />
                    </div>
                </div>
                <div className="text-2xl font-bold text-gray-800">{stats.inProgress}</div>
                <div className="text-xs text-gray-400 mt-1">正在處理的任務</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 text-sm font-medium">已完成</span>
                    <div className="p-1.5 bg-green-100 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                </div>
                <div className="text-2xl font-bold text-gray-800">{stats.done}</div>
                <div className="text-xs text-gray-400 mt-1">累積完成數量</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 text-sm font-medium">完成率</span>
                    <div className="p-1.5 bg-purple-100 rounded-lg">
                        <PieChart className="w-4 h-4 text-purple-600" />
                    </div>
                </div>
                <div className="text-2xl font-bold text-gray-800">{completionRate}%</div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${completionRate}%` }}></div>
                </div>
            </div>
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
                <div className="flex justify-center mb-4">
                    <CircleDashed className="w-12 h-12 text-gray-300" />
                </div>
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
