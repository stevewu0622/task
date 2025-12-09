
import React, { useEffect, useRef } from 'react';
import { Task, TaskStatus, User } from '../types';
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '../constants';
import { Clock, CheckCircle, Eye, Check } from 'lucide-react';
import { format } from 'date-fns';
import { markTaskAsRead } from '../services/storage';

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  currentUser: User | null;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange, currentUser }) => {
  const isAssignedToMe = currentUser && task.assignedTo.includes(currentUser.id);
  const isCreatedByMe = currentUser && task.createdBy === currentUser.id;
  const hasMarkedRead = useRef(false);

  // Auto-Mark as Read logic
  // Only trigger if I am the assignee, I haven't seen it yet, and we haven't already tried in this session
  useEffect(() => {
    if (isAssignedToMe && currentUser && !hasMarkedRead.current) {
        const readBy = task.readBy || [];
        if (!readBy.includes(currentUser.id)) {
            // Mark locally to prevent double firing in React StrictMode
            hasMarkedRead.current = true;
            // Fire API call
            markTaskAsRead(task.id, currentUser.id).catch(err => {
                console.error("Failed to mark read", err);
                hasMarkedRead.current = false; // Reset on failure
            });
        }
    }
  }, [task, isAssignedToMe, currentUser]);

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAssignedToMe) {
        if (task.status === TaskStatus.ASSIGNED) onStatusChange(task.id, TaskStatus.RECEIVED);
        else if (task.status === TaskStatus.RECEIVED) onStatusChange(task.id, TaskStatus.IN_PROGRESS);
        else if (task.status === TaskStatus.IN_PROGRESS) onStatusChange(task.id, TaskStatus.DONE);
    }
  };

  // Logic to determine if "Seen"
  // For simplicity, if ANY assigned user has read it, show seen. 
  // For 1-on-1 assignments, this is accurate.
  const isSeenByAssignee = (task.readBy && task.readBy.length > 0);

  return (
    <div className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col h-full ${
        isAssignedToMe && !isSeenByAssignee ? 'border-l-4 border-l-blue-500' : 'border-gray-200'
    }`}>
      <div className="flex justify-between items-start mb-2 gap-2">
        <h3 className="font-semibold text-gray-800 line-clamp-1 flex-1" title={task.title}>{task.title}</h3>
        <div className="flex gap-1 shrink-0">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${PRIORITY_COLORS[task.priority]}`}>
                {PRIORITY_LABELS[task.priority]}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${STATUS_COLORS[task.status]}`}>
            {STATUS_LABELS[task.status]}
            </span>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-3 line-clamp-3 flex-1">{task.description}</p>
      
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
        <Clock size={14} />
        <span>Due: {format(new Date(task.dueDate), 'yyyy/MM/dd')}</span>
        {new Date(task.dueDate) < new Date() && task.status !== TaskStatus.DONE && (
             <span className="text-red-500 font-bold ml-1">(已過期)</span>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-3 border-t">
        <div className="text-xs text-gray-500 flex items-center gap-2">
            {isCreatedByMe ? (
                <>
                    <span className="text-blue-600 font-medium">To: {task.assignedTo.length} 人</span>
                    {/* Read Receipt Indicator */}
                    {task.status !== TaskStatus.DONE && (
                        isSeenByAssignee ? (
                            <span className="flex items-center text-blue-500 gap-0.5" title="對方已讀取">
                                <Eye size={14} /> <span className="scale-75 origin-left">已讀</span>
                            </span>
                        ) : (
                            <span className="flex items-center text-gray-400 gap-0.5" title="已送達，尚未讀取">
                                <Check size={14} /> <span className="scale-75 origin-left">送達</span>
                            </span>
                        )
                    )}
                </>
            ) : (
                <span>From: {task.createdByName}</span>
            )}
        </div>

        {isAssignedToMe && task.status !== TaskStatus.DONE && (
          <button 
            onClick={handleStatusClick}
            className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
          >
            {task.status === TaskStatus.ASSIGNED && "回覆收到"}
            {task.status === TaskStatus.RECEIVED && "開始處理"}
            {task.status === TaskStatus.IN_PROGRESS && "標記完成"}
          </button>
        )}
         {(task.status === TaskStatus.DONE) && (
             <span className="text-xs text-green-600 flex items-center gap-1 font-medium ml-auto">
                 <CheckCircle size={14}/> 已完成
             </span>
         )}
      </div>
    </div>
  );
};

export default TaskCard;
