import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
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
  InputAdornment,
  Stack
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Update as UpdateIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  FolderOpen as FolderOpenIcon
} from '@mui/icons-material';
import UserAppLayout from '../components/UserAppLayout';

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
  project_id?: string | null;
  legacy_index_id?: string | null;
  normalized_index_id?: string | null;
  file_thumbnail_url?: string | null;
}

export default function IndexManagement() {
  const router = useRouter();
  const [indexFiles, setIndexFiles] = useState<IndexFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingIndex, setDeletingIndex] = useState<string | null>(null);
  // Share functionality removed - sharing is now at gallery level, not per index
  const [checkingChanges, setCheckingChanges] = useState<string | null>(null);
  const [changesDialogOpen, setChangesDialogOpen] = useState(false);
  const [changesResult, setChangesResult] = useState<any>(null);
  const [currentCheckingFileKey, setCurrentCheckingFileKey] = useState<string | null>(null);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [figmaTokenInput, setFigmaTokenInput] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string | null>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteIndexId, setPendingDeleteIndexId] = useState<string | null>(null);

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

  const parseApiJson = async (response: Response) => {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(text && text.length < 240 ? text : `Request failed (${response.status})`);
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

      const userIdParam = user?.id ? `&userId=${encodeURIComponent(user.id)}` : '';
      const response = await fetch(`/api/get-indices?userEmail=${encodeURIComponent(user.email)}${userIdParam}`);
      const data = await parseApiJson(response);

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
    const immediateThumbnails = files.reduce((acc: Record<string, string | null>, file) => {
      if (file.file_thumbnail_url) {
        acc[file.id] = file.file_thumbnail_url;
      }
      return acc;
    }, {});

    if (Object.keys(immediateThumbnails).length > 0) {
      setThumbnails((prev) => ({ ...prev, ...immediateThumbnails }));
    }

    const filesNeedingFetch = files.filter((file) => !file.file_thumbnail_url);
    if (filesNeedingFetch.length === 0) return;

    const thumbnailPromises = filesNeedingFetch.map(async (file) => {
      try {
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

  const openDeleteDialog = (indexId: string) => {
    setPendingDeleteIndexId(indexId);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (deletingIndex) return;
    setDeleteDialogOpen(false);
    setPendingDeleteIndexId(null);
  };

  const handleDeleteIndex = async (indexId: string, retryAfterRefresh = false) => {
    const fileToDelete = indexFiles.find(f => f.id === indexId);
    const isChunked = fileToDelete?._isChunked;

    setDeletingIndex(indexId);
    try {
      let user = getCurrentUser();
      if (!user || !user.email) {
        alert('User not authenticated');
        return;
      }
      if (!user.api_key && !retryAfterRefresh) {
        // Try to refresh session from get-indices
        const userIdParam = user?.id ? `&userId=${encodeURIComponent(user.id)}` : '';
        const refreshRes = await fetch(`/api/get-indices?userEmail=${encodeURIComponent(user.email)}${userIdParam}`);
        const refreshData = await parseApiJson(refreshRes);
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
          body: JSON.stringify({
            indexId: id,
            fileName: fileToDelete?.file_name || null,
            figmaFileKey: fileToDelete?.figma_file_key || null,
            projectId: fileToDelete?.project_id || null,
            legacyIndexId: fileToDelete?.legacy_index_id || null,
            normalizedIndexId: fileToDelete?.normalized_index_id || null,
          })
        }).then(r => r.json())
      );
      
      const results = await Promise.all(deletePromises);
      const failed = results.filter(r => !r.success);
      
      if (failed.length > 0) {
        const isInvalidKey = failed.some((f: any) => (f.error || '').toLowerCase().includes('invalid api key'));
        if (isInvalidKey && !retryAfterRefresh) {
          // Refresh session from get-indices and retry once (api_key may have been regenerated)
          const userIdParam = user?.id ? `&userId=${encodeURIComponent(user.id)}` : '';
          const refreshRes = await fetch(`/api/get-indices?userEmail=${encodeURIComponent(user.email)}${userIdParam}`);
          const refreshData = await parseApiJson(refreshRes);
          if (refreshData.user?.api_key) {
            const stored = { ...user, api_key: refreshData.user.api_key, full_name: refreshData.user.full_name || user.full_name };
            localStorage.setItem('figma_web_user', JSON.stringify(stored));
            return handleDeleteIndex(indexId, true);
          }
        }
        alert(`Failed to delete some indices: ${failed.map((f: any) => f.error).join(', ')}\n\nIf the API key is invalid, please log out and log in again.`);
      } else {
        await loadIndexFiles();
        setDeleteDialogOpen(false);
        setPendingDeleteIndexId(null);
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
    <UserAppLayout title="Index Management" contentMaxWidth="lg" contentSx={{ py: { xs: 4, md: 6 } }}>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Paper
          sx={{
            mb: 3,
            p: { xs: 2.5, md: 3 },
            borderRadius: 4,
            bgcolor: '#ffffff',
            border: '1px solid #e4e7ec',
            boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box>
              <Chip
                label="Saved libraries"
                size="small"
                sx={{ mb: 1.25, bgcolor: '#eef4ff', color: '#3538cd', fontWeight: 700 }}
              />
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827', mb: 0.75 }}>
                Manage your indexed Figma libraries
              </Typography>
              <Typography variant="body1" sx={{ color: '#667085', lineHeight: 1.7, maxWidth: 680 }}>
                Review indexed files, check whether a file changed in Figma, and remove old libraries you no longer need.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ minWidth: { md: 220 } }}>
              <Chip
                label={`${indexFiles.length} ${indexFiles.length === 1 ? 'library' : 'libraries'}`}
                sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, bgcolor: '#111827', color: '#fff', fontWeight: 700 }}
              />
              <Button
                variant="outlined"
                startIcon={<FolderOpenIcon />}
                onClick={() => router.push('/gallery')}
                sx={{
                  textTransform: 'none',
                  borderRadius: 999,
                  borderColor: '#d0d5dd',
                  color: '#111827',
                  fontWeight: 700,
                  px: 2.5,
                  '&:hover': { borderColor: '#111827', bgcolor: 'rgba(17,24,39,0.04)' },
                }}
              >
                Open gallery
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Paper
          sx={{
            p: { xs: 1.5, md: 2 },
            borderRadius: 4,
            bgcolor: '#ffffff',
            border: '1px solid #e4e7ec',
            boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
            overflow: 'hidden',
          }}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#667085', fontWeight: 700 }}>Cover</TableCell>
                  <TableCell sx={{ color: '#667085', fontWeight: 700 }}>File Name</TableCell>
                  <TableCell sx={{ color: '#667085', fontWeight: 700 }}>Source</TableCell>
                  <TableCell sx={{ color: '#667085', fontWeight: 700 }}>Last Updated</TableCell>
                  <TableCell sx={{ color: '#667085', fontWeight: 700 }}>Frames Count</TableCell>
                  <TableCell align="right" sx={{ color: '#667085', fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {indexFiles.map((file) => (
                  <TableRow key={file.id} hover sx={{ '& td': { borderColor: '#eaecf0' } }}>
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
                            border: '1px solid #e4e7ec'
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
                            bgcolor: '#f8fafc',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #e4e7ec'
                          }}
                        >
                          <CircularProgress size={16} sx={{ color: '#98a2b3' }} />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#111827' }}>
                        {file.file_name || `Index ${file.id}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={file.source || 'Plugin'} 
                        size="small"
                        sx={{
                          bgcolor: file.source === 'API' ? '#eef4ff' : '#f8fafc',
                          color: file.source === 'API' ? '#3538cd' : '#475467',
                          border: '1px solid #e4e7ec',
                          fontWeight: 700,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#475467' }}>
                        {formatDate(file.uploaded_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#111827', fontWeight: 600 }}>
                        {countFrames(file).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end">
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={checkingChanges === file.id ? <CircularProgress size={14} /> : <UpdateIcon fontSize="small" />}
                          onClick={() => handleCheckForUpdates(file)}
                          disabled={checkingChanges === file.id || !file.figma_file_key}
                          sx={{
                            textTransform: 'none',
                            borderRadius: 999,
                            borderColor: '#d0d5dd',
                            color: '#111827',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            '&:hover': { borderColor: '#111827', bgcolor: 'rgba(17,24,39,0.04)' },
                          }}
                        >
                          Check updates
                        </Button>
                        <Button
                          variant="text"
                          size="small"
                          startIcon={deletingIndex === file.id ? <CircularProgress size={14} /> : <DeleteIcon fontSize="small" />}
                          onClick={() => openDeleteDialog(file.id)}
                          disabled={deletingIndex === file.id}
                          sx={{
                            textTransform: 'none',
                            borderRadius: 999,
                            color: '#b42318',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            '&:hover': { bgcolor: '#fef3f2' },
                          }}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {indexFiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Box sx={{ py: 6 }}>
                        <Chip
                          label="No libraries yet"
                          sx={{ mb: 2, bgcolor: '#eef4ff', color: '#3538cd', fontWeight: 700 }}
                        />
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#111827', mb: 1 }}>
                          Your saved libraries will appear here
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mx: 'auto', mb: 2.5 }}>
                          Create your first index in the plugin, then return here to manage updates and remove old libraries.
                        </Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
                          <Button
                            variant="contained"
                            onClick={() => router.push('/download-plugin')}
                            sx={{
                              bgcolor: '#111827',
                              color: '#fff',
                              textTransform: 'none',
                              borderRadius: 999,
                              px: 3,
                              py: 1.15,
                              fontWeight: 700,
                              '&:hover': { bgcolor: '#1f2937' },
                            }}
                          >
                            Download Plugin
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => router.push('/gallery')}
                            sx={{
                              textTransform: 'none',
                              borderRadius: 999,
                              borderColor: '#d0d5dd',
                              color: '#111827',
                              fontWeight: 700,
                              px: 3,
                              py: 1.15,
                              '&:hover': { borderColor: '#111827', bgcolor: 'rgba(17,24,39,0.04)' },
                            }}
                          >
                            Open Gallery
                          </Button>
                        </Stack>
                      </Box>
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

      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Index</DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 1 }}>
            Are you sure you want to delete this index? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} disabled={!!deletingIndex}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => pendingDeleteIndexId && handleDeleteIndex(pendingDeleteIndexId)}
            disabled={!pendingDeleteIndexId || !!deletingIndex}
          >
            {deletingIndex ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

        {/* Share functionality removed - sharing is now at gallery level */}
    </UserAppLayout>
  );
}
