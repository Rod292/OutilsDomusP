import React from 'react';
import { Task } from '../types';

interface TaskCalendarProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

declare const TaskCalendar: React.FC<TaskCalendarProps>;
export default TaskCalendar;
