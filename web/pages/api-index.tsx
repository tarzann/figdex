import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  TextField,
  Alert,
  CircularProgress,
  Checkbox,
  Chip,
  IconButton,
  Tooltip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  ListItemIcon,
  Divider,
  Paper,
  LinearProgress,
  Avatar,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar,
} from '@mui/material';
import { 
  Delete, 
  History, 
  CheckCircle, 
  Error, 
  Schedule, 
  Visibility, 
  VisibilityOff, 
  Refresh as RefreshIcon,
  Link as LinkIcon,
  Folder,
  FolderOpen as FolderOpenIcon,
  ArrowBack as ArrowBackIcon,
  AccountCircle as AccountCircleIcon,
  Search as SearchIcon,
  Storage as StorageIcon,
  Person as PersonIcon,
  Api as ApiIcon,
  ContentCopy as ContentCopyIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  AddCircle,
  Update,
  Add as AddIcon,
  Update as UpdateIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';

interface PageOption {
  id: string;
  name: string;
  frameCount?: number;
  selectable: boolean;
  depth?: number;
}

interface FrameRef {
  id: string;
  type: 'FRAME';
  pageId?: string;
  pageName?: string;
  sectionId?: string;
  sectionName?: string;
  name?: string;
  index: number;
}

interface SavedConnection {
  id: string;
  fileKey: string;
  fileName: string;
  figmaToken: string;
  pages: string[];
  imageQuality: string;
  pageMeta?: PageOption[]; // Store full page metadata including frameCount
  fileThumbnailUrl?: string | null; // Thumbnail URL of the file (from first frame)
}

interface SavedIndex {
  id: string;
  jobId: string;
  fileKey: string;
  fileName: string;
  selectedPages: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  totalFrames?: number;
  currentFrameIndex?: number;
  indexId?: string;
  error?: string;
}

interface IndexFile {
  id: string;
  file_name: string;
  source?: 'Plugin' | 'API';
  uploaded_at: string;
  frame_count?: number;
  index_data?: any;
  _isChunked?: boolean;
  _chunks?: any[];
  figma_file_key?: string;
  project_id?: string;
  _updateCount?: number;
}

// Version tracking - Update this number for each fix/change
const PAGE_VERSION = 'v1.30.13'; // Remove debug console.log statements from UI
const PAGE_VERSION_BUILD_DATE = new Date().toISOString().slice(0, 16).replace('T', ' '); // Auto-generated build timestamp

const imageQualityMap: Record<'low' | 'med' | 'hi', { label: string; scale: number }> = {
  low: { label: 'Low (30%)', scale: 0.3 },
  med: { label: 'Medium (70%)', scale: 0.7 },
  hi: { label: 'High (100%)', scale: 1.0 },
};

function maskTokenSnippet(token: string): string {
  if (!token || token.length < 8) return '••••';
  return token.slice(0, 4) + '••••' + token.slice(-4);
}

function getIndexManagementKey(file: Partial<IndexFile>): string {
  const fileKey = typeof file.figma_file_key === 'string' ? file.figma_file_key.trim() : '';
  const projectId = typeof file.project_id === 'string' ? file.project_id.trim() : '';
  const fileName = typeof file.file_name === 'string' ? file.file_name.trim().toLowerCase() : '';
  return fileKey || projectId || fileName || String(file.id || '');
}

function collapseIndexManagementFiles(files: IndexFile[]): IndexFile[] {
  const grouped = new Map<string, IndexFile>();

  files.forEach((file) => {
    const key = getIndexManagementKey(file);
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        ...file,
        _updateCount: 1,
      });
      return;
    }

    const existingTs = new Date(existing.uploaded_at || 0).getTime();
    const nextTs = new Date(file.uploaded_at || 0).getTime();
    const latest = nextTs >= existingTs ? file : existing;
    const base = nextTs >= existingTs ? existing : file;

    grouped.set(key, {
      ...base,
      ...latest,
      frame_count: Math.max(
        typeof existing.frame_count === 'number' ? existing.frame_count : 0,
        typeof file.frame_count === 'number' ? file.frame_count : 0
      ),
      _updateCount: (existing._updateCount || 1) + 1,
    });
  });

  return Array.from(grouped.values()).sort(
    (a, b) => new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime()
  );
}

