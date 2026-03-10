import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

interface IndexFile {
  id: number;
  project_id: string;
  figma_file_key: string;
  file_name: string;
  uploaded_at: string;
  index_data: any;
  user_id: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function DashboardWorking() {
  const router = useRouter();
  const [indices, setIndices] = useState<IndexFile[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('uploaded_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Get user email from localStorage or URL params
  const getUserEmail = (): string | null => {
    if (typeof window !== 'undefined') {
      // Try to get from localStorage first
      const storedUser = localStorage.getItem('figma_web_user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          return userData.email;
        } catch (e) {
          console.error('Error parsing stored user:', e);
        }
      }
      
      // Try to get from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const emailFromUrl = urlParams.get('email');
      if (emailFromUrl) {
        return emailFromUrl;
      }
      
      // For testing purposes, use demo user if no other user is found
      return 'demo@example.com';
    }
    return 'demo@example.com';
  };

  // Add a function to handle demo login
  const handleDemoLogin = () => {
    // Set demo user in localStorage
    const demoUser = {
      email: 'demo@example.com',
      name: 'Demo User',
      provider: 'demo',
      providerId: 'demo_123'
    };
    localStorage.setItem('figma_web_user', JSON.stringify(demoUser));
    window.location.reload();
  };

  const fetchIndices = useCallback(async (page: number = 1) => {
    const userEmail = getUserEmail();
    console.log('Fetching indices for user:', userEmail);
    
    if (!userEmail) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm })
      });

      const url = `/api/get-indices?${params}&userEmail=${encodeURIComponent(userEmail)}`;
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API response:', data);
      console.log('API response data:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        console.log('Setting indices:', data.data);
        console.log('Setting indices (stringified):', JSON.stringify(data.data, null, 2));
        setIndices(data.data);
        setUser(data.user);
        setPagination(data.pagination);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to fetch indices');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching indices:', err);
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder, searchTerm]);

  useEffect(() => {
    fetchIndices(currentPage);
  }, [currentPage, sortBy, sortOrder, fetchIndices]);

  useEffect(() => {
    // Reset to page 1 when search term changes
    setCurrentPage(1);
    const timeoutId = setTimeout(() => {
      fetchIndices(1);
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, fetchIndices]);

  // Add console logs to debug state
  useEffect(() => {
    console.log('Dashboard state:', {
      indices: indices,
      user: user,
      loading: loading,
      error: error,
      pagination: pagination
    });
  }, [indices, user, loading, error, pagination]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && indices.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען אינדקסים...</p>
          <div className="mt-4 space-x-4">
            <button
              onClick={handleDemoLogin}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              התחבר כ-Demo User
            </button>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              חזרה לדף הבית
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Debug: Show current state
  console.log('Dashboard render state:', { loading, indices: indices.length, error, user });
  console.log('Dashboard render state (detailed):', { 
    loading, 
    indicesCount: indices.length, 
    indices: indices,
    error, 
    user 
  });

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">❌</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">שגיאה בטעינת האינדקסים</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={handleDemoLogin}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              התחבר כ-Demo User
            </button>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              חזרה לדף הבית
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">אינדקסי Figma שלי</h1>
              {user && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>שלום,</span>
                  <span className="font-medium">{user.full_name}</span>
                  {user.avatar_url && (
                    <img 
                      src={user.avatar_url} 
                      alt={user.full_name}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              חזרה לדף הבית
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="חיפוש בפרויקטים או שמות קבצים..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="uploaded_at">תאריך העלאה</option>
                <option value="file_name">שם קובץ</option>
                <option value="project_id">מזהה פרויקט</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        {pagination && (
          <div className="text-sm text-gray-600 mb-4">
            מציג {indices.length} מתוך {pagination.totalItems} אינדקסים
            {searchTerm && ` עבור "${searchTerm}"`}
          </div>
        )}

        {/* Indices Grid */}
        {indices.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📁</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">לא נמצאו אינדקסים</h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'נסה לשנות את מונח החיפוש שלך'
                : 'התחיל ליצור אינדקסים ב-Figma plugin שלך'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {indices.map((index) => (
              <div key={index.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {index.file_name}
                    </h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {index.project_id}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">פריימים:</span>
                      <span className="font-medium">{index.index_data?.frameCount || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">תמונות ממוזערות:</span>
                      <span className="font-medium">{index.index_data?.totalThumbnails || 0}</span>
                </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">הועלה:</span>
                      <span className="font-medium">{formatDate(index.uploaded_at)}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <a
                      href={`https://www.figma.com/file/${index.figma_file_key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      פתח ב-Figma
                    </a>
                    <button
                      onClick={() => {
                        // Download index data
                        const dataStr = JSON.stringify(index, null, 2);
                        const dataBlob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(dataBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${index.file_name}-index.json`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      הורד JSON
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 mt-8">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              הקודם
            </button>
            
            <span className="text-sm text-gray-600">
              עמוד {pagination.currentPage} מתוך {pagination.totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              הבא
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
