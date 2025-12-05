import React from 'react';
import { Task, TaskStatus, User } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';
import { Clock, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  currentUser: User | null;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange, currentUser }) => {
  const isAssignedToMe = currentUser && task.assignedTo.includes(currentUser.id);
  const isCreatedByMe = currentUser && task.createdBy === currentUser.id;

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Cycle through statuses if assigned to me
    if (isAssignedToMe) {
        if (task.status === TaskStatus.ASSIGNED) onStatusChange(task.id, TaskStatus.RECEIVED);
        else if (task.status === TaskStatus.RECEIVED) onStatusChange(task.id, TaskStatus.IN_PROGRESS);
        else if (task.status === TaskStatus.IN_PROGRESS) onStatusChange(task.id, TaskStatus.DONE);
    }
  };

  return (
    <div className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow p-4 ${!task.isRead && isAssignedToMe ? 'border-l-4 border-l-blue-500' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-800 line-clamp-1" title={task.title}>{task.title}</h3>
        <span className={`text-xs px-2 py-1 rounded-full border font-medium whitespace-nowrap ${STATUS_COLORS[task.status]}`}>
          {STATUS_LABELS[task.status]}
        </span>
      </div>
      
      <p className="text-sm text-gray-600 mb-3 line-clamp-2 min-h-[2.5em]">{task.description}</p>
      
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
        <Clock size={14} />
        <span>Due: {format(new Date(task.dueDate), 'yyyy/MM/dd')}</span>
        {new Date(task.dueDate) < new Date() && task.status !== TaskStatus.DONE && (
             <span className="text-red-500 font-bold ml-1">(已過期)</span>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-3 border-t">
        <div className="text-xs text-gray-500">
            {isCreatedByMe ? 
                <span className="text-blue-600 font-medium">To: {task.assignedTo.length} 人</span> : 
                <span>From: {task.createdByName}</span>
            }
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
         {isAssignedToMe && task.status === TaskStatus.DONE && (
             <span className="text-xs text-green-600 flex items-center gap-1 font-medium">
                 <CheckCircle size={14}/> 已完成
             </span>
         )}
      </div>
    </div>
  );
};

export default TaskCard;