import React from 'react';
import { Task } from '../types';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id'>) => Promise<void>;
  task?: Task | null;
  onUpdateTask?: (task: Partial<Task> & { id: string }) => Promise<void>;
  onDeleteTask?: (id: string) => void;
}

declare const TaskFormModal: React.FC<TaskFormModalProps>;
export default TaskFormModal;
