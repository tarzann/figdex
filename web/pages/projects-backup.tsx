import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  FolderOpen as FolderOpenIcon,
  Description as DescriptionIcon,
  Image as ImageIcon,
  Schedule as ScheduleIcon,
  Storage as StorageIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import Header from '../components/Header';

type IndexFile = {
  filename: string;
  projectId: string;
  figmaFileKey: string;
  fileName: string;
  timestamp: string;
  uploadedAt: string;
  size: number;
  frameCount: number;
  thumbnailCount: number;
};

export default function Projects() {
  const [files, setFiles] = useState<IndexFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/index-files');
      const data = await response.json();
      
      if (data.success) {
        setFiles(data.files);
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewIndex = (filename: string) => {
    router.push(`/?index=${encodeURIComponent(filename)}`);
  };

  const handleRefresh = () => {
    loadFiles();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f7f9fa', minHeight: '100vh' }}>
      <Header />
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            פרויקטי אינדקס
          </Typography>
          <Tooltip title="רענן">
            <IconButton onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {files.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <DescriptionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              אין קבצי אינדקס
            </Typography>
            <Typography color="text.secondary">
              העלה אינדקס מהפלאגין כדי לראות אותו כאן
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
          {files.map((file) => (
            <Box key={file.filename}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out'
                  }
                }}
                onClick={() => handleViewIndex(file.filename)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <FolderOpenIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" component="h2" noWrap>
                      {file.fileName}
                    </Typography>
                  </Box>

                  <Stack spacing={1} mb={2}>
                    <Box display="flex" alignItems="center">
                      <ImageIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {file.frameCount} עמודים, {file.thumbnailCount} תמונות
                      </Typography>
                    </Box>

                    <Box display="flex" alignItems="center">
                      <StorageIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {formatFileSize(file.size)}
                      </Typography>
                    </Box>

                    <Box display="flex" alignItems="center">
                      <ScheduleIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(file.uploadedAt)}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    <Chip 
                      label={`Figma: ${file.figmaFileKey.slice(0, 8)}...`} 
                      size="small" 
                      variant="outlined"
                    />
                    <Chip 
                      label={`ID: ${file.projectId.slice(0, 8)}...`} 
                      size="small" 
                      variant="outlined"
                    />
                  </Stack>
                </CardContent>

                <Box sx={{ p: 2, pt: 0 }}>
                  <Button 
                    variant="contained" 
                    fullWidth
                    startIcon={<FolderOpenIcon />}
                  >
                    צפה באינדקס
                  </Button>
                </Box>
              </Card>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  </Box>
  );
} 