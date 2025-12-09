
import { Task, User, UserRole, UserStatus, TaskStatus } from '../types';
import { STORAGE_KEYS, DEFAULT_GOOGLE_SCRIPT_URL } from '../constants';

// --- API Helper ---

export const getApiUrl = () => {
  // Priority: 1. LocalStorage (Manual override) 2. Hardcoded Default
  return localStorage.getItem(STORAGE_KEYS.GOOGLE_SCRIPT_URL) || DEFAULT_GOOGLE_SCRIPT_URL;
};

// Generic API call wrapper
const apiCall = async (action: 'READ' | 'CREATE' | 'UPDATE', params: any = {}) => {
  const url = getApiUrl();
  if (!url) throw new Error("API URL not configured");

  try {
    const response = await fetch(url, {
      method: "POST",
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

export const markTaskAsRead = async (taskId: string, userId: string): Promise<void> => {
    // Ideally, we push to the array. 
    // Since Google Sheets JSON update replaces the field, we need to handle this carefully.
    // However, for this simplified architecture, we will fetch, update array, and save back essentially, 
    // OR we rely on the `apiCall` UPDATE logic which merges top-level fields. 
    // The safest way with the current GAS script (which merges `updates`) is to:
    // 1. We can't easily push to an array atomically in the simple GAS script provided without fetching first or sending the whole new array.
    // Optimistic approach: The frontend sends the new array.
    
    // In a real DB, this is an atomic $addToSet. 
    // Here, we have to rely on the frontend knowing the current state.
    
    // NOTE: This runs the risk of race conditions if two people read at the EXACT same time, 
    // but for a small team, it's acceptable.
    
    const tasks = await getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        const currentReadBy = task.readBy || [];
        if (!currentReadBy.includes(userId)) {
            const newReadBy = [...currentReadBy, userId];
            await apiCall('UPDATE', { 
                sheet: 'Tasks', 
                id: taskId, 
                updates: { readBy: newReadBy } 
            });
        }
    }
}

// --- Auth Mock ---

export const loginUser = async (email: string, password: string): Promise<User | null> => {
  const users = await getUsers();
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
