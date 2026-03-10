import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  CircularProgress,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  InputAdornment,
  Stack,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Storage as StorageIcon,
  ContentCopy as ContentCopyIcon,
  AccountCircle as AccountCircleIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Api as ApiIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  FolderOpen as FolderOpenIcon,
  Update as UpdateIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

// Version tracking - Update this number for each fix/change
const PAGE_VERSION = 'v1.30.28'; // Fixed frame count to properly use frame_count from API (handle null/0)
const PAGE_VERSION_BUILD_DATE = new Date().toISOString().slice(0, 16).replace('T', ' '); // Auto-generated build timestamp

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
  file_thumbnail_url?: string | null;
}

export default function IndexManagement() {
  const router = useRouter();
  const [indexFiles, setIndexFiles] = useState<IndexFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingIndex, setDeletingIndex] = useState<string | null>(null);
  // Share functionality removed - sharing is now at gallery level, not per index
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checkingChanges, setCheckingChanges] = useState<string | null>(null);
  const [changesDialogOpen, setChangesDialogOpen] = useState(false);
  const [changesResult, setChangesResult] = useState<any>(null);
  const [currentCheckingFileKey, setCurrentCheckingFileKey] = useState<string | null>(null);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [figmaTokenInput, setFigmaTokenInput] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string | null>>({});

  useEffect(() => {
    loadIndexFiles();
  }, []);

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
      setLoading(true);
      setError('');
      const user = getCurrentUser();
      if (!user || !user.email) {
        setError('No logged in user found');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/get-indices?userEmail=${encodeURIComponent(user.email)}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to load indices');
        setIndexFiles([]);
        setLoading(false);
        return;
      }

      if (data.success && Array.isArray(data.data)) {
        // Debug: log frame_count for first few files
        console.log('📊 [index-management] Loaded files:', data.data.slice(0, 3).map((f: any) => ({
          id: f.id,
          fileName: f.file_name,
          frame_count: f.frame_count,
          hasIndexData: !!f.index_data
        })));
        setIndexFiles(data.data);
        setIsLoggedIn(true);
        const adminEmails = ['ranmor01@gmail.com'];
        setIsAdmin(adminEmails.includes(user.email));
        // Ensure api_key is in localStorage (get-indices returns full user from DB)
        // Without api_key, delete/check-updates fail with "User not authenticated"
        if (data.user && data.user.api_key && typeof window !== 'undefined') {
          const stored = { ...user, api_key: data.user.api_key, full_name: data.user.full_name || user.full_name };
          localStorage.setItem('figma_web_user', JSON.stringify(stored));
        }
        // Load thumbnails for all files
        loadThumbnails(data.data);
      } else {
        setIndexFiles([]);
      }
    } catch (err: any) {
      console.error('Error loading index files:', err);
      setError(err.message || 'Failed to load indices');
      setIndexFiles([]);
    } finally {
      setLoading(false);
    }
  };

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

  const countFrames = (file: IndexFile): number => {
    // Use frame_count from API if available (not null/undefined)
    // Note: frame_count can be 0, which is valid
    if (file.frame_count !== null && file.frame_count !== undefined) {
      console.log(`📊 [countFrames] Using frame_count from API for ${file.id}: ${file.frame_count}`);
      return file.frame_count;
    }
    console.log(`⚠️ [countFrames] frame_count is null/undefined for ${file.id}, trying to count from index_data`);
    
    if (file._isChunked) {
      const total = file._chunks?.reduce((sum: number, chunk: any) => {
        // Use chunk.frame_count if available
        if (chunk.frame_count !== null && chunk.frame_count !== undefined && chunk.frame_count > 0) {
          return sum + chunk.frame_count;
        }
        // Otherwise, try to count from index_data
        if (chunk.index_data) {
          let indexDataContent = chunk.index_data;
          // Parse if string
          if (typeof indexDataContent === 'string') {
            try {
              indexDataContent = JSON.parse(indexDataContent);
            } catch {
              return sum;
            }
          }
          // Handle array format
          if (Array.isArray(indexDataContent)) {
            return sum + indexDataContent.reduce((subSum: number, item: any) => {
              return subSum + (item.frames && Array.isArray(item.frames) ? item.frames.length : 0);
            }, 0);
          }
          // Handle object format with pages (from plugin with coverImageUrl)
          if (indexDataContent && typeof indexDataContent === 'object' && Array.isArray(indexDataContent.pages)) {
            return sum + indexDataContent.pages.reduce((subSum: number, page: any) => {
              return subSum + (page.frames && Array.isArray(page.frames) ? page.frames.length : 0);
            }, 0);
          }
        }
        return sum;
      }, 0) || 0;
      return total;
    }
    
    // Try to count from index_data if available
    if (file.index_data) {
      let indexDataContent = file.index_data;
      // Parse if string
      if (typeof indexDataContent === 'string') {
        try {
          indexDataContent = JSON.parse(indexDataContent);
        } catch {
          return 0;
        }
      }
      // Handle array format
      if (Array.isArray(indexDataContent)) {
        return indexDataContent.reduce((total: number, item: any) => {
          return total + (item.frames && Array.isArray(item.frames) ? item.frames.length : 0);
        }, 0);
      }
      // Handle object format with pages (from plugin with coverImageUrl)
      if (indexDataContent && typeof indexDataContent === 'object' && Array.isArray(indexDataContent.pages)) {
        return indexDataContent.pages.reduce((total: number, page: any) => {
          return total + (page.frames && Array.isArray(page.frames) ? page.frames.length : 0);
        }, 0);
      }
    }
    
    // If frame_count is 0, return 0 (not null/undefined)
    if (file.frame_count === 0) {
      return 0;
    }
    
    return 0;
  };

  const loadThumbnails = async (files: IndexFile[]) => {
    const thumbnailPromises = files.map(async (file) => {
      try {
        // First, try to use file_thumbnail_url from saved_connections (if available)
        if (file.file_thumbnail_url) {
          // Always fetch index data to get signed URL (even if we have file_thumbnail_url)
          let thumbnailUrl = file.file_thumbnail_url;
          
          try {
            const indexResponse = await fetch(`/api/get-index-data?indexId=${file.id}`);
            if (indexResponse.ok) {
              const indexData = await indexResponse.json();
              if (indexData.success && indexData.data) {
                // Always use coverImageUrl from get-index-data if available (it should be signed)
                if (indexData.data.coverImageUrl) {
                  thumbnailUrl = indexData.data.coverImageUrl;
                }
              }
            }
          } catch (e) {
            console.error(`Error fetching index data for ${file.id}:`, e);
          }
          
          return { fileId: file.id, thumbnail: thumbnailUrl };
        }
        
        // Fallback: Get thumbnail from index_data (coverImageUrl or first frame)
        const indexResponse = await fetch(`/api/get-index-data?indexId=${file.id}`);
        if (!indexResponse.ok) {
          return { fileId: file.id, thumbnail: null };
        }
        
        const indexData = await indexResponse.json();
        if (!indexData.success || !indexData.data) {
          return { fileId: file.id, thumbnail: null };
        }
        
        // First check if coverImageUrl is at the data level (from get-index-data.ts)
        let thumbnail: string | null = null;
        if (indexData.data && indexData.data.coverImageUrl) {
          thumbnail = indexData.data.coverImageUrl;
        }
        
        // Try to parse index_data
        let indexDataContent = indexData.data.index_data;
        if (typeof indexDataContent === 'string') {
          try {
            indexDataContent = JSON.parse(indexDataContent);
          } catch (e) {
            return { fileId: file.id, thumbnail: null };
          }
        }
        
        // Check if index_data has coverImageUrl at root level (from plugin)
        if (!thumbnail && indexDataContent && typeof indexDataContent === 'object' && !Array.isArray(indexDataContent)) {
          if (indexDataContent.coverImageUrl) {
            thumbnail = indexDataContent.coverImageUrl;
          }
        }
        
        return { fileId: file.id, thumbnail: thumbnail || null };
      } catch (error) {
        console.error(`Error loading thumbnail for ${file.id}:`, error);
        return { fileId: file.id, thumbnail: null };
      }
    });
    
    const results = await Promise.all(thumbnailPromises);
    const thumbnailMap: Record<string, string | null> = {};
    results.forEach(({ fileId, thumbnail }) => {
      thumbnailMap[fileId] = thumbnail;
    });
    setThumbnails(thumbnailMap);
  };

  // handleShareIndex removed - sharing is now at gallery level (all indices or search results)

  const handleDeleteIndex = async (indexId: string, retryAfterRefresh = false) => {
    const fileToDelete = indexFiles.find(f => f.id === indexId);
    const isChunked = fileToDelete?._isChunked;
    
    if (!retryAfterRefresh && !confirm('Are you sure you want to delete this index? This action cannot be undone.')) {
      return;
    }

    setDeletingIndex(indexId);
    try {
      let user = getCurrentUser();
      if (!user || !user.email) {
        alert('User not authenticated');
        return;
      }
      if (!user.api_key && !retryAfterRefresh) {
        // Try to refresh session from get-indices
        const refreshRes = await fetch(`/api/get-indices?userEmail=${encodeURIComponent(user.email)}`);
        const refreshData = await refreshRes.json();
        if (refreshData.user?.api_key) {
          const stored = { ...user, api_key: refreshData.user.api_key, full_name: refreshData.user.full_name || user.full_name };
          localStorage.setItem('figma_web_user', JSON.stringify(stored));
          user = stored;
        }
      }
      if (!user.api_key) {
        alert('User not authenticated. Please log out and log in again.');
        return;
      }

      const idsToDelete = isChunked ? fileToDelete!._chunks!.map((c: any) => c.id) : [indexId];
      const deletePromises = idsToDelete.map((id: string) => 
        fetch(`/api/delete-index`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.api_key}`
          },
          body: JSON.stringify({ indexId: id })
        }).then(r => r.json())
      );
      
      const results = await Promise.all(deletePromises);
      const failed = results.filter(r => !r.success);
      
      if (failed.length > 0) {
        const isInvalidKey = failed.some((f: any) => (f.error || '').toLowerCase().includes('invalid api key'));
        if (isInvalidKey && !retryAfterRefresh) {
          // Refresh session from get-indices and retry once (api_key may have been regenerated)
          const refreshRes = await fetch(`/api/get-indices?userEmail=${encodeURIComponent(user.email)}`);
          const refreshData = await refreshRes.json();
          if (refreshData.user?.api_key) {
            const stored = { ...user, api_key: refreshData.user.api_key, full_name: refreshData.user.full_name || user.full_name };
            localStorage.setItem('figma_web_user', JSON.stringify(stored));
            return handleDeleteIndex(indexId, true);
          }
        }
        alert(`Failed to delete some indices: ${failed.map((f: any) => f.error).join(', ')}\n\nIf the API key is invalid, please log out and log in again.`);
      } else {
        await loadIndexFiles();
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

    const user = getCurrentUser();
    if (!user || !user.api_key) {
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
          'Authorization': `Bearer ${user.api_key}`
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

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

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
          <Box sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 300,
                color: '#1a1a1a',
                fontSize: '1.25rem'
              }}
            >
              Index Management
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mt: 0.5 }}>
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
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, pb: 12 }}>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Cover</strong></TableCell>
                  <TableCell><strong>File Name</strong></TableCell>
                  <TableCell><strong>Source</strong></TableCell>
                  <TableCell><strong>Last Updated</strong></TableCell>
                  <TableCell><strong>Frames Count</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {indexFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      {thumbnails[file.id] ? (
                        <Box
                          component="img"
                          src={thumbnails[file.id] || undefined}
                          alt={file.file_name || 'Cover'}
                          sx={{
                            width: 80,
                            height: 48, // 5:3 aspect ratio (80 * 3/5 = 48) - same as lobby
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: '1px solid #e0e0e0'
                          }}
                          onError={(e: any) => {
                            // Hide image on error
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 80,
                            height: 48, // 5:3 aspect ratio - same as lobby
                            bgcolor: 'grey.200',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #e0e0e0'
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            No cover
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {file.file_name || `Index ${file.id}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={file.source || 'Plugin'} 
                        size="small"
                        color={file.source === 'API' ? 'primary' : 'default'}
                        variant={file.source === 'API' ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(file.uploaded_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {countFrames(file).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
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
                            <DeleteIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {indexFiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                        No indices found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Share Dialog removed - sharing is now at gallery level via /gallery page */}

        {/* Changes Detection Dialog */}
        <Dialog open={changesDialogOpen} onClose={() => setChangesDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <UpdateIcon />
              Changes Detection Results
            </Box>
          </DialogTitle>
          <DialogContent>
            {changesResult && (
              <Box sx={{ mt: 2 }}>
                {!changesResult.hasChanges ? (
                  <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
                    <Typography variant="body1" fontWeight={500}>
                      No changes detected
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      The file version matches the stored version. No re-indexing needed.
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                      Version: {changesResult.currentVersion || 'N/A'}
                    </Typography>
                  </Alert>
                ) : (
                  <>
                    <Alert 
                      severity={changesResult.recommendation === 'full' ? 'warning' : 'info'}
                      icon={<InfoIcon />}
                      sx={{ mb: 2 }}
                    >
                      <Typography variant="body1" fontWeight={500}>
                        Changes detected!
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        The file has been updated since the last index.
                      </Typography>
                    </Alert>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight={500} gutterBottom>
                        Change Summary:
                      </Typography>
                      <Stack spacing={1}>
                        {changesResult.newFrameCount > 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                            <Typography variant="body2">New frames:</Typography>
                            <Typography variant="body2" fontWeight={500}>{changesResult.newFrameCount}</Typography>
                          </Box>
                        )}
                        {changesResult.removedFrameCount > 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
                            <Typography variant="body2">Removed frames:</Typography>
                            <Typography variant="body2" fontWeight={500}>{changesResult.removedFrameCount}</Typography>
                          </Box>
                        )}
                        {changesResult.existingFrameCount > 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
                            <Typography variant="body2">Unchanged frames:</Typography>
                            <Typography variant="body2" fontWeight={500}>{changesResult.existingFrameCount}</Typography>
                          </Box>
                        )}
                      </Stack>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight={500} gutterBottom>
                        Recommendation:
                      </Typography>
                      <Chip 
                        label={changesResult.recommendation === 'full' ? 'Full Re-index' : 'Incremental Re-index'}
                        color={changesResult.recommendation === 'full' ? 'warning' : 'primary'}
                        sx={{ fontWeight: 500 }}
                      />
                      <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                        {changesResult.recommendation === 'full' 
                          ? 'All frames should be re-indexed due to significant changes.'
                          : 'Only new and changed frames need to be re-indexed.'}
                      </Typography>
                    </Box>

                    <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        <strong>Current version:</strong> {changesResult.currentVersion || 'N/A'}<br />
                        <strong>Stored version:</strong> {changesResult.storedVersion || 'N/A'}<br />
                        <strong>Change type:</strong> {changesResult.changeType}
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            {changesResult?.hasChanges && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  setChangesDialogOpen(false);
                  // Navigate to API index page with file key pre-filled
                  const fileKey = currentCheckingFileKey;
                  if (fileKey) {
                    router.push(`/api-index?fileKey=${encodeURIComponent(fileKey)}&action=reindex`);
                  } else {
                    alert('Please use the regular index creation flow. File key not available.');
                  }
                }}
              >
                {changesResult.recommendation === 'full' ? 'Full Re-index' : 'Incremental Re-index'}
              </Button>
            )}
            <Button onClick={() => setChangesDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Figma Token Dialog */}
        <Dialog open={tokenDialogOpen} onClose={() => setTokenDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Enter Figma Personal Access Token</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Figma Personal Access Token"
                type={showTokenInput ? 'text' : 'password'}
                value={figmaTokenInput}
                onChange={(e) => setFigmaTokenInput(e.target.value)}
                placeholder="figd_..."
                helperText="Get your token from Figma Settings → Account → Personal Access Tokens. The token will be saved for future use."
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowTokenInput(!showTokenInput)}>
                        {showTokenInput ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTokenDialogSubmit();
                  }
                }}
                autoFocus
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTokenDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="contained" color="primary" onClick={handleTokenDialogSubmit}>
              Continue
            </Button>
          </DialogActions>
        </Dialog>

        {/* Share functionality removed - sharing is now at gallery level */}
      </Container>
    </Box>
  );
}

