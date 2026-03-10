import React from 'react';

export default function DashboardTest() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">Dashboard Test</h1>
        <p className="text-xl text-gray-600 mb-8">This is a test dashboard to verify compilation</p>
        
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Test Content</h2>
          <p className="text-gray-600 mb-4">If you can see this, the dashboard is working!</p>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800">API Test</h3>
              <p className="text-blue-600">Let&rsquo;s test the API endpoint</p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-800">User Test</h3>
              <p className="text-green-600">Demo user should work</p>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-medium text-yellow-800">Indices Test</h3>
              <p className="text-yellow-600">Should show test-file index</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
