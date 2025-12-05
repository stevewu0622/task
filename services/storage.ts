import { Task, User, UserRole, UserStatus, TaskStatus } from '../types';
import { STORAGE_KEYS } from '../constants';

// --- API Helper ---

const getApiUrl = () => {
  return localStorage.getItem(STORAGE_KEYS.GOOGLE_SCRIPT_URL);
};

// Generic API call wrapper
// We use POST for everything to avoid caching and simplify the GAS side (doPost handles payload better)
const apiCall = async (action: 'READ' | 'CREATE' | 'UPDATE', params: any = {}) => {
  const url = getApiUrl();
  if (!url) throw new Error("API URL not configured");

  try {
    const response = await fetch(url, {
      method: "POST",
      // IMPORTANT: Google Apps Script requires Content-Type to be text/plain to avoid CORS preflight (OPTIONS) requests.
      // If sent as application/json, the browser sends an OPTIONS request first, which GAS rejects.
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({ action, ...params }),
    });

    const result = await response.json();
    if (result.status === 'error') {
      throw new Error(result.message || 'Unknown API Error');
    }
    return result;
  } catch (error) {
    console.error("API Call Failed:", error);
    throw error;
  }
};

// --- User Services ---

export const getUsers = async (): Promise<User[]> => {
  const result = await apiCall('READ', { sheet: 'Users' });
  return result.data || [];
};

export const saveUser = async (user: User): Promise<void> => {
  await apiCall('CREATE', { sheet: 'Users', item: user });
};

export const updateUserStatus = async (userId: string, status: UserStatus): Promise<void> => {
  await apiCall('UPDATE', { 
    sheet: 'Users', 
    id: userId, 
    updates: { status } 
  });
};

export const initializeAdmin = async () => {
  // Logic remains similar: checks exist on frontend/backend boundary
  // With Sheets, usually the first row is what it is. 
  // We can just rely on the first user registered being admin logic in registerUser
};

// --- Task Services ---

export const getTasks = async (): Promise<Task[]> => {
  const result = await apiCall('READ', { sheet: 'Tasks' });
  return result.data || [];
};

export const saveTask = async (task: Task): Promise<void> => {
  await apiCall('CREATE', { sheet: 'Tasks', item: task });
};

export const updateTaskStatus = async (taskId: string, status: TaskStatus): Promise<void> => {
  await apiCall('UPDATE', { 
    sheet: 'Tasks', 
    id: taskId, 
    updates: { status } 
  });
};

export const markTaskAsRead = async (taskId: string): Promise<void> => {
    await apiCall('UPDATE', { 
        sheet: 'Tasks', 
        id: taskId, 
        updates: { isRead: true } 
    });
}

// --- Auth Mock (Logic kept on client side for simplicity in this serverless setup) ---

export const loginUser = async (email: string, password: string): Promise<User | null> => {
  const users = await getUsers();
  // In a real server, we send credentials and get token.
  // Here, we fetch DB and check locally because GAS is just a dumb store.
  const user = users.find(u => u.email === email && u.passwordHash === password); 
  
  if (user) {
    if (user.status !== UserStatus.ACTIVE && user.role !== UserRole.ADMIN) {
      throw new Error("帳號尚未開通或已被拒絕，請聯繫管理員。");
    }
    return user;
  }
  return null;
};

export const registerUser = async (name: string, email: string, password: string): Promise<void> => {
  const users = await getUsers();
  if (users.find(u => u.email === email)) {
    throw new Error("此 Email 已被註冊");
  }

  // First user is Admin, others are Pending
  const isFirstUser = users.length === 0;

  const newUser: User = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash: password,
    role: isFirstUser ? UserRole.ADMIN : UserRole.USER,
    status: isFirstUser ? UserStatus.ACTIVE : UserStatus.PENDING,
    createdAt: Date.now()
  };

  await saveUser(newUser);
};