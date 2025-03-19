import TestNotifications from '../test-notifications';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-12">
        <h1 className="text-2xl font-bold mb-8 text-center">Page de Test</h1>
        <TestNotifications />
      </div>
    </div>
  );
} 