export default function ApiIndexPage() {
  const router = useRouter();
  
  // Connection tabs state - dynamic tabs for connections
  const [connectionTabs, setConnectionTabs] = useState<Array<{ id: string; label: string; connectionId: string }>>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  
  // Connection tab state
  const [figmaToken, setFigmaToken] = useState('');
  const [fileKey, setFileKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validated, setValidated] = useState(false);
  const [fileName, setFileName] = useState('');
  const [pageOptions, setPageOptions] = useState<PageOption[]>([]);
  
  // Dialog state for new connection
  const [newConnectionDialogOpen, setNewConnectionDialogOpen] = useState(false);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [imageQuality, setImageQuality] = useState<'low' | 'med' | 'hi'>('med');
  const [showToken, setShowToken] = useState(false);
  
  // Frame counting state
  const [countingFrames, setCountingFrames] = useState(false);
  const [frameCountProgress, setFrameCountProgress] = useState({ current: 0, total: 0 });
  const [frameNodeRefs, setFrameNodeRefs] = useState<FrameRef[]>([]);
  
  // Job state
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<'pending' | 'processing' | 'completed' | 'failed' | null>(null);
  const [jobProgress, setJobProgress] = useState({ current: 0, total: 0 });
  
  // Prevent concurrent processIndexJob calls
  const isProcessingJob = useRef(false);
  
  // Prevent concurrent checkJobStatuses calls
  const isCheckingStatuses = useRef(false);
  const statusCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const longPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkJobStatusesRef = useRef<((jobIds: string[], retryCount?: number) => Promise<void>) | undefined>(undefined);
  
  // Saved connections and indices
  const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([]);
  const [savedIndices, setSavedIndices] = useState<SavedIndex[]>([]);
  
  // State for indexed frame counts per page (used for change detection)
  const [indexedFrameCounts, setIndexedFrameCounts] = useState<Map<string, number>>(new Map());
  
  // Timer state for countdown
  const [timeRemaining, setTimeRemaining] = useState<Map<string, number>>(new Map());

  // Index Management state
  const [indexFiles, setIndexFiles] = useState<IndexFile[]>([]);
  const [loadingIndices, setLoadingIndices] = useState(false);
  const [errorIndices, setErrorIndices] = useState('');
  const [deletingIndex, setDeletingIndex] = useState<string | null>(null);
  // Share functionality removed - sharing is now at gallery level via /gallery page
  const [checkingChanges, setCheckingChanges] = useState<string | null>(null);
  const [changesDialogOpen, setChangesDialogOpen] = useState(false);
  const [changesResult, setChangesResult] = useState<any>(null);
  const [currentCheckingFileKey, setCurrentCheckingFileKey] = useState<string | null>(null);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [figmaTokenInput, setFigmaTokenInput] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);

  // User menu state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // File limits state
  const [fileLimits, setFileLimits] = useState<{
    maxFiles: number | null;
    currentFiles: number;
    remainingFiles: number | null;
    isUnlimited: boolean;
  } | null>(null);
  
  // Load fileKey from query string if provided (e.g., from re-index button)
  useEffect(() => {
    if (router.isReady && router.query.fileKey) {
      const fileKeyFromQuery = router.query.fileKey as string;
      if (fileKeyFromQuery) {
        setFileKey(fileKeyFromQuery);
      }
    }
  }, [router.isReady, router.query.fileKey]);

  // Load file limits
  const loadFileLimits = async () => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    try {
      const response = await fetch('/api/user/limits', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.limits) {
          setFileLimits({
            maxFiles: data.limits.maxFiles,
            currentFiles: data.limits.currentFiles,
            remainingFiles: data.limits.remainingFiles,
            isUnlimited: data.limits.isUnlimited,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load file limits:', error);
    }
  };

  // Load saved connections, indices, and Figma token
  useEffect(() => {
    const loadData = async () => {
      await loadSavedConnections();
      await loadSavedIndices();
      await loadFileLimits();
      
      const storedToken = localStorage.getItem('figma_access_token');
      if (storedToken) {
        setFigmaToken(storedToken);
      }
    };

    loadData();
    
    // Check login status
    const checkLogin = () => {
      if (typeof window !== 'undefined') {
        const userData = localStorage.getItem('figma_web_user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            setIsLoggedIn(true);
            const adminEmails = ['ranmor01@gmail.com'];
            setIsAdmin(adminEmails.includes(user.email));
          } catch {
            setIsLoggedIn(false);
          }
        }
      }
    };
    checkLogin();
  }, []);

  // Load Figma token when dialog opens
  useEffect(() => {
    if (newConnectionDialogOpen) {
      const storedToken = localStorage.getItem('figma_access_token');
      if (storedToken) {
        setFigmaToken(storedToken);
      }
    }
  }, [newConnectionDialogOpen]);

  // Auto-select pages that have been updated (frame count changed)
  useEffect(() => {
    if (pageOptions.length === 0 || indexedFrameCounts.size === 0) return;
    
    const currentConnection = savedConnections.find(conn => conn.id === selectedConnectionId);
    if (!currentConnection) return;

    const pagesWithChanges: string[] = [];
    pageOptions.forEach((page) => {
      // Only check pages that are indexed
      if (!currentConnection.pages?.includes(page.name)) return;
      
      const indexedCount = indexedFrameCounts.get(page.name);
      if (indexedCount !== undefined && page.frameCount !== undefined && indexedCount !== page.frameCount) {
        pagesWithChanges.push(page.id);
      }
    });
    
    if (pagesWithChanges.length > 0) {
      setSelectedPageIds((prev) => {
        // Only add pages that aren't already selected
        const newPages = pagesWithChanges.filter(id => !prev.includes(id));
        if (newPages.length === 0) return prev;
        
        const newSelection = Array.from(new Set([...prev, ...newPages]));
        console.log('🔔 Auto-selected pages with changes:', newPages.length, newPages);
        return newSelection;
      });
    }
  }, [pageOptions, indexedFrameCounts, savedConnections, selectedConnectionId]);

  // Update connection state when switching tabs (but don't reload if already loaded)
  useEffect(() => {
    if (activeTab > 0 && activeTab <= connectionTabs.length) {
      const tab = connectionTabs[activeTab - 1]; // -1 because tab 0 is "Connections"
      // Only update if we're switching to a different connection
      if (selectedConnectionId !== tab.connectionId) {
        const connection = savedConnections.find(conn => conn.id === tab.connectionId);
        if (connection) {
          // Update basic state without triggering full reload
          setSelectedConnectionId(connection.id);
          // Note: Full connection data will be loaded by loadConnection when tab is first opened
        }
      }
    } else if (activeTab === 0) {
      // Clear connection state when switching to Connections tab
      setSelectedConnectionId(null);
      setFileKey('');
      setFigmaToken('');
      setValidated(false);
      setPageOptions([]);
      setSelectedPageIds([]);
      setJobStatus(null);
    }
  }, [activeTab, connectionTabs, savedConnections, selectedConnectionId]);

  // Index Management functions
  const getCurrentUser = () => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('figma_web_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  };

  const loadIndexFiles = async () => {
    try {
      setLoadingIndices(true);
      setErrorIndices('');
      const apiKey = getApiKey();
      if (!apiKey) {
        setErrorIndices('No logged in user found');
        setLoadingIndices(false);
        return;
      }

      const user = getCurrentUser();
      if (!user || !user.email) {
        setErrorIndices('No logged in user found');
        setLoadingIndices(false);
        return;
      }

      const response = await fetch(`/api/get-indices?userEmail=${encodeURIComponent(user.email)}`);
      const data = await response.json();

      if (!data.success) {
        setErrorIndices(data.error || 'Failed to load indices');
        setIndexFiles([]);
        setLoadingIndices(false);
        return;
      }

      if (data.success && Array.isArray(data.data)) {
        setIndexFiles(collapseIndexManagementFiles(data.data));
      } else {
        setIndexFiles([]);
      }
    } catch (err: any) {
      console.error('Error loading index files:', err);
      setErrorIndices(err.message || 'Failed to load indices');
      setIndexFiles([]);
    } finally {
      setLoadingIndices(false);
    }
  };

  // Load indices when Index Management tab is active
  useEffect(() => {
    if (activeTab === connectionTabs.length + 1) { // Index Management is before History
      loadIndexFiles();
    }
  }, [activeTab, connectionTabs.length]);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('figma_web_user');
    setIsLoggedIn(false);
    setIsAdmin(false);
    handleUserMenuClose();
    router.push('/');
  };

  const handleCopyApiKey = async () => {
    if (typeof window === 'undefined') return;
    const userData = localStorage.getItem('figma_web_user');
    if (!userData) {
      alert('No user found');
      return;
    }
    try {
      const user = JSON.parse(userData);
      if (user && user.api_key) {
        try {
          await navigator.clipboard.writeText(user.api_key);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          alert('API Key copied to clipboard!');
        } catch (err) {
          console.error('Failed to copy API key:', err);
          const textArea = document.createElement('textarea');
          textArea.value = user.api_key;
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            alert('API Key copied to clipboard!');
          } catch (fallbackErr) {
            console.error('Fallback copy failed:', fallbackErr);
            alert('Failed to copy API key');
          }
          document.body.removeChild(textArea);
        }
      } else {
        alert('No API key found for this user');
      }
    } catch (err) {
      console.error('Failed to parse user data:', err);
      alert('Failed to copy API key');
    }
  };

  // Calculate estimated time remaining based on processing speed
  const calculateEstimatedTime = (index: SavedIndex): number | null => {
    if (index.status !== 'processing' || !index.totalFrames || index.currentFrameIndex === undefined) {
      return null;
    }
    
    const processed = index.currentFrameIndex;
    const remaining = index.totalFrames - processed;
    
    if (processed === 0 || remaining <= 0) {
      return null;
    }
    
    // Estimate: ~2-3 seconds per frame (conservative estimate)
    // Adjust based on actual processing speed if we have timing data
    const avgTimePerFrame = 2.5; // seconds
    const estimatedSeconds = remaining * avgTimePerFrame;
    
    return estimatedSeconds;
  };

  // Format time remaining as countdown (MM:SS)
  const formatTimeRemaining = (seconds: number | null): string => {
    if (seconds === null || seconds <= 0) {
      return 'Calculating...';
    }
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get API key from localStorage
  const getApiKey = (): string | null => {
    const stored = localStorage.getItem('figma_web_user');
    if (!stored) return null;
    try {
      const user = JSON.parse(stored);
      return user.api_key || null;
    } catch {
      return null;
    }
  };

  // Update index in API - wrapped in useCallback to avoid dependency issues
  const updateIndexInAPI = useCallback(async (id: string, updates: Partial<SavedIndex>): Promise<boolean> => {
    const apiKey = getApiKey();
    if (!apiKey) return false;

    try {
      const response = await fetch('/api/saved-indices', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ id, ...updates }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to update index in API:', error);
      return false;
    }
  }, []);

  // Update connection with indexed pages (defined before checkJobStatuses to avoid hoisting issues)
  const updateConnectionWithIndexedPages = useCallback(async (fileKey: string, indexedPageNames: string[], jobId?: string) => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    try {
      // Find the connection for this fileKey
      const connection = savedConnections.find(conn => conn.fileKey === fileKey);
      if (!connection) {
        console.log('📝 No saved connection found for fileKey:', fileKey);
        return;
      }

      // Validate that indexedPageNames is an array with valid page names
      if (!Array.isArray(indexedPageNames) || indexedPageNames.length === 0) {
        console.log('⚠️ No pages to update in connection (empty array)');
        return;
      }

      console.log('🔄 Updating connection with indexed pages:', {
        fileKey,
        existingPages: connection.pages || [],
        newPages: indexedPageNames,
      });

      // Merge new pages with existing ones (avoid duplicates)
      const existingPages = connection.pages || [];
      const existingPagesSet = new Set(existingPages);
      
      // Find truly new pages (not already in existingPages)
      const newPagesOnly = indexedPageNames.filter(pageName => !existingPagesSet.has(pageName));
      
      if (newPagesOnly.length === 0) {
        console.log('⚠️ No new pages to add - all pages already indexed:', {
          existing: existingPages.length,
          requested: indexedPageNames.length,
        });
        return;
      }

      const mergedPages = Array.from(new Set([...existingPages, ...newPagesOnly]));

      console.log('📊 Merged pages:', {
        existing: existingPages.length,
        new: newPagesOnly.length,
        total: mergedPages.length,
        newPagesOnly,
      });

      const response = await fetch('/api/saved-connections', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          id: connection.id,
          pages: mergedPages,
        }),
      });

      if (response.ok) {
        console.log('✅ Connection updated with indexed pages:', mergedPages);
        await loadSavedConnections(); // Reload to show updated stats
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to update connection:', errorText);
      }
    } catch (error) {
      console.error('Failed to update connection with indexed pages:', error);
    }
  }, [savedConnections]);

  const checkJobStatuses = useCallback(async (jobIds: string[], retryCount = 0) => {
    if (!jobIds || jobIds.length === 0) return;
    
    // Prevent concurrent calls
    if (isCheckingStatuses.current) {
      console.log('⏸️ checkJobStatuses already running, skipping...');
      return;
    }

    isCheckingStatuses.current = true;
    
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        console.warn('No API key available for job status check');
        isCheckingStatuses.current = false;
        return;
      }

      // Add timeout to fetch request (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('/api/get-job-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ jobIds }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('Failed to fetch job statuses:', response.status);
        isCheckingStatuses.current = false;
        
        // Retry with exponential backoff (max 3 retries)
        if (retryCount < 3) {
          const retryDelay = Math.min(60000 * Math.pow(2, retryCount), 300000); // 60s, 120s, 240s, max 300s
          console.log(`🔄 Retrying job status check in ${retryDelay / 1000}s (attempt ${retryCount + 1}/3)`);
          if (statusCheckTimeoutRef.current) {
            clearTimeout(statusCheckTimeoutRef.current);
          }
          statusCheckTimeoutRef.current = setTimeout(() => {
            isCheckingStatuses.current = false;
            checkJobStatuses(jobIds, retryCount + 1);
          }, retryDelay);
        } else {
          console.error('❌ Max retries reached for job status check');
        }
        return;
      }

      const data = await response.json();
      if (data.success && data.statuses) {
        setSavedIndices((prev) => {
          const updated = prev.map((idx) => {
            const statusData = data.statuses.find((s: any) => s.jobId === idx.jobId);
            if (statusData) {
              const updatedIndex = {
                ...idx,
                status: statusData.status as 'pending' | 'processing' | 'completed' | 'failed',
                totalFrames: statusData.totalFrames || idx.totalFrames || 0,
                currentFrameIndex: statusData.nextFrameIndex || idx.currentFrameIndex || 0,
                error: statusData.error || idx.error,
                indexId: statusData.indexId || idx.indexId,
              };

              if (statusData.status === 'completed' && !idx.completedAt) {
                return {
                  ...updatedIndex,
                  completedAt: new Date().toISOString(),
                };
              }

              return updatedIndex;
            }
            return idx;
          });

          // Only update to API if there's a significant change (status change or progress > 5%)
          // This reduces unnecessary DB updates by ~70%
          updated.forEach((idx) => {
            const original = prev.find((p) => p.id === idx.id);
            if (original) {
              const statusChanged = original.status !== idx.status;
              const progressChanged = Math.abs((idx.currentFrameIndex || 0) - (original.currentFrameIndex || 0)) > (idx.totalFrames || 1) * 0.05; // > 5% change
              const errorChanged = original.error !== idx.error;
              const indexIdChanged = original.indexId !== idx.indexId;
              
              // Only update if there's a significant change
              if (statusChanged || progressChanged || errorChanged || indexIdChanged) {
                updateIndexInAPI(idx.id, idx).catch(console.error);
              }
            }
          });

          return updated;
        });

        // Update current job status/progress in UI
        if (jobId) {
          const statusData = data.statuses.find((s: any) => s.jobId === jobId);
          if (statusData) {
            setJobStatus(statusData.status as 'pending' | 'processing' | 'completed' | 'failed');
            setJobProgress({
              current: statusData.nextFrameIndex || 0,
              total: statusData.totalFrames || jobProgress.total || 0,
            });
            
            // If job completed, update the connection automatically with indexed pages
            // Use selectedPages from saved index entry (has only selected pages) instead of job (has all pages)
            if (statusData.status === 'completed' && statusData.fileKey) {
              // Find the saved index entry to get the actual selected pages (only the ones user selected)
              const savedIndex = savedIndices.find(idx => idx.jobId === statusData.jobId);
              const actualSelectedPages = savedIndex?.selectedPages || statusData.selectedPages || [];
              
              console.log('🎯 Job completed, updating connection with pages:', {
                fileKey: statusData.fileKey,
                jobId: statusData.jobId,
                selectedPagesFromJob: statusData.selectedPages?.length || 0,
                selectedPagesFromSavedIndex: savedIndex?.selectedPages?.length || 0,
                using: actualSelectedPages,
              });
              
              // Only update if we have valid page names (not empty array)
              if (Array.isArray(actualSelectedPages) && actualSelectedPages.length > 0) {
                updateConnectionWithIndexedPages(statusData.fileKey, actualSelectedPages);
              } else {
                console.log('⚠️ Skipping connection update: selectedPages is empty or invalid');
              }
            }
          }
        }

        // Check if there are still active jobs - but don't schedule another check here
        // The useEffect interval will handle it
        const stillActive = data.statuses.filter(
          (s: any) => s.status === 'pending' || s.status === 'processing'
        );
        console.log(`📊 Job status check complete: ${stillActive.length} active jobs remaining`);
      }
      
      isCheckingStatuses.current = false;
    } catch (error: any) {
      console.error('Error checking job statuses:', error);
      isCheckingStatuses.current = false;
      
      // Check if it's a network error or timeout
      const isNetworkError = 
        error.name === 'AbortError' ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError') ||
        error.message?.includes('timeout') ||
        error.message?.includes('ERR_NETWORK_IO_SUSPENDED');
      
      // Retry with exponential backoff on network errors (max 3 retries)
      if (isNetworkError && retryCount < 3) {
        const retryDelay = Math.min(60000 * Math.pow(2, retryCount), 300000); // 60s, 120s, 240s, max 300s
        console.log(`🔄 Retrying job status check after network error in ${retryDelay / 1000}s (attempt ${retryCount + 1}/3)`);
        if (statusCheckTimeoutRef.current) {
          clearTimeout(statusCheckTimeoutRef.current);
        }
        statusCheckTimeoutRef.current = setTimeout(() => {
          isCheckingStatuses.current = false;
          checkJobStatuses(jobIds, retryCount + 1);
        }, retryDelay);
      } else if (!isNetworkError || retryCount >= 3) {
        console.error('❌ Max retries reached or non-network error:', error.message || error);
      }
    }
  }, [jobId, jobProgress.total, updateIndexInAPI, updateConnectionWithIndexedPages, savedIndices]);

  // Update ref whenever checkJobStatuses changes
  useEffect(() => {
    checkJobStatusesRef.current = checkJobStatuses;
  }, [checkJobStatuses]);

  // Calculate active job IDs - only recalculate when job IDs or statuses actually change
  const activeJobIdsStr = useMemo(() => {
    return savedIndices
      .filter((idx) => (idx.status === 'processing' || idx.status === 'pending') && idx.jobId)
      .map((idx) => idx.jobId!)
      .sort()
      .join(','); // Sort and join for stable comparison
  }, [savedIndices.map(idx => `${idx.jobId || ''}_${idx.status}`).join(',')]);
  
  const activeJobIds = useMemo(() => {
    return activeJobIdsStr ? activeJobIdsStr.split(',').filter(Boolean) : [];
  }, [activeJobIdsStr]);

  // Auto-poll job statuses for active jobs in history
  useEffect(() => {
    // Clear any existing intervals first to prevent duplicates
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (longPollIntervalRef.current) {
      clearInterval(longPollIntervalRef.current);
      longPollIntervalRef.current = null;
    }
    
    if (activeJobIds.length === 0) {
      // Clear any pending status checks if no active jobs
      if (statusCheckTimeoutRef.current) {
        clearTimeout(statusCheckTimeoutRef.current);
        statusCheckTimeoutRef.current = null;
      }
      return;
    }
    
    // Start polling for active jobs with longer interval to reduce server load
    // Increased to 30s to reduce API calls by ~50%
    pollIntervalRef.current = setInterval(() => {
      if (!isCheckingStatuses.current && checkJobStatusesRef.current) {
        checkJobStatusesRef.current(activeJobIds);
      }
    }, 30000); // Poll every 30 seconds (optimized for cost reduction)
    
    // Long interval check (5 minutes) to catch stuck jobs
    longPollIntervalRef.current = setInterval(() => {
      if (!isCheckingStatuses.current && activeJobIds.length > 0 && checkJobStatusesRef.current) {
        console.log('🔄 Long interval check for active jobs:', activeJobIds.length);
        checkJobStatusesRef.current(activeJobIds);
      }
    }, 300000); // Every 5 minutes
    
    // Initial check (only if not already checking and after a short delay to batch requests)
    if (!isCheckingStatuses.current && checkJobStatusesRef.current) {
      // Add small delay to prevent immediate call on mount
      const initialCheckTimeout = setTimeout(() => {
        if (!isCheckingStatuses.current && checkJobStatusesRef.current) {
          checkJobStatusesRef.current(activeJobIds);
        }
      }, 2000); // Wait 2 seconds before first check
      
      return () => {
        clearTimeout(initialCheckTimeout);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        if (longPollIntervalRef.current) {
          clearInterval(longPollIntervalRef.current);
          longPollIntervalRef.current = null;
        }
        if (statusCheckTimeoutRef.current) {
          clearTimeout(statusCheckTimeoutRef.current);
          statusCheckTimeoutRef.current = null;
        }
      };
    }
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (longPollIntervalRef.current) {
        clearInterval(longPollIntervalRef.current);
        longPollIntervalRef.current = null;
      }
      if (statusCheckTimeoutRef.current) {
        clearTimeout(statusCheckTimeoutRef.current);
        statusCheckTimeoutRef.current = null;
      }
    };
  }, [activeJobIdsStr]); // Only recreate interval when activeJobIds actually change

  // Update countdown timer every second for processing jobs
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTimeRemaining = new Map<string, number>();
        
        savedIndices.forEach((index) => {
          if (index.status === 'processing') {
            const estimated = calculateEstimatedTime(index);
            if (estimated !== null) {
              const current = prev.get(index.id);
              // If we have a current value, decrement it. Otherwise, use estimated.
              const updated = current !== undefined ? Math.max(0, current - 1) : estimated;
              newTimeRemaining.set(index.id, updated);
            }
          }
        });
        
        return newTimeRemaining;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [savedIndices, checkJobStatuses]);

  // Load saved connections from API
  const loadSavedConnections = async () => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    try {
      const response = await fetch('/api/saved-connections', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.connections) {
          setSavedConnections(data.connections);
        }
      }
    } catch (error) {
      console.error('Failed to load saved connections:', error);
    }
  };

  // Save connection to API
  const saveConnectionToAPI = async (connection: Omit<SavedConnection, 'id'>): Promise<SavedConnection | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    try {
      const response = await fetch('/api/saved-connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(connection),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.connection) {
          return data.connection;
        }
      } else {
        // Handle file limit error
        try {
          const errorText = await response.text();
          if (errorText) {
            const errorData = JSON.parse(errorText);
            if (errorData && errorData.code === 'FILE_LIMIT_REACHED') {
              const errorMessage = errorData.error || 'File limit reached';
              setError(errorMessage);
              await loadFileLimits(); // Refresh limits to show updated count
              // Create error object with message property
              const fileLimitError = { message: errorMessage };
              throw fileLimitError;
            }
          }
        } catch (jsonError: any) {
          // If JSON parsing fails, ignore and continue
          // But if it's our file limit error, re-throw it
          if (jsonError && jsonError.message && jsonError.message.includes('File limit')) {
            throw jsonError;
          }
        }
      }
    } catch (error: any) {
      console.error('Failed to save connection:', error);
      // Re-throw if it's a file limit error so caller can handle it
      if (error && error.message && error.message.includes('File limit')) {
        throw error;
      }
    }
    return null;
  };

  // Delete connection from API
  const deleteConnectionFromAPI = async (id: string): Promise<boolean> => {
    const apiKey = getApiKey();
    if (!apiKey) return false;

    try {
      const response = await fetch(`/api/saved-connections?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      const success = response.ok;
      if (success) {
        await loadFileLimits(); // Refresh file limits after deletion
      }
      return success;
    } catch (error) {
      console.error('Failed to delete connection:', error);
      return false;
    }
  };

  // Calculate connection statistics
  const getConnectionStats = (conn: SavedConnection) => {
    const pageMeta = conn.pageMeta || [];
    // If we have pageMeta array (even if empty), use it
    const totalPages = pageMeta.length;
    const emptyPages = pageMeta.filter(p => !p.frameCount || p.frameCount === 0).length;
    // Pages that were selected for indexing (from saved connection)
    const indexedPages = conn.pages ? conn.pages.length : 0;
    
    return {
      totalPages,
      emptyPages,
      indexedPages,
      hasPageMeta: pageMeta.length > 0 || (conn.pageMeta !== null && conn.pageMeta !== undefined),
    };
  };

  // Load saved indices from API
  const loadSavedIndices = async () => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    try {
      const response = await fetch('/api/saved-indices', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.indices) {
          console.log('📋 Loaded saved indices:', data.indices.length, 'items');
          console.log('📋 Sample index:', data.indices[0] ? {
            id: data.indices[0].id,
            jobId: data.indices[0].jobId,
            indexId: data.indices[0].indexId,
            status: data.indices[0].status,
          } : 'No indices');
          setSavedIndices(data.indices);
        }
      }
    } catch (error) {
      console.error('Failed to load saved indices:', error);
    }
  };

  // Get indexed frame counts per page from the most recent completed index for a fileKey
  const getIndexedFrameCounts = useCallback(async (fileKey: string): Promise<Map<string, number>> => {
    const apiKey = getApiKey();
    if (!apiKey) return new Map();

    try {
      // Find the most recent completed index for this fileKey
      const completedIndex = savedIndices
        .filter(idx => idx.fileKey === fileKey && idx.status === 'completed' && idx.indexId)
        .sort((a, b) => {
          const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return bTime - aTime; // Most recent first
        })[0];

      if (!completedIndex?.indexId) {
        return new Map();
      }

      // Fetch index data to get frame counts per page
      const response = await fetch(`/api/get-index-data?indexId=${completedIndex.indexId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.warn('⚠️ Failed to fetch index data for frame count comparison');
        return new Map();
      }

      const data = await response.json();
      if (!data.success || !data.data?.index_data || !Array.isArray(data.data.index_data)) {
        return new Map();
      }

      // Extract frame counts per page name
      const frameCountsMap = new Map<string, number>();
      data.data.index_data.forEach((page: any) => {
        if (page.name && Array.isArray(page.frames)) {
          // Sum frames from main frames array
          let frameCount = page.frames.length;
          // Also check sections if they exist
          if (Array.isArray(page.sections)) {
            page.sections.forEach((section: any) => {
              if (Array.isArray(section.frames)) {
                frameCount += section.frames.length;
              }
            });
          }
          frameCountsMap.set(page.name, frameCount);
        }
      });

      return frameCountsMap;
    } catch (error) {
      console.error('❌ Error getting indexed frame counts:', error);
      return new Map();
    }
  }, [savedIndices]);

  // Validate connection
  const validateConnection = async (overrideToken?: string, overrideFileKey?: string) => {
    console.log('🔍 validateConnection called with:', {
      hasOverrideToken: !!overrideToken,
      hasOverrideFileKey: !!overrideFileKey,
      hasStateToken: !!figmaToken,
      hasStateFileKey: !!fileKey,
    });
    
    const tokenToUse = overrideToken || figmaToken;
    const fileKeyToUse = overrideFileKey || fileKey;
    
    console.log('🔍 Using values:', {
      hasToken: !!tokenToUse,
      hasFileKey: !!fileKeyToUse,
      fileKeyLength: fileKeyToUse?.length || 0,
    });
    
    if (!tokenToUse || !fileKeyToUse) {
      const missing = [];
      if (!tokenToUse) missing.push('Figma token');
      if (!fileKeyToUse) missing.push('File key');
      console.error('❌ Missing required fields:', missing);
      setError(`Please provide both Figma token and file key/URL. Missing: ${missing.join(', ')}`);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setValidated(false);
    setPageOptions([]);
    setSelectedPageIds([]);

    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        setError('Please log in to use this feature');
        return;
      }

      // Extract file key from URL if needed
      let extractedFileKey = fileKeyToUse.trim();
      const urlMatch = extractedFileKey.match(/figma\.com\/(file|proto)\/([a-zA-Z0-9]+)/);
      if (urlMatch) {
        extractedFileKey = urlMatch[2];
      }

      console.log('📡 Sending validation request...');
      const response = await fetch('/api/create-index-from-figma', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          figmaToken: tokenToUse,
          fileKey: extractedFileKey,
          validateOnly: true,
        }),
      });

      console.log('📡 Validation response status:', response.status);
      
      if (!response.ok) {
        let errorData;
        try {
          const text = await response.text();
          errorData = JSON.parse(text);
        } catch {
          errorData = { error: `Server error (${response.status})` };
        }
        const errorMessage = errorData.error || 'Failed to validate connection';
        console.error('❌ Validation failed:', errorMessage);
        throw { message: errorMessage } as Error;
      }

      const data = await response.json();
      console.log('✅ Validation successful:', {
        fileName: data.fileName,
        pageCount: data.pageMeta?.length || 0,
      });
      
      const receivedFileName = data.fileName || 'Untitled';
      const receivedFileKey = data.fileKey || extractedFileKey;
      
      // Update state with validated values
      if (overrideToken) {
        setFigmaToken(overrideToken);
      }
      if (overrideFileKey) {
        setFileKey(receivedFileKey);
      } else {
        setFileKey(receivedFileKey);
      }
      
      setFileName(receivedFileName);
      const initialPageOptions = data.pageMeta || [];
      setPageOptions(initialPageOptions);
      setValidated(true);
      setSuccess(`✅ Connected to "${receivedFileName}"`);

      if (tokenToUse) {
        localStorage.setItem('figma_access_token', tokenToUse);
      }

      // Load indexed frame counts if connection exists
      const existingConnection = savedConnections.find(conn => conn.fileKey === receivedFileKey);
      if (existingConnection) {
        const indexedCounts = await getIndexedFrameCounts(receivedFileKey);
        setIndexedFrameCounts(indexedCounts);
      } else {
        setIndexedFrameCounts(new Map()); // Clear if no connection
      }

      // Automatically start counting frames after validation
      if (initialPageOptions.length > 0 && receivedFileKey && tokenToUse) {
        // Use requestAnimationFrame and setTimeout to ensure state is updated and UI is ready
        requestAnimationFrame(() => {
          setTimeout(() => {
            console.log('🚀 Auto-starting frame count after validation...', {
              pageCount: initialPageOptions.length,
              hasFileKey: !!receivedFileKey,
              hasToken: !!tokenToUse,
            });
            // Pass the values directly to avoid state timing issues
            countFramesWithValues(initialPageOptions, receivedFileKey, tokenToUse);
          }, 500);
        });
      }

    } catch (e: any) {
      console.error('validateConnection error:', e);
      setError(e.message || 'Failed to validate connection');
    } finally {
      setLoading(false);
    }
  };

  // Save connection
  const saveConnection = async (): Promise<boolean> => {
    if (!fileKey || !figmaToken || !fileName) {
      setError('Missing required fields: File Key, Token, or File Name');
      return false;
    }

    const newConnection = {
      fileKey,
      fileName,
      figmaToken,
      pages: selectedPageIds.length > 0 
        ? pageOptions.filter((p) => selectedPageIds.includes(p.id)).map((p) => p.name)
        : [], // Save empty array if no pages selected
      imageQuality: imageQualityMap[imageQuality].scale.toString(),
      pageMeta: pageOptions.length > 0 ? pageOptions : [], // Save full page metadata including frameCount (even if empty)
    };

    try {
      const saved = await saveConnectionToAPI(newConnection);
      if (saved) {
        await loadSavedConnections();
        await loadFileLimits(); // Refresh file limits after saving
        setSuccess('Connection saved successfully');
        setError(''); // Clear any previous errors
        return true;
      } else {
        setError('Failed to save connection');
        setSuccess(''); // Clear any previous success
        return false;
      }
    } catch (error: any) {
      // Error already set in saveConnectionToAPI for file limit errors
      if (!error.message || !error.message.includes('File limit')) {
        setError(error.message || 'Failed to save connection');
      }
      setSuccess(''); // Clear any previous success
      return false;
    }
  };

  // Load connection - opens in a new tab
  const loadConnection = async (connection: SavedConnection) => {
    // Validate connection data before proceeding
    if (!connection.figmaToken || !connection.fileKey) {
      setError('Connection data is incomplete. Please check the saved connection.');
      return;
    }
    
    // Check if tab already exists for this connection
    const existingTabIndex = connectionTabs.findIndex(tab => tab.connectionId === connection.id);
    if (existingTabIndex !== -1) {
      // Switch to existing tab
      setActiveTab(existingTabIndex + 1); // +1 because tab 0 is "Connections"
      return;
    }
    
    // Add new tab for this connection
    const newTab = {
      id: `connection-${connection.id}`,
      label: connection.fileName.length > 20 ? `${connection.fileName.substring(0, 20)}...` : connection.fileName,
      connectionId: connection.id,
    };
    setConnectionTabs(prev => {
      const updated = [...prev, newTab];
      // Set active tab to the new tab (index is length of previous array + 1, since tab 0 is "Connections")
      setActiveTab(prev.length + 1);
      return updated;
    });
    
    // First update state
    setFileKey(connection.fileKey);
    setFigmaToken(connection.figmaToken);
    setFileName(connection.fileName);
    setImageQuality(
      connection.imageQuality === '0.3' ? 'low' :
      connection.imageQuality === '0.7' ? 'med' : 'hi'
    );
    setSelectedConnectionId(connection.id);
    setValidated(false);
    setPageOptions([]);
    setSelectedPageIds([]);
    setError('');
    setSuccess('');
    setLoading(false); // Make sure loading is false
    
    // Load indexed frame counts for this connection
    const indexedCounts = await getIndexedFrameCounts(connection.fileKey);
    setIndexedFrameCounts(indexedCounts);
    
    // Automatically validate connection after loading
    // Pass values directly to avoid state update timing issues
    // Use requestAnimationFrame to ensure DOM is ready, then setTimeout for state
    requestAnimationFrame(() => {
      setTimeout(() => {
        console.log('🔄 Auto-validating connection with values:', {
          hasToken: !!connection.figmaToken,
          hasFileKey: !!connection.fileKey,
        });
        validateConnection(connection.figmaToken, connection.fileKey);
      }, 100);
    });
  };

  // Delete connection
  const handleDeleteConnection = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this connection?')) {
      const success = await deleteConnectionFromAPI(id);
      if (success) {
        await loadSavedConnections();
        // Remove tab if it exists
        const tabIndex = connectionTabs.findIndex(tab => tab.connectionId === id);
        if (tabIndex !== -1) {
          const newTabs = connectionTabs.filter((_, i) => i !== tabIndex);
          setConnectionTabs(newTabs);
          // If deleting active tab, switch to Connections tab
          if (activeTab === tabIndex + 1) {
            setActiveTab(0);
          } else if (activeTab > tabIndex + 1) {
            // Adjust active tab index if deleting a tab before it
            setActiveTab(activeTab - 1);
          }
        }
        if (selectedConnectionId === id) {
          setSelectedConnectionId(null);
          setFileKey('');
          setFigmaToken('');
          setValidated(false);
          setPageOptions([]);
        }
      }
    }
  };

  // Handle page toggle
  const handlePageToggle = (pageId: string) => {
    setSelectedPageIds((prev) =>
      prev.includes(pageId)
        ? prev.filter((id) => id !== pageId)
        : [...prev, pageId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    const selectableIds = pageOptions.filter((p) => p.selectable).map((p) => p.id);
    setSelectedPageIds(selectableIds);
  };

  // Handle deselect all
  const handleDeselectAll = () => {
    setSelectedPageIds([]);
  };

  // Mark job as failed (UI action)
  const handleFailJob = async (jobId: string) => {
    if (!jobId) return;
    if (!window.confirm('Mark this job as failed?')) return;
    try {
      const res = await fetch('/api/jobs/fail-stuck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobIds: [jobId] }),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error('❌ fail-stuck failed:', txt);
        setError('Failed to mark job as failed');
        return;
      }
      setSavedIndices((prev) =>
        prev.map((idx) =>
          idx.jobId === jobId ? { ...idx, status: 'failed', error: 'Manually marked as failed' } : idx
        )
      );
    } catch (e: any) {
      console.error('❌ fail-stuck error:', e);
      setError('Failed to mark job as failed');
    }
  };

  // Delete job (and its index)
  const handleDeleteJob = async (index: SavedIndex) => {
    if (!window.confirm('Delete this job and its index?')) return;
    
    // Optimistically remove from UI
    setSavedIndices((prev) => prev.filter((idx) => idx.id !== index.id));
    
    try {
      const res = await fetch('/api/jobs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          jobId: index.jobId || undefined, 
          indexId: index.id, 
          deleteIndex: true 
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        console.error('❌ delete job failed:', data);
        // Even if API fails, we've already removed from UI
        // Re-add it if we want to show an error, but usually we just let it go
        if (res.status !== 404) {
          // Only show error for non-404 (server errors)
          setError('Failed to delete job (but removed from list)');
        }
        return;
      }
      
      // If index was deleted, reload indexed frame counts to reflect the deletion
      // This ensures that pages no longer show as indexed if their index was deleted
      if (index.fileKey) {
        const indexedCounts = await getIndexedFrameCounts(index.fileKey);
        setIndexedFrameCounts(indexedCounts);
        console.log('🔄 Reloaded indexed frame counts after deletion');
      }
    } catch (e: any) {
      console.error('❌ delete job error:', e);
      setError('Failed to delete job');
    }
  };

  // Save index to API
  const saveIndexToAPI = async (index: Omit<SavedIndex, 'id'>): Promise<SavedIndex | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    try {
      const response = await fetch('/api/saved-indices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(index),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.index) {
          return data.index;
        }
      }
    } catch (error) {
      console.error('Failed to save index to API:', error);
    }
    return null;
  };

  // Process index job (fire and forget)
  const processIndexJob = async (jobId: string) => {
    // Prevent concurrent calls
    if (isProcessingJob.current) {
      console.log('⏸️ processIndexJob already running, skipping...');
      return;
    }
    
    const apiKey = getApiKey();
    if (!apiKey || !figmaToken) {
      console.error('❌ Cannot process job: missing API key or token');
      return;
    }

    isProcessingJob.current = true;
    console.log('📤 Sending process-index-job request for job:', jobId);
    
    try {
      const response = await fetch('/api/process-index-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ 
          jobId,
          figmaToken, // Required by process-index-job endpoint
        }),
      });
      
      console.log('📡 process-index-job response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ process-index-job response:', {
          success: data.success,
          status: data.status,
          progress: data.progress,
          nextFrameIndex: data.nextFrameIndex,
          totalFrames: data.totalFrames,
        });

        // Update UI state with latest status/progress
        setJobStatus(data.status as 'pending' | 'processing' | 'completed' | 'failed');
        setJobProgress({
          current: data.nextFrameIndex || 0,
          total: data.totalFrames || jobProgress.total || 0,
        });

        // Note: Don't update connection here - let checkJobStatuses handle it
        // to avoid duplicate calls and ensure we use the correct selectedPages from job data

        // If still processing, schedule another run after a longer delay to reduce server load
        // Increased to 20s to reduce API calls by ~50%
        if (data.status === 'processing') {
          console.log('⏳ Job still processing, scheduling another processIndexJob call in 20s...');
          setTimeout(() => {
            isProcessingJob.current = false;
            processIndexJob(jobId).catch((err) => {
              console.error('❌ processIndexJob retry failed:', err);
              isProcessingJob.current = false;
            });
          }, 20000); // Optimized: 20s interval to reduce costs
        }
        // If pending (edge case), also retry
        else if (data.status === 'pending') {
          console.log('⏳ Job pending, retrying processIndexJob in 20s...');
          setTimeout(() => {
            isProcessingJob.current = false;
            processIndexJob(jobId).catch((err) => {
              console.error('❌ processIndexJob retry failed:', err);
              isProcessingJob.current = false;
            });
          }, 20000); // Optimized: 20s interval to reduce costs
        } else {
          // Job completed or failed - allow new calls
          isProcessingJob.current = false;
        }
      } else {
        const errorText = await response.text();
        console.error('❌ process-index-job failed:', response.status, errorText);
        isProcessingJob.current = false;
      }
    } catch (error) {
      console.error('❌ Failed to trigger job processing:', error);
      isProcessingJob.current = false;
    }
  };

  // Create index
  const createIndex = async () => {
    if (!validated || selectedPageIds.length === 0) {
      setError('Please validate connection and select at least one page');
      return;
    }

    // Check total frame count and warn about very large indices
    const selectedPages = pageOptions.filter((p) => selectedPageIds.includes(p.id));
    const totalFrames = selectedPages.reduce((sum, page) => sum + (page.frameCount || 0), 0);
    const pageFrameCounts = selectedPages.map((p) => ({
      pageId: p.id,
      frameCount: p.frameCount || 0,
    }));
    const selectedFrameRefs = frameNodeRefs.filter((f) => selectedPageIds.includes(f.pageId || ''));
    
    if (totalFrames > 200) {
      const confirmed = window.confirm(
        `⚠️ Warning: This index contains ${totalFrames} frames, which is very large.\n\n` +
        `Processing may take a long time and could timeout. For better results, consider:\n` +
        `- Selecting fewer pages\n` +
        `- Breaking the index into smaller parts\n\n` +
        `Do you want to continue?`
      );
      if (!confirmed) {
        return;
      }
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setJobStatus(null);

    const apiKey = getApiKey();
    if (!apiKey) {
      setError('Please login first to get your API key');
      setLoading(false);
      return;
    }

    try {
      // Extract file key from URL if needed
      let fileKeyToUse = fileKey.trim();
      const urlMatch = fileKeyToUse.match(/figma\.com\/(file|proto)\/([a-zA-Z0-9]+)/);
      if (urlMatch) {
        fileKeyToUse = urlMatch[2];
      }

      console.log('🚀 Creating index with:', {
        fileKey: fileKeyToUse,
        fileName,
        selectedPageIdsCount: selectedPageIds.length,
        imageQuality: imageQualityMap[imageQuality].scale,
      });

      const response = await fetch('/api/create-index-from-figma', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          fileKey: fileKeyToUse,
          figmaToken,
          fileName,
          selectedPageIds,
          frameNodeRefs: selectedFrameRefs,
          validateOnly: false,
          imageQuality: imageQualityMap[imageQuality].scale,
            pageFrameCounts, // send client-known frame counts to avoid heavy server prefetch for huge files
        }),
      });

      console.log('📡 Response status:', response.status, response.statusText);
      console.log('⏳ Parsing response...');

      // Check if response is ok, but also handle timeout/504
      if (!response.ok) {
        // Handle 504 Gateway Timeout
        if (response.status === 504) {
          throw { message: 'Request timed out. The file may be too large. Please try selecting fewer pages or contact support.' } as Error;
        }
        
        // Try to parse error response, but handle non-JSON responses (like HTML error pages)
        let errorData;
        try {
          const text = await response.text();
          // Check if response is HTML (Vercel error page)
          if (text.trim().startsWith('<!') || text.includes('<html')) {
            errorData = { error: `Server error (${response.status}). The request may have timed out. Please try with fewer pages.` };
          } else {
            errorData = JSON.parse(text);
          }
        } catch {
          errorData = { error: `Server error (${response.status}). Please try again.` };
        }
        throw { message: errorData.error || 'Failed to create index' } as Error;
      }

      // Parse response, handling non-JSON responses (like HTML error pages from Vercel)
      let data;
      try {
        const text = await response.text();
        // Check if response is HTML (shouldn't happen, but handle it)
        if (text.trim().startsWith('<!') || text.includes('<html')) {
          throw { message: 'Received HTML instead of JSON. The request may have timed out.' } as Error;
        }
        data = JSON.parse(text);
        console.log('✅ Response parsed successfully:', {
          success: data.success,
          jobId: data.jobId,
          stats: data.stats,
        });
      } catch (e: any) {
        console.error('❌ Failed to parse response:', e);
        throw { message: e.message || 'Invalid response from server. The request may have timed out. Please try again with fewer pages.' } as Error;
      }

      if (!data.success) {
        console.error('❌ Server returned success=false:', data.error);
        setError(data.error || 'Failed to create index');
        return;
      }

      console.log('🎯 Job created successfully! Job ID:', data.jobId);
      console.log('📊 Job stats:', data.stats);
      
      setJobId(data.jobId);
      setJobStatus('pending');
      const totalFramesFromResponse = data.stats?.totalFrames || 0;
      setJobProgress({ current: 0, total: totalFramesFromResponse });
      setSuccess(`✅ Job scheduled! Processing ${totalFramesFromResponse} frames in the background. You can close this page - the job will continue processing.`);

      console.log('💾 Saving index entry to database...');
      // Save initial index entry
      const saved = await saveIndexToAPI({
        jobId: data.jobId,
        fileKey: fileKeyToUse,
        fileName,
        selectedPages: selectedPages.map((p) => p.name),
        status: 'pending',
        createdAt: new Date().toISOString(),
        totalFrames: totalFramesFromResponse,
        currentFrameIndex: 0,
      });
      
      if (saved) {
        console.log('✅ Index entry saved:', saved.id);
        const updatedIndices = [saved, ...savedIndices.filter((idx) => idx.id !== saved.id)].slice(0, 50);
        setSavedIndices(updatedIndices);
      } else {
        console.warn('⚠️ Failed to save index entry');
      }

      // Start checking job status
      if (data.jobId) {
        console.log('🔄 Starting job status polling...');
        checkJobStatuses([data.jobId]);
        console.log('⏰ Scheduling processIndexJob in 2 seconds...');
        setTimeout(() => {
          console.log('🚀 Calling processIndexJob for job:', data.jobId);
          processIndexJob(data.jobId).then(() => {
            console.log('✅ processIndexJob completed');
          }).catch((err) => {
            console.error('❌ processIndexJob failed:', err);
          });
        }, 2000);
      } else {
        console.error('❌ No jobId received from server!');
      }
    } catch (e: any) {
      console.error('Error creating index:', e);
      setError(e.message || 'Failed to create index');
    } finally {
      setLoading(false);
    }
  };

  // Count frames with explicit values (for auto-count after validation)
  const countFramesWithValues = async (
    pagesToCount: PageOption[],
    fileKeyToUse: string,
    tokenToUse: string
  ) => {
    if (pagesToCount.length === 0 || !tokenToUse || !fileKeyToUse) {
      console.warn('⚠️ Cannot count frames: missing required data', {
        hasPageOptions: pagesToCount.length > 0,
        hasToken: !!tokenToUse,
        hasFileKey: !!fileKeyToUse,
      });
      return;
    }

    console.log('🔢 Starting frame count with values:', {
      pageCount: pagesToCount.length,
      fileKey: fileKeyToUse.substring(0, 10) + '...',
      hasToken: !!tokenToUse,
    });

    setCountingFrames(true);
    setFrameCountProgress({ current: 0, total: pagesToCount.length });
    setFrameNodeRefs([]); // reset refs before collection
    setError('');

    try {
      // Extract file key from URL if needed
      let extractedFileKey = fileKeyToUse.trim();
      const urlMatch = extractedFileKey.match(/figma\.com\/(file|proto)\/([a-zA-Z0-9]+)/);
      if (urlMatch) {
        extractedFileKey = urlMatch[2];
      }

      // Count frames for all pages using Figma API - batch requests to avoid rate limiting
      const pageCounts: Array<{ pageId: string; frameCount: number }> = [];
      const collectedFrameRefs: FrameRef[] = [];
      let globalFrameIndex = 0;
      const BATCH_SIZE = 10; // Process 10 pages at a time
      
      for (let batchStart = 0; batchStart < pagesToCount.length; batchStart += BATCH_SIZE) {
        const batch = pagesToCount.slice(batchStart, batchStart + BATCH_SIZE);
        const batchPageIds = batch.map(p => p.id).join(',');
        
        setFrameCountProgress({ current: batchStart, total: pagesToCount.length });
        
        try {
          // Fetch multiple page nodes in one API call
          const response = await fetch(`https://api.figma.com/v1/files/${extractedFileKey}/nodes?ids=${batchPageIds}`, {
            headers: {
              'X-Figma-Token': tokenToUse,
            },
          });

          if (response.ok) {
            const data = await response.json();
            
            // Process each page in the batch
            batch.forEach((page) => {
              const pageNode = data.nodes?.[page.id]?.document;
              
              if (pageNode) {
                // EXACT plugin logic: count direct FRAME children (excluding [NO_INDEX]) and FRAMES in SECTIONS
                // Plugin code.js line 1250: if (node.type === "FRAME" && !node.name.includes("[NO_INDEX]"))
                // Plugin code.js line 1258: if (child.type === "FRAME" && !child.name.includes("[NO_INDEX]"))
                let frameCount = 0;
                let directFrames = 0;
                let sectionFrames = 0;
                
                if (pageNode.children) {
                  console.log(`🔍 Counting frames for page "${page.name}": ${pageNode.children.length} direct children`);
                  
                  pageNode.children.forEach((child: any, index: number) => {
                    console.log(`  [${index + 1}] ${child.type}: "${child.name || 'unnamed'}" - hasChildren: ${!!child.children}, childrenCount: ${child.children?.length || 0}`);
                    
                    // Direct FRAME children (EXACT plugin logic + exclude hidden frames)
                    if (child.type === 'FRAME' && !(child.name || '').includes('[NO_INDEX]') && (child.visible === undefined || child.visible !== false)) {
                      directFrames++;
                      frameCount++;
                      console.log(`    ✅ Direct FRAME: ${child.name || 'unnamed'}`);
                      collectedFrameRefs.push({
                        id: child.id,
                        type: 'FRAME',
                        pageId: page.id,
                        pageName: page.name,
                        sectionId: undefined,
                        sectionName: undefined,
                        name: child.name,
                        index: globalFrameIndex++,
                      });
                    }
                    // FRAMES in SECTIONS (EXACT plugin logic + exclude hidden frames)
                    else if (child.type === 'SECTION' && child.children) {
                      const framesInSection = child.children.filter((c: any) => 
                        c.type === 'FRAME' && !(c.name || '').includes('[NO_INDEX]') && (c.visible === undefined || c.visible !== false)
                      );
                      sectionFrames += framesInSection.length;
                      frameCount += framesInSection.length;
                      console.log(`    📦 SECTION "${child.name || 'unnamed'}": ${framesInSection.length} frames (out of ${child.children.length} children)`);
                      framesInSection.forEach((f: any) => {
                        collectedFrameRefs.push({
                          id: f.id,
                          type: 'FRAME',
                          pageId: page.id,
                          pageName: page.name,
                          sectionId: child.id,
                          sectionName: child.name,
                          name: f.name,
                          index: globalFrameIndex++,
                        });
                      });
                    } else if (child.type === 'SECTION' && !child.children) {
                      console.log(`    ⚠️ SECTION "${child.name || 'unnamed'}" has NO children! API didn't return children.`);
                    }
                  });
                  
                  console.log(`📊 Summary for "${page.name}": ${directFrames} direct frames + ${sectionFrames} frames in sections = ${frameCount} total`);
                } else {
                  console.log(`⚠️ Page "${page.name}" has NO children! API didn't return children structure.`);
                }
                
                pageCounts.push({ pageId: page.id, frameCount });
                console.log(`✅ Page "${page.name}": ${frameCount} frames`);
              } else {
                pageCounts.push({ pageId: page.id, frameCount: 0 });
                console.log(`⚠️ Page "${page.name}": No node data found`);
              }
            });
          } else {
            console.error(`❌ API error for batch: ${response.status}`);
            // If batch fails, add 0 for all pages in batch
            batch.forEach((page) => {
              pageCounts.push({ pageId: page.id, frameCount: 0 });
            });
          }
        } catch (e) {
          console.error(`❌ Error counting frames for batch:`, e);
          // Add 0 for all pages in failed batch
          batch.forEach((page) => {
            pageCounts.push({ pageId: page.id, frameCount: 0 });
          });
        }
        
        // Add delay between batches to avoid rate limiting
        if (batchStart + BATCH_SIZE < pagesToCount.length) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between batches
        }
      }
      
      setFrameCountProgress({ current: pagesToCount.length, total: pagesToCount.length });

      // Update pageOptions with frame counts
      setPageOptions((prev) => {
        return prev.map((page) => {
          const countData = pageCounts.find((pc) => pc.pageId === page.id);
          if (countData) {
            return {
              ...page,
              frameCount: countData.frameCount,
              selectable: countData.frameCount > 0 && page.selectable !== false,
            };
          }
          return page;
        });
      });

      // After counting frames, check for changes against indexed version
      const currentConnection = savedConnections.find(conn => conn.fileKey === fileKeyToUse);
      if (currentConnection) {
        const indexedCounts = await getIndexedFrameCounts(fileKeyToUse);
        setIndexedFrameCounts(indexedCounts);
        // Note: Auto-selection is handled by useEffect that watches pageOptions and indexedFrameCounts
      }

      const totalFrames = pageCounts.reduce((sum, pc) => sum + pc.frameCount, 0);
      setFrameNodeRefs(collectedFrameRefs);
      console.log(`✅ Frame counting completed: ${totalFrames} total frames across ${pagesToCount.length} pages`);
      setSuccess(`✅ Frame counting completed: ${totalFrames} total frames across ${pagesToCount.length} pages`);
    } catch (e: any) {
      console.error('❌ Error counting frames:', e);
      setError(e.message || 'Failed to count frames');
    } finally {
      setCountingFrames(false);
      setFrameCountProgress({ current: 0, total: 0 });
      console.log('✅ Frame counting finished (success or error)');
    }
  };

  // Count frames for all pages - using direct Figma API call
  const countFrames = async () => {
    // Use current state values
    if (pageOptions.length === 0 || !figmaToken || !fileKey) {
      console.warn('⚠️ Cannot count frames: missing required data', {
        hasPageOptions: pageOptions.length > 0,
        hasToken: !!figmaToken,
        hasFileKey: !!fileKey,
      });
      return;
    }

    return countFramesWithValues(pageOptions, fileKey, figmaToken);
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" sx={{ fontSize: 20 }} />;
      case 'failed':
        return <Error color="error" sx={{ fontSize: 20 }} />;
      case 'processing':
        return <CircularProgress size={20} />;
      default:
        return <Schedule color="action" sx={{ fontSize: 20 }} />;
    }
  };

  // Format date for Index Management
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Count frames in IndexFile
  const countIndexFrames = (file: IndexFile): number => {
    if (file._isChunked) {
      const total = file._chunks?.reduce((sum: number, chunk: any) => {
        if (chunk.index_data && Array.isArray(chunk.index_data)) {
          return sum + chunk.index_data.reduce((subSum: number, item: any) => {
            return subSum + (item.frames && Array.isArray(item.frames) ? item.frames.length : 0);
          }, 0);
        }
        return sum + (chunk.frame_count || 0);
      }, 0) || 0;
      return total;
    }
    if (file.frame_count) return file.frame_count;
    if (file.index_data && Array.isArray(file.index_data)) {
      const frameCount = file.index_data.reduce((total: number, item: any) => {
        return total + (item.frames && Array.isArray(item.frames) ? item.frames.length : 0);
      }, 0);
      return frameCount;
    }
    return 0;
  };

  // Share functionality removed - sharing is now at gallery level (all indices or search results)
  // Users can access sharing via the Gallery page user menu

  const handleDeleteIndex = async (indexId: string) => {
    const fileToDelete = indexFiles.find(f => f.id === indexId);
    const isChunked = fileToDelete?._isChunked;
    const fileKey = fileToDelete?.figma_file_key;
    
    if (!confirm('Are you sure you want to delete this index? This action cannot be undone.')) {
      return;
    }

    setDeletingIndex(indexId);
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        alert('User not authenticated');
        return;
      }

      const idsToDelete = isChunked ? fileToDelete!._chunks!.map((c: any) => c.id) : [indexId];
      const deletePromises = idsToDelete.map((id: string) => 
        fetch(`/api/delete-index`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({ indexId: id })
        }).then(r => r.json())
      );
      
      const results = await Promise.all(deletePromises);
      const failed = results.filter(r => !r.success);
      
      if (failed.length > 0) {
        alert(`Failed to delete some indices: ${failed.map((f: any) => f.error).join(', ')}`);
      } else {
        await loadIndexFiles();
        
        // If index was deleted, reload indexed frame counts to reflect the deletion
        // This ensures that pages no longer show as indexed if their index was deleted
        if (fileKey) {
          const indexedCounts = await getIndexedFrameCounts(fileKey);
          setIndexedFrameCounts(indexedCounts);
          console.log('🔄 Reloaded indexed frame counts after deletion');
        }
      }
    } catch (err: any) {
      console.error('Error deleting index:', err);
      alert('Error deleting index: ' + err.message);
    } finally {
      setDeletingIndex(null);
    }
  };

  // handleCopyShareLink removed - sharing is now at gallery level

  const handleCheckForUpdates = async (file: IndexFile, providedToken?: string) => {
    if (!file.figma_file_key) {
      alert('File key not available for this index');
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      alert('User not authenticated');
      return;
    }

    // Try to get token from localStorage first, or use provided token
    let figmaToken = providedToken || localStorage.getItem('figma_access_token');
    
    // If no token, open dialog to request it
    if (!figmaToken) {
      setCurrentCheckingFileKey(file.figma_file_key);
      setFigmaTokenInput('');
      setTokenDialogOpen(true);
      return;
    }

    // Save token to localStorage if it was provided
    if (providedToken) {
      localStorage.setItem('figma_access_token', providedToken);
    }

    setCheckingChanges(file.id);
    setCurrentCheckingFileKey(file.figma_file_key);
    
    try {
      const response = await fetch('/api/check-index-changes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          fileKey: file.figma_file_key,
          figmaToken: figmaToken
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(`Error checking for changes: ${data.error || 'Unknown error'}`);
        return;
      }

      setChangesResult(data);
      setChangesDialogOpen(true);
    } catch (err: any) {
      console.error('Error checking for changes:', err);
      alert('Error checking for changes: ' + err.message);
    } finally {
      setCheckingChanges(null);
      setTokenDialogOpen(false);
    }
  };

  const handleTokenDialogSubmit = () => {
    if (!figmaTokenInput.trim()) {
      alert('Please enter a Figma Personal Access Token');
      return;
    }
    if (currentCheckingFileKey) {
      const file = indexFiles.find(f => f.figma_file_key === currentCheckingFileKey);
      if (file) {
        handleCheckForUpdates(file, figmaTokenInput.trim());
      }
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FFFFFF' }}>
      {/* Header */}
      <Container maxWidth="lg">
        <Box sx={{ py: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 300,
              letterSpacing: 3,
              color: '#1a1a1a',
              fontSize: '1.5rem',
              cursor: 'pointer'
            }}
            onClick={() => router.push('/')}
          >
            FIGDEX
          </Typography>
          <Box sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 300,
                color: '#1a1a1a',
                fontSize: '1.25rem'
              }}
            >
              Figma API Integration
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <Chip 
                label={PAGE_VERSION} 
                color="primary" 
                variant="outlined"
                size="small"
                sx={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.65rem', height: '20px' }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>
                {PAGE_VERSION_BUILD_DATE}
              </Typography>
            </Stack>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="text"
              startIcon={<ArrowBackIcon />}
              sx={{ 
                color: '#1a1a1a',
                fontWeight: 400,
                textTransform: 'none',
                fontSize: '0.95rem',
                '&:hover': { 
                  bgcolor: '#f5f5f5'
                }
              }}
              onClick={() => router.back()}
            >
              Back
            </Button>
            {isLoggedIn && (
              <IconButton
                onClick={handleUserMenuOpen}
                sx={{ 
                  bgcolor: 'transparent',
                  '&:hover': { bgcolor: '#f5f5f5' }
                }}
              >
                <Avatar sx={{ bgcolor: '#667eea', width: 32, height: 32 }}>
                  <AccountCircleIcon />
                </Avatar>
              </IconButton>
            )}
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={handleUserMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              sx={{ mt: 1 }}
            >
              {isAdmin && (
                <MenuItem onClick={() => { router.push('/admin'); handleUserMenuClose(); }}>
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Admin Panel</ListItemText>
                </MenuItem>
              )}
              <MenuItem onClick={() => { router.push('/gallery'); handleUserMenuClose(); }}>
                <ListItemIcon>
                  <SearchIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>My FigDex</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { router.push('/index-management'); handleUserMenuClose(); }}>
                <ListItemIcon>
                  <StorageIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Index Management</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { router.push('/projects-management'); handleUserMenuClose(); }}>
                <ListItemIcon>
                  <FolderOpenIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Projects Management</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => { router.push('/account'); handleUserMenuClose(); }}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Account Settings</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { router.push('/api-index'); handleUserMenuClose(); }}>
                <ListItemIcon>
                  <ApiIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Figma API Integration</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { handleCopyApiKey(); handleUserMenuClose(); }}>
                <ListItemIcon>
                  <ContentCopyIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{copied ? 'API Key Copied!' : 'Copy API Key'}</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Logout</ListItemText>
              </MenuItem>
            </Menu>
          </Stack>
        </Box>
      </Container>

      {/* Content */}
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, pb: { xs: 6, sm: 12 }, px: { xs: 2, sm: 3 } }}>

      <Box sx={{ mt: { xs: 2, sm: 3 } }}>
        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Connections" />
            {connectionTabs.map((tab, index) => (
              <Tab 
                key={tab.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{tab.label}</span>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Close tab
                        const newTabs = connectionTabs.filter((_, i) => i !== index);
                        setConnectionTabs(newTabs);
                        // If closing active tab, switch to Connections tab
                        if (activeTab === index + 1) {
                          setActiveTab(0);
                          setSelectedConnectionId(null);
                        } else if (activeTab > index + 1) {
                          // Adjust active tab index if closing a tab before it
                          setActiveTab(activeTab - 1);
                        }
                      }}
                      sx={{ 
                        ml: 0.5,
                        p: 0.5,
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                }
              />
            ))}
            <Tab label="Index Management" />
            <Tab label="Jobs Log" />
          </Tabs>
        </Paper>

        {/* Main Content Area */}
        <Box>

          {/* Tab Content */}
          {activeTab === 0 && (
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  {/* File Limits Indicator */}
                  {fileLimits && !fileLimits.isUnlimited && (
                    <Alert 
                      severity={
                        fileLimits.remainingFiles !== null && fileLimits.remainingFiles <= 1 
                          ? 'error' 
                          : fileLimits.remainingFiles !== null && fileLimits.remainingFiles <= 2
                          ? 'warning'
                          : 'info'
                      }
                      sx={{ mb: 2 }}
                    >
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" sx={{ width: '100%' }}>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            Files: {fileLimits.currentFiles} / {fileLimits.maxFiles}
                          </Typography>
                          {fileLimits.remainingFiles !== null && fileLimits.remainingFiles <= 2 && (
                            <Typography variant="caption">
                              {fileLimits.remainingFiles === 0 
                                ? 'File limit reached. Purchase an add-on or upgrade your plan to add more files.'
                                : `Only ${fileLimits.remainingFiles} file${fileLimits.remainingFiles === 1 ? '' : 's'} remaining. Consider upgrading.`
                              }
                            </Typography>
                          )}
                        </Box>
                        {(fileLimits.remainingFiles === 0 || (fileLimits.remainingFiles !== null && fileLimits.remainingFiles <= 2)) && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => window.open('https://www.figdex.com/pricing', '_blank')}
                            sx={{ flexShrink: 0 }}
                          >
                            Upgrade Plan
                          </Button>
                        )}
                      </Stack>
                      {fileLimits.remainingFiles !== null && fileLimits.maxFiles !== null && fileLimits.maxFiles > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Box
                            sx={{
                              width: '100%',
                              height: 6,
                              bgcolor: 'grey.200',
                              borderRadius: 1,
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              sx={{
                                width: `${(fileLimits.currentFiles / fileLimits.maxFiles) * 100}%`,
                                height: '100%',
                                bgcolor: 
                                  fileLimits.remainingFiles === 0 
                                    ? 'error.main'
                                    : fileLimits.remainingFiles <= 2
                                    ? 'warning.main'
                                    : fileLimits.remainingFiles !== null && fileLimits.remainingFiles <= Math.ceil(fileLimits.maxFiles * 0.2)
                                    ? 'warning.light'
                                    : 'success.main',
                                transition: 'width 0.3s ease, background-color 0.3s ease',
                              }}
                            />
                          </Box>
                        </Box>
                      )}
                    </Alert>
                  )}

                  {/* Connections List */}
                  <Box>
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between', 
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: { xs: 2, sm: 2 },
                      mb: 2 
                    }}>
                      <Typography variant="h6">
                        Saved Connections
                      </Typography>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                        <Button
                          variant="outlined"
                          startIcon={<RefreshIcon />}
                          onClick={async () => {
                            try {
                              setLoading(true);
                              const userData = localStorage.getItem('figma_web_user');
                              if (!userData) return;
                              const user = JSON.parse(userData);
                              const apiKey = user?.api_key;
                              if (!apiKey) return;

                              const res = await fetch('/api/saved-connections', {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${apiKey}`,
                                },
                                body: JSON.stringify({ updateThumbnails: true }),
                              });

                              const data = await res.json();
                              if (data.success) {
                                setSuccess('Thumbnails updated successfully!');
                                await loadSavedConnections();
                              } else {
                                setError(data.error || 'Failed to update thumbnails');
                              }
                            } catch (err: any) {
                              setError(err.message || 'Failed to update thumbnails');
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={loading}
                          fullWidth={false}
                          sx={{ width: { xs: '100%', sm: 'auto' } }}
                        >
                          Update Thumbnails
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => setNewConnectionDialogOpen(true)}
                          disabled={fileLimits !== null && !fileLimits.isUnlimited && fileLimits.remainingFiles !== null && fileLimits.remainingFiles === 0}
                          fullWidth={false}
                          sx={{ width: { xs: '100%', sm: 'auto' } }}
                        >
                          New Connection
                        </Button>
                      </Stack>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    
                    {savedConnections.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                          No saved connections
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Click "New Connection" to create your first connection
                        </Typography>
                      </Box>
                    ) : (
                      <Stack spacing={1}>
                        {savedConnections.map((conn) => {
                          const stats = getConnectionStats(conn);
                          const isTabOpen = connectionTabs.some(tab => tab.connectionId === conn.id);
                          return (
                            <Card 
                              key={conn.id}
                              sx={{ 
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'action.hover' },
                                border: isTabOpen ? 2 : 1,
                                borderColor: isTabOpen ? 'primary.main' : 'divider',
                              }}
                              onClick={() => loadConnection(conn)}
                            >
                              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                <Stack 
                                  direction={{ xs: 'column', sm: 'row' }} 
                                  justifyContent="space-between" 
                                  alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
                                  spacing={{ xs: 2, sm: 2 }}
                                >
                                  {/* Thumbnail */}
                                  <Box
                                    sx={{
                                      flexShrink: 0,
                                      width: { xs: 'min(100%, 333px)', sm: 133 }, // 5:3 aspect ratio: keep height, adjust width (200*5/3=333 for xs, 80*5/3=133 for sm)
                                      height: { xs: 200, sm: 80 }, // Keep existing height, adjust width to maintain 5:3 ratio
                                      borderRadius: 1,
                                      overflow: 'hidden',
                                      bgcolor: 'grey.100',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      border: conn.fileThumbnailUrl ? 'none' : '1px dashed #ccc',
                                    }}
                                  >
                                    {conn.fileThumbnailUrl ? (
                                      <img
                                        src={conn.fileThumbnailUrl}
                                        alt={conn.fileName}
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          objectFit: 'cover',
                                        }}
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                          // Show placeholder on error
                                          const box = (e.target as HTMLElement).parentElement;
                                          if (box) {
                                            box.innerHTML = '<div style="padding: 8px; color: #999; text-align: center; font-size: 12px;">Image failed to load</div>';
                                          }
                                        }}
                                      />
                                    ) : (
                                      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', px: 1 }}>
                                        No thumbnail
                                      </Typography>
                                    )}
                                  </Box>
                                  <Box sx={{ flex: 1, minWidth: 0, width: { xs: '100%', sm: 'auto' } }}>
                                    <Stack 
                                      direction={{ xs: 'column', sm: 'row' }} 
                                      spacing={1} 
                                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                                      sx={{ mb: 1 }}
                                      flexWrap="wrap"
                                    >
                                      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                                        <LinkIcon color="primary" sx={{ flexShrink: 0 }} />
                                        <Typography 
                                          variant="h6" 
                                          sx={{ 
                                            wordBreak: 'break-word',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                          }}
                                        >
                                          {conn.fileName}
                                        </Typography>
                                      </Stack>
                                      {isTabOpen && (
                                        <Chip label="Open" size="small" color="primary" variant="outlined" sx={{ flexShrink: 0 }} />
                                      )}
                                    </Stack>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                                      <Typography 
                                        variant="body2" 
                                        color="text.secondary"
                                        sx={{ 
                                          wordBreak: 'break-word',
                                          flex: 1
                                        }}
                                      >
                                        {stats.hasPageMeta && stats.totalPages > 0
                                          ? `${stats.totalPages} total pages | ${stats.emptyPages} empty | ${stats.indexedPages} indexed`
                                          : conn.pages && conn.pages.length > 0
                                          ? `${conn.pages.length} pages indexed`
                                          : 'No pages selected'}
                                      </Typography>
                                      <Typography 
                                        variant="caption" 
                                        color="text.secondary" 
                                        sx={{ 
                                          wordBreak: 'break-all',
                                          fontFamily: 'monospace',
                                          textAlign: 'right',
                                          flexShrink: 0
                                        }}
                                      >
                                        {conn.fileKey.substring(0, 20)}...
                                      </Typography>
                                    </Box>
                                  </Box>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteConnection(conn.id);
                                    }}
                                    sx={{ 
                                      ml: { xs: 0, sm: 2 },
                                      alignSelf: { xs: 'flex-end', sm: 'flex-start' },
                                      flexShrink: 0
                                    }}
                                  >
                                    <Delete />
                                  </IconButton>
                                </Stack>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </Stack>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Connection Detail Tabs */}
          {activeTab > 0 && activeTab <= connectionTabs.length && (
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  {/* Empty state - no validation or no pages */}
                  {!validated && (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Loading connection...
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Please wait while we load the connection details
                      </Typography>
                    </Box>
                  )}

                  {validated && pageOptions.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No pages found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        This file doesn't contain any pages to index
                      </Typography>
                    </Box>
                  )}

                  {/* Page Selection (shown after validation) */}
                  {validated && pageOptions.length > 0 && (
                    <Box>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between', 
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: { xs: 2, sm: 0 },
                        mb: 2 
                      }}>
                        <Typography variant="h6">
                          Select Pages ({selectedPageIds.length} selected)
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" onClick={handleSelectAll}>
                            Select All
                          </Button>
                          <Button size="small" onClick={handleDeselectAll}>
                            Deselect All
                          </Button>
                        </Stack>
                      </Box>

                      <Paper 
                        sx={{ 
                          p: 2, 
                          maxHeight: 400, 
                          overflow: 'auto',
                          opacity: countingFrames ? 0.5 : 1,
                          pointerEvents: countingFrames ? 'none' : 'auto',
                          transition: 'opacity 0.3s',
                          position: 'relative',
                        }}
                      >
                        {countingFrames && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: 'rgba(255, 255, 255, 0.9)',
                              zIndex: 1,
                            }}
                          >
                            <Stack spacing={2} alignItems="center">
                              <CircularProgress />
                              <Typography variant="body2" color="text.secondary">
                                Counting frames... ({frameCountProgress.current}/{frameCountProgress.total})
                              </Typography>
                            </Stack>
                          </Box>
                        )}
                        <Stack spacing={0.5}>
                          {pageOptions.map((page) => {
                            const isSelected = selectedPageIds.includes(page.id);
                            // Find current connection to check if page is indexed
                            const currentConnection = savedConnections.find(conn => conn.id === selectedConnectionId);
                            
                            // Check if page is indexed: 
                            // 1. Page name must be in connection.pages list
                            // 2. AND there must be indexed frame counts for this page (proving the index still exists)
                            // This ensures that if an index is deleted, the page won't show as indexed
                            const isIndexed = (currentConnection?.pages?.includes(page.name) || false) && 
                                             indexedFrameCounts.has(page.name);
                            
                            // Check for changes by comparing current frameCount with indexed frameCount
                            let hasChanges = false;
                            if (isIndexed && page.frameCount !== undefined) {
                              const indexedCount = indexedFrameCounts.get(page.name);
                              if (indexedCount !== undefined && indexedCount !== page.frameCount) {
                                hasChanges = true;
                              }
                            }
                            
                            // Determine icon based on status
                            let pageStatusIcon = null;
                            if (isIndexed && !hasChanges) {
                              pageStatusIcon = <CheckCircle color="success" sx={{ fontSize: 18 }} />;
                            } else if (isIndexed && hasChanges) {
                              pageStatusIcon = <Update color="warning" sx={{ fontSize: 18 }} />;
                            } else {
                              pageStatusIcon = <AddCircle color="disabled" sx={{ fontSize: 18 }} />;
                            }
                            
                            return (
                              <Box
                                key={page.id}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  py: 0.5,
                                }}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  disabled={!page.selectable || countingFrames}
                                  onClick={() => handlePageToggle(page.id)}
                                  size="small"
                                />
                                <Tooltip title={
                                  isIndexed && !hasChanges ? 'Indexed - no changes' :
                                  isIndexed && hasChanges ? 'Indexed - has changes' :
                                  'Not indexed'
                                }>
                                  {pageStatusIcon}
                                </Tooltip>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    flex: 1,
                                    color: page.selectable ? 'text.primary' : 'text.secondary',
                                  }}
                                >
                                  {page.name}
                                  {page.frameCount !== undefined && page.frameCount > 0 && ` (${page.frameCount} frames)`}
                                  {countingFrames && page.frameCount === undefined && ' (counting...)'}
                                </Typography>
                              </Box>
                            );
                          })}
                        </Stack>
                      </Paper>

                      <Stack direction="row" spacing={2} sx={{ mt: 2 }} alignItems="center">
                        <FormControl sx={{ minWidth: 200 }}>
                          <InputLabel>Image Quality</InputLabel>
                          <Select
                            value={imageQuality}
                            label="Image Quality"
                            onChange={(e) => setImageQuality(e.target.value as 'low' | 'med' | 'hi')}
                          >
                            <MenuItem value="low">{imageQualityMap.low.label}</MenuItem>
                            <MenuItem value="med">{imageQualityMap.med.label}</MenuItem>
                            <MenuItem value="hi">{imageQualityMap.hi.label}</MenuItem>
                          </Select>
                        </FormControl>


                        <Button
                          variant="contained"
                          onClick={countFrames}
                          disabled={!validated || countingFrames || pageOptions.length === 0}
                          startIcon={countingFrames ? <CircularProgress size={16} /> : null}
                        >
                          {countingFrames ? 'Counting...' : 'Recount Frames'}
                        </Button>
                      </Stack>

                      {/* Frame counting progress */}
                      {countingFrames && (
                        <Box sx={{ mt: 2 }}>
                          <Stack spacing={1}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary">
                                Counting frames...
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {frameCountProgress.current > 0 
                                  ? `${frameCountProgress.current}/${frameCountProgress.total} pages`
                                  : 'Initializing...'}
                              </Typography>
                            </Box>
                            {frameCountProgress.total > 0 && (
                              <Box sx={{ width: '100%' }}>
                                <Box
                                  sx={{
                                    width: '100%',
                                    height: 8,
                                    bgcolor: 'grey.200',
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: `${(frameCountProgress.current / frameCountProgress.total) * 100}%`,
                                      height: '100%',
                                      bgcolor: 'primary.main',
                                      transition: 'width 0.3s ease',
                                    }}
                                  />
                                </Box>
                              </Box>
                            )}
                          </Stack>
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Index Creation Section */}
                  {validated && selectedPageIds.length > 0 && !countingFrames && (
                    <Box>
                      <Divider sx={{ my: 3 }} />
                      <Typography variant="h6" gutterBottom>
                        Create Index
                      </Typography>
                      
                      {!jobStatus && (
                        <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'grey.50', borderRadius: 2, mb: 2 }}>
                          <Typography variant="body1" color="text.secondary" gutterBottom>
                            No jobs running now
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Select pages and click "Create Index" to start
                          </Typography>
                        </Box>
                      )}
                      
                      {jobStatus && (
                        <Card sx={{ mb: 2, bgcolor: jobStatus === 'completed' ? '#e8f5e9' : jobStatus === 'failed' ? '#ffebee' : '#fff3e0' }}>
                          <CardContent>
                            <Stack spacing={2}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="h6">
                                  Job Status: {jobStatus.toUpperCase()}
                                </Typography>
                                {jobStatus === 'processing' && <CircularProgress size={20} />}
                                {jobStatus === 'completed' && <CheckCircle color="success" />}
                                {jobStatus === 'failed' && <Error color="error" />}
                              </Box>
                              
                              {(jobStatus === 'pending' || jobStatus === 'processing') && (
                                <Box>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Progress: {jobProgress.current}/{jobProgress.total} frames
                                  </Typography>
                                  <Box sx={{ width: '100%', height: 8, bgcolor: 'grey.200', borderRadius: 1, overflow: 'hidden' }}>
                                    <Box
                                      sx={{
                                        width: `${jobProgress.total > 0 ? (jobProgress.current / jobProgress.total) * 100 : 0}%`,
                                        height: '100%',
                                        bgcolor: 'primary.main',
                                        transition: 'width 0.3s ease',
                                      }}
                                    />
                                  </Box>
                                </Box>
                              )}
                              
                              {jobStatus === 'completed' && (
                                <Alert severity="success">
                                  Index created successfully! Check the History tab to view it.
                                </Alert>
                              )}
                              
                              {jobStatus === 'failed' && (
                                <Alert severity="error">
                                  Index creation failed. Please try again.
                                </Alert>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      )}

                      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                        <Button
                          variant="contained"
                          onClick={createIndex}
                          disabled={loading || jobStatus === 'processing' || countingFrames}
                          startIcon={loading || jobStatus === 'processing' ? <CircularProgress size={16} /> : null}
                        >
                          {loading || jobStatus === 'processing' ? 'Creating...' : 'Create Index'}
                        </Button>
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Index Management Tab */}
          {activeTab === connectionTabs.length + 1 && (
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  {errorIndices && (
                    <Alert severity="error" onClose={() => setErrorIndices('')}>
                      {errorIndices}
                    </Alert>
                  )}

                  {loadingIndices ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                      <CircularProgress />
                    </Box>
                  ) : indexFiles.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        No indices found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Create your first index using the Connections tab
                      </Typography>
                    </Box>
                  ) : (
                    <Stack spacing={1}>
                      {indexFiles.map((file) => (
                        <Card 
                          key={file.id}
                          sx={{ 
                            '&:hover': { bgcolor: 'action.hover' },
                            border: 1,
                            borderColor: 'divider',
                          }}
                        >
                          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                            <Stack 
                              direction={{ xs: 'column', sm: 'row' }} 
                              justifyContent="space-between" 
                              alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
                              spacing={{ xs: 2, sm: 0 }}
                            >
                              <Box sx={{ flex: 1, minWidth: 0, width: { xs: '100%', sm: 'auto' } }}>
                                <Stack 
                                  direction={{ xs: 'column', sm: 'row' }} 
                                  spacing={1} 
                                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                                  sx={{ mb: 1 }}
                                  flexWrap="wrap"
                                >
                                  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                                    <StorageIcon color="primary" sx={{ flexShrink: 0 }} />
                                    <Typography 
                                      variant="h6" 
                                      sx={{ 
                                        wordBreak: 'break-word',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {file.file_name || `Index ${file.id}`}
                                    </Typography>
                                  </Stack>
                                  <Chip 
                                    label={file.source || 'Plugin'} 
                                    size="small"
                                    color={file.source === 'API' ? 'primary' : 'default'}
                                    variant={file.source === 'API' ? 'filled' : 'outlined'}
                                    sx={{ flexShrink: 0 }}
                                  />
                                  {(file._updateCount || 1) > 1 && (
                                    <Chip
                                      label={`${file._updateCount} updates`}
                                      size="small"
                                      variant="outlined"
                                      sx={{ flexShrink: 0 }}
                                    />
                                  )}
                                </Stack>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                  <Typography 
                                    variant="body2" 
                                    color="text.secondary"
                                    sx={{ 
                                      wordBreak: 'break-word',
                                      flex: 1,
                                      minWidth: 0
                                    }}
                                  >
                                    {formatDate(file.uploaded_at)} • {countIndexFrames(file).toLocaleString()} frames
                                  </Typography>
                                </Box>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                                <IconButton
                                  color="info"
                                  onClick={() => handleCheckForUpdates(file)}
                                  disabled={checkingChanges === file.id || !file.figma_file_key}
                                  size="small"
                                  title="Check for updates"
                                >
                                  {checkingChanges === file.id ? (
                                    <CircularProgress size={20} />
                                  ) : (
                                    <UpdateIcon fontSize="small" />
                                  )}
                                </IconButton>
                                {/* Share button removed - sharing is now at gallery level, not per index */}
                                <IconButton
                                  color="error"
                                  onClick={() => handleDeleteIndex(file.id)}
                                  disabled={deletingIndex === file.id}
                                  size="small"
                                  title="Delete"
                                >
                                  {deletingIndex === file.id ? (
                                    <CircularProgress size={20} />
                                  ) : (
                                    <Delete fontSize="small" />
                                  )}
                                </IconButton>
                              </Box>
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Jobs Log Tab */}
          {activeTab === connectionTabs.length + 2 && (
            <Card>
              <CardContent>
                <Stack 
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between" 
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  spacing={{ xs: 2, sm: 0 }}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="h6">
                    Jobs Log
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    fullWidth={false}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                    onClick={async () => {
                      if (!window.confirm('Delete all jobs that are not completed? This cannot be undone.')) return;
                      const apiKey = getApiKey();
                      if (!apiKey) {
                        setError('Please log in first');
                        return;
                      }
                      try {
                        const res = await fetch('/api/jobs/cleanup', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`,
                          },
                          body: JSON.stringify({ deleteIndexFiles: false }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          setSuccess(`Cleaned up ${data.deleted.jobs} jobs and ${data.deleted.savedIndices} history entries`);
                          await loadSavedIndices();
                        } else {
                          setError(data.error || 'Failed to cleanup jobs');
                        }
                      } catch (e: any) {
                        setError('Failed to cleanup jobs: ' + e.message);
                      }
                    }}
                  >
                    Cleanup Non-Completed Jobs
                  </Button>
                </Stack>
                
                {savedIndices.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No index history
                  </Typography>
                ) : (
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    {savedIndices.map((index) => (
                      <Paper key={index.id} sx={{ p: 2 }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          {getStatusIcon(index.status)}
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1">
                              {index.fileName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {index.selectedPages.length} pages
                              {index.totalFrames && ` • ${index.totalFrames} frames`}
                            </Typography>
                            
                            {/* Progress bar and time estimate for processing jobs */}
                            {(index.status === 'processing' || index.status === 'pending') && index.totalFrames && (
                              <Box sx={{ mt: 1.5, mb: 0.5 }}>
                                <Stack spacing={1}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="caption" color="text.secondary">
                                      {index.currentFrameIndex !== undefined 
                                        ? `Processing: ${index.currentFrameIndex}/${index.totalFrames} frames`
                                        : 'Initializing...'}
                                    </Typography>
                                    {(() => {
                                      const estimated = calculateEstimatedTime(index);
                                      const currentTime = timeRemaining.get(index.id);
                                      const displayTime = currentTime !== undefined ? currentTime : estimated;
                                      return (
                                        <Typography variant="caption" color="primary" sx={{ fontWeight: 'medium' }}>
                                          {displayTime !== null ? `~${formatTimeRemaining(displayTime)} remaining` : 'Calculating...'}
                                        </Typography>
                                      );
                                    })()}
                                  </Box>
                                  {index.currentFrameIndex !== undefined && index.totalFrames > 0 && (
                                    <LinearProgress 
                                      variant="determinate" 
                                      value={(index.currentFrameIndex / index.totalFrames) * 100}
                                      sx={{ height: 6, borderRadius: 1 }}
                                    />
                                  )}
                                </Stack>
                              </Box>
                            )}
                            
                          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              <strong>Job ID:</strong>{' '}
                              <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', bgcolor: 'rgba(0,0,0,0.05)', px: 0.5, py: 0.25, borderRadius: 1 }}>
                                {index.jobId || 'N/A'}
                              </Box>
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              <strong>Index ID:</strong>{' '}
                              <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', bgcolor: 'rgba(0,0,0,0.05)', px: 0.5, py: 0.25, borderRadius: 1 }}>
                                {index.id || index.indexId || 'N/A'}
                              </Box>
                            </Typography>
                          </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(index.createdAt)}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                              label={index.status}
                              color={
                                index.status === 'completed' ? 'success' :
                                index.status === 'failed' ? 'error' :
                                index.status === 'processing' ? 'primary' : 'default'
                              }
                              size="small"
                            />
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              onClick={() => handleFailJob(index.jobId)}
                              disabled={!index.jobId || index.status === 'completed'}
                            >
                              Mark Failed
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => handleDeleteJob(index)}
                              disabled={!index.id && !index.jobId}
                            >
                              Delete
                            </Button>
                          </Stack>
                        </Stack>
                        {/* Only show error if job failed or if it's a critical error (not just warnings) */}
                        {index.error && (
                          <Alert 
                            severity={index.status === 'failed' ? 'error' : 'warning'} 
                            sx={{ mt: 1 }}
                          >
                            {index.status === 'completed' && index.error.includes('timeout') 
                              ? 'Processing completed with some retries (timeouts handled automatically)'
                              : index.error}
                          </Alert>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
        </Box>
      </Container>

      {/* New Connection Dialog */}
      <Dialog 
        open={newConnectionDialogOpen} 
        onClose={() => {
          setNewConnectionDialogOpen(false);
          setError('');
          setSuccess('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>New Connection</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Figma Token"
              type={showToken ? 'text' : 'password'}
              value={figmaToken}
              onChange={(e) => setFigmaToken(e.target.value)}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowToken(!showToken)}>
                      {showToken ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Figma File Key or URL"
              value={fileKey}
              onChange={(e) => setFileKey(e.target.value)}
              fullWidth
              placeholder="https://www.figma.com/file/..."
            />

            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setNewConnectionDialogOpen(false);
            setError('');
            setSuccess('');
          }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => validateConnection()}
            disabled={loading || !figmaToken || !fileKey}
          >
            {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            Validate Connection
          </Button>
          <Button
            variant="outlined"
            onClick={async () => {
              const saved = await saveConnection();
              if (saved) {
                // Close dialog after successful save
                setTimeout(() => {
                  setNewConnectionDialogOpen(false);
                  setError('');
                  setSuccess('');
                  // Reset form
                  setFileKey('');
                  setFigmaToken('');
                  setFileName('');
                  setValidated(false);
                  setPageOptions([]);
                  setSelectedPageIds([]);
                }, 500);
              }
            }}
            disabled={!validated || countingFrames}
          >
            Save Connection
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
