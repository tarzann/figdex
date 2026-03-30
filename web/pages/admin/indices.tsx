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
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Chip
} from '@mui/material';
import { Delete, ArrowBack, Search, Build, Warning, History, Restore } from '@mui/icons-material';
import { requireAdminClientAccess } from '../../lib/admin-client';

interface IndexFile {
  id: string;
  user_id: string;
  user_email: string;
  file_name: string;
  file_size: number;
  created_at: string;
  frame_count?: number;
  grouped_ids?: string[];
  project_id?: string;
  figma_file_key?: string;
  source?: 'Plugin' | 'API'; // Indicates if index was uploaded via Plugin or API
  update_count?: number;
}

const getIndexGroupKey = (index: Partial<IndexFile>) => {
  const fileKey = typeof index.figma_file_key === 'string' ? index.figma_file_key.trim() : '';
  const projectId = typeof index.project_id === 'string' ? index.project_id.trim() : '';
  const fileName = typeof index.file_name === 'string' ? index.file_name.trim().toLowerCase() : '';
  const userId = typeof index.user_id === 'string' ? index.user_id.trim() : '';
  return [userId, fileKey || projectId || fileName || String(index.id || '')].join('::');
};

const collapseAdminIndices = (indices: IndexFile[]) => {
  const grouped = new Map<string, IndexFile>();

  indices.forEach((index) => {
    const key = getIndexGroupKey(index);
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        ...index,
        grouped_ids: index.grouped_ids && index.grouped_ids.length ? index.grouped_ids : [index.id],
        update_count: 1,
      });
      return;
    }

    const existingTs = new Date(existing.created_at || 0).getTime();
    const nextTs = new Date(index.created_at || 0).getTime();
    const latest = nextTs >= existingTs ? index : existing;
    const older = nextTs >= existingTs ? existing : index;

    grouped.set(key, {
      ...older,
      ...latest,
      grouped_ids: Array.from(new Set([...(existing.grouped_ids || [existing.id]), ...(index.grouped_ids || [index.id])])),
      frame_count: Math.max(
        typeof existing.frame_count === 'number' ? existing.frame_count : 0,
        typeof index.frame_count === 'number' ? index.frame_count : 0
      ),
      update_count: (existing.update_count || 1) + 1,
    });
  });

  return Array.from(grouped.values()).sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
};

