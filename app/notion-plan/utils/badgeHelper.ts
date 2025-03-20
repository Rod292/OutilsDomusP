export const getBadgeColor = (type: string) => {
  const colors: Record<string, string> = {
    'newsletter': 'bg-purple-100 text-purple-800 border-purple-200',
    'panneau': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'flyer': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'idée': 'bg-amber-100 text-amber-800 border-amber-200',
    'plan_2d_3d': 'bg-blue-100 text-blue-800 border-blue-200',
    'post_site': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'post_linkedin': 'bg-sky-100 text-sky-800 border-sky-200',
    'post_instagram': 'bg-pink-100 text-pink-800 border-pink-200',
    'post_facebook': 'bg-blue-100 text-blue-800 border-blue-200',
    'appel': 'bg-gray-100 text-gray-800 border-gray-200',
    'sms': 'bg-gray-100 text-gray-800 border-gray-200',
    'email': 'bg-gray-100 text-gray-800 border-gray-200',
    'rdv_physique': 'bg-gray-100 text-gray-800 border-gray-200',
    'rdv_tel': 'bg-gray-100 text-gray-800 border-gray-200',
    'courrier': 'bg-gray-100 text-gray-800 border-gray-200',
    'commentaire': 'bg-gray-100 text-gray-800 border-gray-200',
    'envoi_doc': 'bg-gray-100 text-gray-800 border-gray-200',
    'autre': 'bg-gray-100 text-gray-800 border-gray-200'
  };
  
  return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200';
}; 