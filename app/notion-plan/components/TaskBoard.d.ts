import React from 'react';
import { Task } from '../types';

interface TaskBoardProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>;
  onDeleteTask: (id: string) => void;
}

declare const TaskBoard: React.FC<TaskBoardProps>;
export default TaskBoard;
