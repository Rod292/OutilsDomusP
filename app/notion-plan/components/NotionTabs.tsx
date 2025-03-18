import React from 'react';
import { CalendarIcon, LayoutIcon, ListIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface NotionTabsProps {
  activeView: 'table' | 'board' | 'calendar';
  onViewChange: (view: 'table' | 'board' | 'calendar') => void;
}

export default function NotionTabs({ activeView, onViewChange }: NotionTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const handleViewChange = (view: 'table' | 'board' | 'calendar') => {
    onViewChange(view);
    
    // Mettre à jour l'URL avec le paramètre activeView
    const consultant = searchParams.get('consultant') || '';
    const assignedFilter = searchParams.get('assignedFilter') || '';
    
    let url = `/notion-plan?consultant=${consultant}&activeView=${view}`;
    if (assignedFilter) {
      url += `&assignedFilter=${assignedFilter}`;
    }
    
    router.push(url);
  };
  
  return (
    <div className="flex items-center border-b mb-4 overflow-x-auto">
      <button
        className={`flex items-center px-3 py-2 text-sm font-medium ${
          activeView === 'table' ? 'border-b-2 border-[#DC0032] text-[#DC0032]' : 'text-gray-600'
        }`}
        onClick={() => handleViewChange('table')}
      >
        <ListIcon className="h-4 w-4 mr-2" />
        Tableau
      </button>
      <button
        className={`flex items-center px-3 py-2 text-sm font-medium ${
          activeView === 'board' ? 'border-b-2 border-[#DC0032] text-[#DC0032]' : 'text-gray-600'
        }`}
        onClick={() => handleViewChange('board')}
      >
        <LayoutIcon className="h-4 w-4 mr-2" />
        Kanban
      </button>
      <button
        className={`flex items-center px-3 py-2 text-sm font-medium ${
          activeView === 'calendar' ? 'border-b-2 border-[#DC0032] text-[#DC0032]' : 'text-gray-600'
        }`}
        onClick={() => handleViewChange('calendar')}
      >
        <CalendarIcon className="h-4 w-4 mr-2" />
        Calendrier
      </button>
    </div>
  );
} 