export default function AdminIndicesV2() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [indices, setIndices] = useState<IndexFile[]>([]);
  const [filteredIndices, setFilteredIndices] = useState<IndexFile[]>([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [fixingIndices, setFixingIndices] = useState(false);
  const [mergingChunks, setMergingChunks] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveEntries, setArchiveEntries] = useState<any[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveRestoreLoading, setArchiveRestoreLoading] = useState(false);
  const [restoringArchiveId, setRestoringArchiveId] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState('');
  const [currentArchiveIndex, setCurrentArchiveIndex] = useState<IndexFile | null>(null);

  useEffect(() => {
    checkAdminAndLoadIndices();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredIndices(indices);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredIndices(
        indices.filter(
          (idx) =>
            idx.file_name.toLowerCase().includes(query) ||
            idx.user_email?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, indices]);

  const checkAdminAndLoadIndices = async () => {
    try {
      const access = await requireAdminClientAccess();
      if (!access.user) {
        router.push('/login');
        return;
      }
      if (access.ok) {
        setIsAdmin(true);
        setUserEmail(access.user.email || '');
        await loadIndices();
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Admin check error:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const loadIndices = async () => {
    try {
      setError(''); // Clear previous errors
      console.log('🔄 Loading indices from API...');
      
      const response = await fetch('/api/admin/indices');
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('Failed to fetch indices:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        setError(errorData.error || errorData.message || `Failed to fetch indices (HTTP ${response.status})`);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Loaded ${data.indices?.length || 0} indices`);
        const collapsed = collapseAdminIndices(data.indices || []);
        setIndices(collapsed);
        setFilteredIndices(collapsed);
        setError(''); // Clear any previous errors
      } else {
        console.error('API returned error:', data);
        setError(data.error || data.message || 'Failed to load indices');
      }
    } catch (error) {
      console.error('Failed to load indices:', error);
      setError(`Failed to load indices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async (indexId: string, groupedIds?: string[]) => {
    if (!confirm('Are you sure you want to delete this index? This action cannot be undone.')) {
      return;
    }

    try {
      let response: Response;
      if (Array.isArray(groupedIds) && groupedIds.length > 1) {
        // Bulk delete all parts
        response = await fetch('/api/admin/indices', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: groupedIds })
        });
      } else {
        response = await fetch('/api/admin/indices', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [indexId] })
        });
      }

      const data = await response.json();
      if (data.success) {
        await loadIndices();
      } else {
        setError(data.error || 'Failed to delete index');
      }
    } catch (error) {
      console.error('Failed to delete index:', error);
      setError('Failed to delete index');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleFixUserIndices = async () => {
    if (!userEmail) {
      alert('User email not found');
      return;
    }

    try {
      setFixingIndices(true);
      const response = await fetch('/api/fix-user-indices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${data.message}\n\nFixed ${data.fixedCount} indices. Refreshing...`);
        await loadIndices();
      } else {
        alert(`❌ Failed to fix indices: ${data.error}`);
      }
    } catch (error) {
      console.error('Error fixing indices:', error);
      alert('Error fixing indices');
    } finally {
      setFixingIndices(false);
    }
  };

  const handleMergeChunks = async () => {
    if (!userEmail) {
      alert('User email not found');
      return;
    }

    try {
      setMergingChunks(true);
      const response = await fetch('/api/merge-chunks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${data.message}\n\nMerged ${data.mergedCount} chunks into ${data.mergedFiles?.length || 0} complete indices. Refreshing...`);
        await loadIndices();
      } else {
        alert(`❌ Failed to merge chunks: ${data.error}`);
      }
    } catch (error) {
      console.error('Error merging chunks:', error);
      alert('Error merging chunks');
    } finally {
      setMergingChunks(false);
    }
  };

  const handleClearAllIndices = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL indices from ALL users!\n\nThis action cannot be undone. Are you absolutely sure?')) {
      return;
    }

    if (!confirm('Are you REALLY sure? This will permanently delete all index data.')) {
      return;
    }

    try {
      setClearingAll(true);
      const userData = localStorage.getItem('figma_web_user');
      if (!userData) {
        alert('User not found');
        return;
      }

      const user = JSON.parse(userData);
      if (!user.api_key) {
        alert('API key not found');
        return;
      }

      const response = await fetch('/api/admin/clear-all-indices', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.api_key}`
        }
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Successfully deleted all ${data.deletedCount} indices.\n\nYou can now upload new indices through the plugin.`);
        await loadIndices();
      } else {
        alert(`❌ Failed to clear indices: ${data.error}`);
      }
    } catch (error) {
      console.error('Error clearing all indices:', error);
      alert('Error clearing all indices');
    } finally {
      setClearingAll(false);
    }
  };

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleString() : 'Unknown';

  const handleCloseArchiveDialog = () => {
    setArchiveDialogOpen(false);
    setArchiveEntries([]);
    setCurrentArchiveIndex(null);
    setArchiveError('');
    setArchiveLoading(false);
    setArchiveRestoreLoading(false);
    setRestoringArchiveId(null);
  };

  const handleShowArchives = async (index: IndexFile) => {
    setArchiveError('');
    setArchiveEntries([]);
    setCurrentArchiveIndex(index);
    setArchiveDialogOpen(true);
    setArchiveLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('projectId', index.project_id || 'null');
      params.set('fileKey', index.figma_file_key || 'null');
      const response = await fetch(`/api/admin/index-archives?${params.toString()}`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to load archives');
      }
      setArchiveEntries(Array.isArray(data.archives) ? data.archives : []);
    } catch (error: any) {
      console.error('Failed to load archives:', error);
      setArchiveError(error?.message || 'Failed to load archive entries');
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleRestoreArchive = async (archiveId: string) => {
    setArchiveRestoreLoading(true);
    setRestoringArchiveId(archiveId);
    try {
      const response = await fetch('/api/admin/index-archives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archiveId }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to restore archive');
      }
      alert('Archive restored successfully');
      handleCloseArchiveDialog();
      await loadIndices();
    } catch (error: any) {
      console.error('Restore failed:', error);
      setArchiveError(error?.message || 'Failed to restore archive');
    } finally {
      setArchiveRestoreLoading(false);
      setRestoringArchiveId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => router.push('/admin')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            Index Management
          </Typography>
        </Box>
        {userEmail && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="warning"
              startIcon={fixingIndices ? <CircularProgress size={20} /> : <Build />}
              onClick={handleFixUserIndices}
              disabled={fixingIndices || mergingChunks || clearingAll}
            >
              {fixingIndices ? 'Fixing...' : 'Fix My Indices'}
            </Button>
            <Button
              variant="contained"
              color="info"
              startIcon={mergingChunks ? <CircularProgress size={20} /> : <Build />}
              onClick={handleMergeChunks}
              disabled={fixingIndices || mergingChunks || clearingAll}
            >
              {mergingChunks ? 'Merging...' : 'Merge All Chunks'}
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={clearingAll ? <CircularProgress size={20} /> : <Warning />}
              onClick={handleClearAllIndices}
              disabled={fixingIndices || mergingChunks || clearingAll}
            >
              {clearingAll ? 'Deleting...' : 'Delete All Indices'}
            </Button>
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search by file name or user email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>File Name</TableCell>
              <TableCell>User Email</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Frames</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredIndices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary">
                    {searchQuery ? 'No indices found matching your search' : 'No indices found'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredIndices.map((index: any) => (
                <TableRow key={index.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <span>{index.file_name}</span>
                      {(index.update_count || 1) > 1 && (
                        <Chip size="small" variant="outlined" label={`${index.update_count} updates`} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{index.user_email || '-'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={index.source || 'Plugin'} 
                      size="small"
                      color={index.source === 'API' ? 'primary' : 'default'}
                      variant={index.source === 'API' ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell>{typeof index.frame_count === 'number' ? index.frame_count : '-'}</TableCell>
                  <TableCell>
                    {index.created_at 
                      ? new Date(index.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Invalid Date'}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View archive versions">
                      <IconButton size="small" onClick={() => handleShowArchives(index)}>
                        <History />
                      </IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={() => handleDelete(index.id, index.grouped_ids)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog
        open={archiveDialogOpen}
        onClose={handleCloseArchiveDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Archived versions for {currentArchiveIndex?.file_name || 'this index'}
        </DialogTitle>
        <DialogContent dividers>
          {archiveError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {archiveError}
            </Alert>
          )}
          {archiveLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : archiveEntries.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No archived versions found.
            </Typography>
          ) : (
            <List disablePadding>
              {archiveEntries.map((archive) => (
                <ListItem
                  key={archive.id}
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <ListItemText
                    primary={archive.file_name || 'Archived version'}
                    secondary={`Archived: ${formatDate(archive.archived_at)} • Uploaded: ${formatDate(
                      archive.uploaded_at
                    )} • Size: ${archive.file_size ? formatFileSize(archive.file_size) : 'Unknown'}`}
                    sx={{ mr: 2 }}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleRestoreArchive(archive.id)}
                    disabled={archiveRestoreLoading && restoringArchiveId === archive.id}
                    startIcon={<Restore />}
                  >
                    Restore
                  </Button>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseArchiveDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
