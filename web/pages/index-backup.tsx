// pages/index.tsx
import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  TextField,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Grid,
  Modal,
  IconButton,
  Tooltip,
  Button,
  Chip,
  Stack,
  Alert,
  CircularProgress
} from '@mui/material';
import { useRouter } from 'next/router';
import Masonry from 'react-masonry-css';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
// import Header from '../components/Header';

type Thumbnail = {
  thumbName: string;
  label: string;
  url: string;
  texts: string;
  image: string;
};

type Frame = {
  name: string;
  image?: string; // Made optional
  thumbnails: Thumbnail[];
  url?: string; // Optional Figma file link
};

// Default empty frames array - will be loaded dynamically
let frames: Frame[] = [];

const modalStyle = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 2,
  borderRadius: 2,
  maxWidth: '90vw',
  maxHeight: '90vh',
  outline: 'none',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

// Add Figma SVG icon as a React component
const FigmaIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="12" fill="#fff"/>
    <path d="M12 12a3 3 0 1 0 0-6h-3v6h3Z" fill="#0ACF83"/>
    <path d="M9 18a3 3 0 1 0 0-6h3v3a3 3 0 0 1-3 3Z" fill="#A259FF"/>
    <path d="M6 9a3 3 0 0 1 3-3v6a3 3 0 0 1-3-3Z" fill="#F24E1E"/>
    <path d="M15 6h-3v6h3a3 3 0 1 0 0-6Z" fill="#FF7262"/>
    <path d="M15 15a3 3 0 0 0-3-3v6a3 3 0 0 0 3-3Z" fill="#1ABCFE"/>
  </svg>
);

