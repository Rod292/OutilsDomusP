import React from 'react';

interface SidebarNavProps {
  onCloseSidebar?: () => void;
  consultant?: string | null;
}

declare const SidebarNav: React.FC<SidebarNavProps>;
export default SidebarNav;
