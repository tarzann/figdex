import { useEffect, useState, Fragment } from 'react';
import { useRouter } from 'next/router';
import { Box, Container, Typography, Card, CardMedia, CircularProgress, Alert, Button, Modal, IconButton, TextField } from '@mui/material';
import Masonry from 'react-masonry-css';
import HomeIcon from '@mui/icons-material/Home';

const breakpointColumnsObj = { default: 5, 1600: 4, 1200: 3, 900: 2, 600: 1 };
const modalStyle = { bgcolor: '#fff', p: 2, outline: 'none', maxWidth: '95vw', maxHeight: '90vh' } as const;

export default function PublicUserIndex() {
  const router = useRouter();
  const { slug } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [frames, setFrames] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (slug && typeof slug === 'string') {
      loadUserPublicIndex(slug);
    }
  }, [slug]);

  // initialize query from URL (?q=)
  useEffect(() => {
    const q = typeof router.query.q === 'string' ? router.query.q : '';
    setQuery(q);
  }, [router.query.q]);

  const loadUserPublicIndex = async (s: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/public/u/${encodeURIComponent(s)}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to load public index');
        return;
      }
      setUserInfo(data.user);
      setFrames((data.frames || []).map((f: any, idx: number) => ({
        ...f,
        // Normalize a thumbnail image field
        thumb: f.thumbnails?.[0]?.image ? { image: f.thumbnails[0].image, label: f.name || '' } : {
          image: f.image || '',
          label: f.name || ''
        },
        _idx: idx
      })));
    } catch (e) {
      setError('Failed to load public index');
    } finally {
      setLoading(false);
    }
  };

  const visible = frames.filter(f => f.thumb && f.thumb.image);

  const normalize = (s: string) => (s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const words = normalize(query).split(' ').filter(Boolean);

  const matches = (f: any) => {
    if (words.length === 0) return true;
    const hay = normalize([
      f.name,
      f.textContent,
      f.texts,
      Array.isArray(f.searchTokens) ? f.searchTokens.join(' ') : ''
    ].filter(Boolean).join(' '));
    return words.every(w => hay.includes(w));
  };

  const filtered = visible.filter(matches);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>
        <Button variant="contained" startIcon={<HomeIcon />} onClick={() => router.push('/')}>Go Home</Button>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAFAFA' }}>
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #eee', py: 3, mb: 4 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 300, color: '#1a1a1a', mb: 1 }}>
                {userInfo?.full_name || userInfo?.email || userInfo?.slug || 'Public Index'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                {filtered.length} / {visible.length} frames • Public FigDex
              </Typography>
            </Box>
            <Button variant="outlined" startIcon={<HomeIcon />} onClick={() => router.push('/')} sx={{ textTransform: 'none' }}>
              FigDex Home
            </Button>
          </Box>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              placeholder="Search frames…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              size="small"
            />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl">
        {visible.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" sx={{ color: '#666' }}>No frames found</Typography>
          </Box>
        ) : (
          <Masonry breakpointCols={breakpointColumnsObj} className="masonry-grid" columnClassName="masonry-grid_column">
            {filtered.map((item, idx) => (
              <Card key={`${item._idx}-${idx}`} sx={{ mb: 2 }}>
                <a href={item.url || '#'} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <CardMedia component="img" image={item.thumb.image} alt={item.thumb.label} sx={{ width: '100%', display: 'block' }} />
                </a>
              </Card>
            ))}
          </Masonry>
        )}
      </Container>

      <style jsx global>{`
        .masonry-grid { display: flex; margin-left: -16px; width: auto; }
        .masonry-grid_column { padding-left: 16px; background-clip: padding-box; }
        .masonry-grid_column > div { margin-bottom: 16px; }
      `}</style>
    </Box>
  );
}