export default function Home() {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
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

  // טען מועדפים מ-localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const favs = localStorage.getItem('favorites');
      setFavorites(favs ? JSON.parse(favs) : []);
    } catch {}
  }, []);
  // שמור מועדפים ל-localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (thumbName: string) => {
    setFavorites((prev) =>
      prev.includes(thumbName)
        ? prev.filter((f) => f !== thumbName)
        : [...prev, thumbName]
    );
  };

  // 1. צור מערך שטוח של כל התמונות מכל העמודים
  const allGalleryThumbs = useMemo(() => {
    let idx = 0;
    return frames.flatMap((frame) =>
      frame.thumbnails.map((thumb) => ({
        frame,
        thumb,
        index: idx++,
      }))
    );
  }, [frames]);

  // סינון התמונות בגלריה לפי חיפוש טקסט (שם עמוד, label, texts)
  const filteredThumbs = useMemo(() => {
    if (!search.trim()) return allGalleryThumbs;
    const q = search.toLowerCase();
    return allGalleryThumbs.filter(({ frame, thumb }) =>
      frame.name.toLowerCase().includes(q) ||
      (thumb.label && thumb.label.toLowerCase().includes(q)) ||
      (thumb.texts && thumb.texts.toLowerCase().includes(q))
    );
  }, [allGalleryThumbs, search]);

  // סינון לפי מועדפים
  const visibleThumbs = useMemo(() => {
    let thumbs = filteredThumbs;
    if (showFavorites) {
      thumbs = thumbs.filter((t) => favorites.includes(t.thumb.thumbName));
    }
    return thumbs;
  }, [filteredThumbs, showFavorites, favorites]);

  // 2. הצג את כל התמונות בגלריה אחת (Masonry)
  // 3. modal יאפשר ניווט בין כל התמונות בגלריה
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const modalThumb = modalIndex !== null ? allGalleryThumbs[modalIndex] : null;

  const handleOpenModal = (idx: number) => {
    setModalIndex(idx);
    setModalOpen(true);
  };
  const handleCloseModal = () => {
    setModalOpen(false);
    setModalIndex(null);
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Keyboard navigation in modal
  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setModalIndex((i) =>
          i !== null && i < allGalleryThumbs.length - 1 ? i + 1 : i
        );
      } else if (e.key === "ArrowLeft") {
        setModalIndex((i) => (i !== null && i > 0 ? i - 1 : i));
      } else if (e.key === "Escape") {
        setModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, allGalleryThumbs.length]);

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
          startIcon={<FolderOpenIcon />}
        >
          בחר פרויקט אחר
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ direction: 'ltr', bgcolor: '#f7f9fa', minHeight: '100vh' }}>
      {/* <Header /> */}
      <Box sx={{ p: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h3" fontWeight={700} sx={{ letterSpacing: 1 }}>
            Indexo
          </Typography>
          <Button 
            variant="outlined" 
            onClick={() => router.push('/projects')}
            startIcon={<FolderOpenIcon />}
          >
            כל הפרויקטים
          </Button>
        </Box>
      
      {currentIndexFile && (
        <Typography variant="body2" color="text.secondary" mb={2}>
          מציג: {currentIndexFile}
        </Typography>
      )}
      {/* בראש הדף: */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <TextField
          label="Search by frame, label or text"
          variant="outlined"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 350 }}
          placeholder="Type to search..."
          inputProps={{ style: { direction: 'ltr' } }}
        />
        <Button
          variant={showFavorites ? "contained" : "outlined"}
          color="error"
          startIcon={<FavoriteIcon color={showFavorites ? "inherit" : "disabled"} />}
          onClick={() => setShowFavorites((v) => !v)}
          sx={{ height: 40, borderRadius: 2 }}
        >
          {showFavorites ? "Show All" : "Show Favorites"}
        </Button>
      </Stack>
      {/* Tag filter hidden for now */}
      {/*
      <Stack direction="row" spacing={1} sx={{ mb: 4, flexWrap: 'wrap' }}>
        {allTags.map(tag => (
          <Chip
            key={tag}
            label={tag}
            clickable
            color={selectedTags.includes(tag) ? 'primary' : 'default'}
            onClick={() =>
              setSelectedTags(selectedTags.includes(tag)
                ? selectedTags.filter(t => t !== tag)
                : [...selectedTags, tag])
            }
            sx={{ mb: 1 }}
          />
        ))}
      </Stack>
      */}
      <Grid container spacing={4}>
        {/* בגלריה הראשית: */}
        <Masonry
          breakpointCols={{ default: 4, 1200: 3, 900: 2, 600: 1 }}
          className="masonry-grid"
          columnClassName="masonry-grid_column"
          style={{ display: 'flex', gap: 16 }}
        >
          {visibleThumbs.map(({ frame, thumb, index }, idx) => (
            <Box key={thumb.thumbName + idx} sx={{ mb: 2, textAlign: 'center', cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'scale(1.07)' } }}>
              <img
                src={thumb.image}
                alt={thumb.label}
                width={180}
                style={{ borderRadius: 8, border: '1.5px solid #e0e0e0', background: '#fff', marginBottom: 4, width: '100%', maxWidth: 220 }}
                onClick={() => handleOpenModal(idx)}
              />
              <IconButton
                onClick={() => toggleFavorite(thumb.thumbName)}
                color="error"
                sx={{ position: 'absolute', top: 8, right: 8, background: '#fff8', zIndex: 1 }}
                aria-label="Add to favorites"
              >
                {favorites.includes(thumb.thumbName) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
              </IconButton>
            </Box>
          ))}
        </Masonry>
      </Grid>
      {allGalleryThumbs.length === 0 && (
        <Typography sx={{ mt: 6, fontSize: 20 }} color="text.secondary">
          No results found.
        </Typography>
      )}
      {/* במודל: */}
      <Modal open={modalOpen} onClose={handleCloseModal} aria-labelledby="modal-title" aria-describedby="modal-desc">
        <Box sx={modalStyle}>
          {modalThumb && (
            <>
              <img
                src={modalThumb.thumb.image}
                alt={modalThumb.thumb.label}
                style={{ maxWidth: '60vw', maxHeight: '60vh', borderRadius: 8, marginBottom: 16, boxShadow: '0 4px 24px #0002' }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
                {modalThumb.frame.name}
              </Typography>
              {(modalThumb?.frame.url || modalThumb?.thumb.url) && (
                <Button
                  variant="contained"
                  color="primary"
                  href={modalThumb.frame.url || modalThumb.thumb.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ mb: 1 }}
                  startIcon={<FigmaIcon />}
                >
                  Open in Figma file
                </Button>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2, width: '100%' }}>
                <IconButton
                  onClick={() => setModalIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
                  disabled={modalIndex === 0}
                  size="large"
                >
                  <ArrowBackIosNewIcon />
                </IconButton>
                <Box sx={{ width: 32 }} />
                <IconButton
                  onClick={() => setModalIndex((i) => (i !== null && i < allGalleryThumbs.length - 1 ? i + 1 : i))}
                  disabled={modalIndex === null || modalIndex === allGalleryThumbs.length - 1}
                  size="large"
                >
                  <ArrowForwardIosIcon />
                </IconButton>
              </Box>
            </>
          )}
        </Box>
      </Modal>
    </Box>
  </Box>
  );
}
