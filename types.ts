
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  passwordHash: string; // In a real app, never store plain text, even in mock
  createdAt: number;
}

export enum TaskStatus {
  ASSIGNED = 'ASSIGNED',       // Assigned, not yet seen/started
  RECEIVED = 'RECEIVED',       // Acknowledged
  IN_PROGRESS = 'IN_PROGRESS', // Working on it
  DONE = 'DONE'                // Completed/Replied
}

export enum TaskPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  createdBy: string; // User ID
  createdByName: string;
  assignedTo: string[]; // Array of User IDs
  status: TaskStatus; // Simplified: Global status.
  priority: TaskPriority;
  dueDate: string; // ISO Date string
  createdAt: number;
  readBy: string[]; // Array of User IDs who have seen this task
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
