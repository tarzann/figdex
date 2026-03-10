import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import { useRouter } from 'next/router';

type Thumbnail = {
  thumbName: string;
  label: string;
  url: string;
  texts: string;
  image: string;
};

type Frame = {
  name: string;
  image?: string;
  thumbnails: Thumbnail[];
  url?: string;
};

export default function Home() {
  const router = useRouter();
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndexFile, setCurrentIndexFile] = useState('');

  // Load index data
  useEffect(() => {
    const loadIndexData = async () => {
      try {
        setLoading(true);
        setError('');
        
        const { index } = router.query;
        let filename = '';
        
        if (index && typeof index === 'string') {
          // Load specific index file
          filename = decodeURIComponent(index);
          setCurrentIndexFile(filename);
          
          const response = await fetch(`/api/index-data?filename=${encodeURIComponent(filename)}`);
          const data = await response.json();
          
          if (data.success) {
            setFrames(data.data.indexData.frames || []);
          } else {
            setError('Failed to load index data');
            setFrames([]);
          }
        } else {
          // Load default index file
          try {
            const defaultData = await import('../data/Frames-Index.json');
            setFrames(defaultData.data.frames || []);
            setCurrentIndexFile('Frames-Index.json');
          } catch (err) {
            setError('No default index file found');
            setFrames([]);
          }
        }
      } catch (err) {
        setError('Error loading index data');
        console.error('Error loading index data:', err);
        setFrames([]);
      } finally {
        setLoading(false);
      }
    };

    if (router.isReady) {
      loadIndexData();
    }
  }, [router.isReady, router.query.index]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => router.push('/projects')}
        >
          בחר פרויקט אחר
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, bgcolor: '#f7f9fa', minHeight: '100vh' }}>
      <Typography variant="h3" gutterBottom>
        Indexo
      </Typography>
      
      {currentIndexFile && (
        <Typography variant="body2" color="text.secondary" mb={2}>
          מציג: {currentIndexFile}
        </Typography>
      )}

      <Typography variant="h5" gutterBottom>
        Frames: {frames.length}
      </Typography>

      <Button 
        variant="outlined" 
        onClick={() => router.push('/projects')}
        sx={{ mt: 2 }}
      >
        כל הפרויקטים
      </Button>

      {frames.map((frame, index) => (
        <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'white', borderRadius: 1 }}>
          <Typography variant="h6">{frame.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            Thumbnails: {frame.thumbnails?.length || 0}
          </Typography>
        </Box>
      ))}
    </Box>
  );
} 