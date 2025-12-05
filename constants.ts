
export const STORAGE_KEYS = {
  // Config keys
  GOOGLE_SCRIPT_URL: 'tts_google_script_url',
  CURRENT_USER: 'tts_current_user'
};

// 【重要】請將您的 Google Apps Script Web App URL 貼在下方的引號中
// 例如: "https://script.google.com/macros/s/AKfycbwacnwloJmxQ-JTJr0QE0p3mnkpPBwvVMjh8YcIZTqHbqx694LuRemW_EP2vt6jsBM/exec"
// 如果填寫了這個，使用者就不需要手動設定連線。
export const DEFAULT_GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwacnwloJmxQ-JTJr0QE0p3mnkpPBwvVMjh8YcIZTqHbqx694LuRemW_EP2vt6jsBM/exec"; 

export const POLLING_INTERVAL = 10000; // 10 seconds for checking new tasks

export const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: '已指派',
  RECEIVED: '已收到',
  IN_PROGRESS: '處理中',
  DONE: '已完成/已回覆',
};

export const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: 'bg-red-100 text-red-800 border-red-200',
  RECEIVED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200',
  DONE: 'bg-green-100 text-green-800 border-green-200',
};
