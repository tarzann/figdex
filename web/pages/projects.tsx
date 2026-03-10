import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip
} from '@mui/material';
import { useRouter } from 'next/router';
import { History } from '@mui/icons-material';
// Dynamic import to avoid build-time errors
let supabase: any = null;
if (typeof window !== 'undefined') {
  import('../lib/supabase').then((mod) => {
    supabase = mod.supabase;
  });
}

type IndexFile = {
  filename: string; // This is now the database ID
  projectId: string;
  figmaFileKey: string;
  fileName: string;
  uploadedAt: string;
  size: number;
  frameCount: number;
  thumbnailCount: number;
  frameTags: string[];
  customTags: string[];
};

type ArchiveEntry = {
  id: string;
  file_name?: string | null;
  file_size?: number | null;
  uploaded_at?: string | null;
  archived_at?: string | null;
};

export default function Projects() {
  const [files, setFiles] = useState<IndexFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<ArchiveEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [currentFile, setCurrentFile] = useState<IndexFile | null>(null);
  const [restoringArchiveId, setRestoringArchiveId] = useState<string | null>(null);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/index-files');
      const data = await response.json();
      if (data.success) {
        setFiles(data.files);
      } else if (data.error === 'User not authenticated') {
        setError('Please log in to view your projects');
        setFiles([]);
      } else {
        setError('Failed to load files');
      }
    } catch (err) {
      setError('Error loading files');
      console.error('Error loading files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const getAuthToken = async (): Promise<string | null> => {
    if (!supabase) {
      const mod = await import('../lib/supabase');
      supabase = mod.supabase;
    }
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };

  const buildAuthHeader = async (supabaseToken?: string | null) => {
    const headers: Record<string, string> = {};
    if (supabaseToken) {
      headers.Authorization = `Bearer ${supabaseToken}`;
      return headers;
    }
    if (typeof window === 'undefined') return headers;
    const stored = localStorage.getItem('figma_web_user');
    if (!stored) return headers;
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.api_key) {
        headers.Authorization = `Bearer ${parsed.api_key}`;
      }
    } catch {}
    return headers;
  };

  const handleHistoryClose = () => {
    setHistoryOpen(false);
    setHistoryEntries([]);
    setCurrentFile(null);
    setHistoryError('');
    setHistoryLoading(false);
    setRestoringArchiveId(null);
  };

  const handleShowHistory = async (file: IndexFile) => {
    setCurrentFile(file);
    setHistoryOpen(true);
    setHistoryError('');
    setHistoryLoading(true);
    setHistoryEntries([]);
    try {
      const token = await getAuthToken();
      const params = new URLSearchParams();
      params.set('projectId', file.projectId || 'null');
      params.set('fileKey', file.figmaFileKey || 'null');
      const headers = await buildAuthHeader(token);
      const response = await fetch(`/api/index-archives?${params.toString()}`, {
        headers,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to load archive history');
      }
      setHistoryEntries(Array.isArray(data.archives) ? data.archives : []);
    } catch (err: any) {
      console.error('Failed to load archive history:', err);
      setHistoryError(err?.message || 'Unable to load archive history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRestoreArchive = async (archiveId: string) => {
    setHistoryError('');
    setRestoringArchiveId(archiveId);
    try {
      const token = await getAuthToken();
      const headers = await buildAuthHeader(token);
      const response = await fetch('/api/index-archives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ archiveId }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to restore archive');
      }
      handleHistoryClose();
      loadFiles();
    } catch (err: any) {
      console.error('Failed to restore archive:', err);
      setHistoryError(err?.message || 'Failed to restore archive');
    } finally {
      setRestoringArchiveId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString() : 'Unknown');

  const handleViewIndex = (id: string) => {
    router.push(`/gallery`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        FigDex Projects
      </Typography>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            error === 'Please log in to view your projects' ? (
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => router.push('/login')}
              >
                Login
              </Button>
            ) : null
          }
        >
          {error}
        </Alert>
      )}

      {files.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No index files
            </Typography>
            <Typography color="text.secondary">
              Upload an index from the plugin to see it here
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
          {files.map((file) => (
            <Box key={file.filename}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {file.fileName}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {file.frameCount} pages, {file.thumbnailCount} images
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Size: {formatFileSize(file.size)}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Uploaded: {new Date(file.uploadedAt).toLocaleString('en-US')}
                  </Typography>
                  
                  {/* Display tags */}
                  {(file.frameTags.length > 0 || file.customTags.length > 0) && (
                    <Box sx={{ mt: 1, mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Tags:
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {file.frameTags.map((tag, index) => (
                          <Chip 
                            key={`frame-${index}`} 
                            label={tag} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        ))}
                        {file.customTags.map((tag, index) => (
                          <Chip 
                            key={`custom-${index}`} 
                            label={tag} 
                            size="small" 
                            color="secondary" 
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                  
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
                    <Button 
                    variant="contained" 
                    onClick={() => handleViewIndex(file.filename)}
                    sx={{ flexGrow: 1 }}
                  >
                    View Index
                  </Button>
                    <Tooltip title="View archive versions">
                      <IconButton 
                        size="small"
                        onClick={() => handleShowHistory(file)}
                      >
                        <History />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      )}
      </Box>
      <Dialog open={historyOpen} onClose={handleHistoryClose} fullWidth maxWidth="sm">
        <DialogTitle>
          Archived versions for {currentFile?.fileName || 'this index'}
        </DialogTitle>
        <DialogContent dividers>
          {historyError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {historyError}
            </Alert>
          )}
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : historyEntries.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No archived versions found yet.
            </Typography>
          ) : (
            <List disablePadding>
              {historyEntries.map((archive) => (
                <ListItem
                  key={archive.id}
                  secondaryAction={
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleRestoreArchive(archive.id)}
                      disabled={restoringArchiveId === archive.id}
                      startIcon={<History />}
                    >
                      Restore
                    </Button>
                  }
                >
                  <ListItemText
                    primary={archive.file_name || 'Archived version'}
                    secondary={`Archived: ${formatDate(archive.archived_at)} • Uploaded: ${formatDate(
                      archive.uploaded_at
                    )} • Size: ${archive.file_size ? formatFileSize(archive.file_size) : 'Unknown'}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleHistoryClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 