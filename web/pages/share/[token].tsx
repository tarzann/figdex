import { useState, useEffect, useLayoutEffect, useMemo, useRef, Fragment } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  TextField,
  Typography,
  Card,
  CardMedia,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Chip,
  MenuItem,
  Collapse,
  ListItemButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  PaginationItem,
  Stack,
} from '@mui/material';
import Masonry from 'react-masonry-css';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import HomeIcon from '@mui/icons-material/Home';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import CategoryIcon from '@mui/icons-material/Category';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';

// Version tracking - Update this number for each fix/change
const PAGE_VERSION = 'v1.29.0'; // New sharing system: user-level sharing for all indices and search results
const PAGE_VERSION_BUILD_DATE = new Date().toISOString().slice(0, 16).replace('T', ' '); // Auto-generated build timestamp

// Helper functions (from gallery.tsx)
const deriveNamingTags = (rawName: string): string[] => {
  try {
    if (!rawName) return [];
    const cleaned = rawName.replace(/^Thumbnail:\s*/i, '').trim();
    const parts = cleaned.split(/[\-_/\s]+/).filter(Boolean);
    const isAlphaNum = (s: string) => /^[a-z0-9]+$/i.test(s);
    const isSize = (s: string) => /^\d+x\d+$/i.test(s);
    const tokens = parts
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .filter(p => !(p.length === 1 && !isAlphaNum(p)))
      .filter(p => !isSize(p));
    return Array.from(new Set(tokens));
  } catch {
    return [];
  }
};

const getSizeTag = (w?: number, h?: number): string | null => {
  if (!w || !h) return null;
  const W = Math.round(w);
  const H = Math.round(h);
  if (W > 0 && H > 0) return `${W}x${H}`;
  return null;
};

const collectFrameText = (frame: any): string => {
  if (!frame) return '';
  const fragments: string[] = [];
  const pushString = (value?: unknown) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (trimmed) fragments.push(trimmed);
  };
  const pushArray = (value?: unknown) => {
    if (!Array.isArray(value)) return;
    value.forEach((item) => pushString(item));
  };
  pushString(frame.texts);
  pushString(frame.textContent);
  pushString(frame.visibleTexts);
  pushArray(frame.textFragments);
  if (Array.isArray(frame.searchTokens)) {
    pushString(frame.searchTokens.join(' '));
  }
  const deduped: string[] = [];
  const seen = new Set<string>();
  fragments.forEach((fragment) => {
    if (seen.has(fragment)) return;
    seen.add(fragment);
    deduped.push(fragment);
  });
  const combined = deduped.join(' ');
  return combined.length > 4000 ? `${combined.slice(0, 4000)}…` : combined;
};

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

export default function SharedIndex() {
  const router = useRouter();
  const { token } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [indexData, setIndexData] = useState<any>(null);
  const [frames, setFrames] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  
  // Filter sidebar state
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState({
    frameTags: true,
    customTags: true
  });
  const [selectedNamingTags, setSelectedNamingTags] = useState<string[]>([]);
  const [selectedSizeTags, setSelectedSizeTags] = useState<string[]>([]);
  const [selectedCustomTags, setSelectedCustomTags] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLDivElement | null>(null);

  const filterCardSx = {
    mb: 3,
    borderRadius: 3,
    border: '1px solid #e0e0e0',
    boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
    backgroundColor: '#fff',
    p: 1.5,
    height: 240,
    overflowY: 'auto',
  };

  // Share type state
  const [shareType, setShareType] = useState<'all_indices' | 'search_results' | 'index' | null>(null);
  const [userInfo, setUserInfo] = useState<{ id: string; email: string; full_name: string | null } | null>(null);
  const [searchParams, setSearchParams] = useState<any>(null);

  useEffect(() => {
    if (token && typeof token === 'string') {
      loadSharedView(token);
    }
  }, [token]);

  const loadSharedView = async (shareToken: string) => {
    try {
      setLoading(true);
      setError('');
      
      // Try new shared view API first
      const response = await fetch(`/api/public/shared-view/${shareToken}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          // New sharing system
          setShareType(data.shareType);
          setUserInfo(data.user);
          
          if (data.shareType === 'all_indices') {
            // Load all indices for this user
            await loadAllIndicesForUser(data.user.id, data.user.email);
          } else if (data.shareType === 'search_results') {
            // Load search results
            setSearchParams(data.searchParams || {});
            await loadSearchResults(data.user.id, data.user.email, data.searchParams || {});
          }
          return;
        }
      }
      
      // Fallback: Try old index-level sharing (for backward compatibility)
      // Only if new API returns 404 (not found), not 500 (server error)
      if (response.status === 404) {
        const oldResponse = await fetch(`/api/public/index/${shareToken}`);
        
        if (oldResponse.ok) {
          const oldData = await oldResponse.json();

          if (oldData.success) {
            // Old system: single index
            setIndexData(oldData.data);
            
            // Process frames - handle different data structures
            let processedFrames: any[] = [];
            const indexDataField = oldData.data?.index_data;
            
            if (indexDataField) {
              if (Array.isArray(indexDataField)) {
                processedFrames = indexDataField.flatMap((item: any) => {
                  if (item.frames && Array.isArray(item.frames)) {
                    return item.frames.map((frame: any) => ({
                      ...frame,
                      frameTags: frame.frameTags || frame.tags || [],
                      customTags: frame.customTags || [],
                      thumbnails: frame.thumbnails || [],
                      namingTags: deriveNamingTags(frame.name || ''),
                      sizeTags: getSizeTag(frame.width, frame.height) ? [getSizeTag(frame.width, frame.height)] : []
                    }));
                  }
                  if (item.name && (item.image || item.url)) {
                    return [{
                      ...item,
                      frameTags: item.frameTags || item.tags || [],
                      customTags: item.customTags || [],
                      thumbnails: item.thumbnails || [],
                      namingTags: deriveNamingTags(item.name || ''),
                      sizeTags: getSizeTag(item.width, item.height) ? [getSizeTag(item.width, item.height)] : []
                    }];
                  }
                  return [];
                });
              } else if (indexDataField.data) {
                if (Array.isArray(indexDataField.data.pages)) {
                  processedFrames = indexDataField.data.pages.flatMap((page: any) =>
                    page.frames && Array.isArray(page.frames)
                      ? page.frames.map((frame: any) => ({
                          ...frame,
                          frameTags: frame.frameTags || frame.tags || [],
                          customTags: frame.customTags || [],
                          thumbnails: frame.thumbnails || [],
                          namingTags: deriveNamingTags(frame.name || ''),
                          sizeTags: getSizeTag(frame.width, frame.height) ? [getSizeTag(frame.width, frame.height)] : []
                        }))
                      : []
                  );
                } else if (Array.isArray(indexDataField.data.frames)) {
                  processedFrames = indexDataField.data.frames.map((frame: any) => ({
                    ...frame,
                    frameTags: frame.frameTags || frame.tags || [],
                    customTags: frame.customTags || [],
                    thumbnails: frame.thumbnails || [],
                    namingTags: deriveNamingTags(frame.name || ''),
                    sizeTags: getSizeTag(frame.width, frame.height) ? [getSizeTag(frame.width, frame.height)] : []
                  }));
                }
              } else if (indexDataField.pages && Array.isArray(indexDataField.pages)) {
                processedFrames = indexDataField.pages.flatMap((page: any) =>
                  page.frames && Array.isArray(page.frames)
                    ? page.frames.map((frame: any) => ({
                        ...frame,
                        frameTags: frame.frameTags || frame.tags || [],
                        customTags: frame.customTags || [],
                        thumbnails: frame.thumbnails || [],
                        namingTags: deriveNamingTags(frame.name || ''),
                        sizeTags: getSizeTag(frame.width, frame.height) ? [getSizeTag(frame.width, frame.height)] : []
                      }))
                    : []
                );
              }
            }
            
            setFrames(processedFrames);
            setShareType('index'); // Mark as old index-level sharing
            return;
          }
        }
      }
      
      // If we get here, both APIs failed
      const errorData = await response.json().catch(() => ({ error: 'Failed to load shared view' }));
      setError(errorData.error || 'Failed to load shared view');
      return;
    } catch (err) {
      console.error('Failed to load shared view:', err);
      setError('Failed to load shared view');
    } finally {
      setLoading(false);
    }
  };

  // Load all indices for a user (for all_indices share type)
  const loadAllIndicesForUser = async (userId: string, userEmail: string) => {
    try {
      if (!userEmail) {
        console.error('User email not provided');
        setFrames([]);
        return;
      }
      
      // Get all indices for this user
      const indicesResponse = await fetch(`/api/get-indices?userEmail=${encodeURIComponent(userEmail)}`);
      const indicesData = await indicesResponse.json();

      if (!indicesData.success || !Array.isArray(indicesData.data) || indicesData.data.length === 0) {
        setFrames([]);
        return;
      }

      // Load all frames from all indices in parallel
      const loadIndexFrames = async (indexFile: any) => {
        try {
          const indexResponse = await fetch(`/api/get-index-data?indexId=${indexFile.id}`);
          if (!indexResponse.ok) return { success: false, frames: [] };
          
          const indexData = await indexResponse.json();
          if (!indexData.success || !indexData.data?.index_data) {
            return { success: false, frames: [] };
          }

          // Process index_data
          let indexDataContent = indexData.data.index_data;
          if (typeof indexDataContent === 'string') {
            try {
              indexDataContent = JSON.parse(indexDataContent);
            } catch (e) {
              return { success: false, frames: [] };
            }
          }

          const fileFrames = Array.isArray(indexDataContent)
            ? indexDataContent.flatMap((item: any) => {
                if (!item) return [];
                if (item.frames && Array.isArray(item.frames)) {
                  return item.frames.map((frame: any) => ({
                    ...frame,
                    frameTags: frame.frameTags || frame.tags || [],
                    customTags: frame.customTags || [],
                    namingTags: deriveNamingTags(frame.name || ''),
                    sizeTags: getSizeTag(frame.width, frame.height) ? [getSizeTag(frame.width, frame.height)] : []
                  }));
                }
                if (item.name && (item.image || item.url)) {
                  return [{
                    ...item,
                    frameTags: item.frameTags || item.tags || [],
                    customTags: item.customTags || [],
                    namingTags: deriveNamingTags(item.name || ''),
                    sizeTags: getSizeTag(item.width, item.height) ? [getSizeTag(item.width, item.height)] : []
                  }];
                }
                return [];
              })
            : [];

          return { success: true, frames: fileFrames };
        } catch (error) {
          console.error(`Error loading index ${indexFile.id}:`, error);
          return { success: false, frames: [] };
        }
      };

      const loadPromises = indicesData.data.map((file: any) => loadIndexFrames(file));
      const results = await Promise.all(loadPromises);

      const allFrames: any[] = [];
      results.forEach(result => {
        if (result.success && result.frames.length > 0) {
          allFrames.push(...result.frames);
        }
      });

      setFrames(allFrames);
    } catch (err) {
      console.error('Failed to load all indices:', err);
      setError('Failed to load indices');
    }
  };

  // Load search results (for search_results share type)
  const loadSearchResults = async (userId: string, userEmail: string, params: any) => {
    try {
      // First load all indices
      await loadAllIndicesForUser(userId, userEmail);

      // Then apply search filters
      // The filtering will be done in the filteredThumbs useMemo based on searchParams
    } catch (err) {
      console.error('Failed to load search results:', err);
      setError('Failed to load search results');
    }
  };

  const toggleFilterExpansion = (filterType: keyof typeof filtersExpanded) => {
    setFiltersExpanded(prev => ({
      ...prev,
      [filterType]: !prev[filterType]
    }));
  };

  const clearAllFilters = () => {
    setSelectedNamingTags([]);
    setSelectedSizeTags([]);
    setSelectedCustomTags([]);
    setSearch('');
  };

  // Get unique tags from frames
  const getFilterOptions = useMemo(() => {
    const namingTags = new Set<string>();
    const sizeTags = new Set<string>();
    const customTags = new Set<string>();

    frames.forEach(frame => {
      const nTags = (frame as any).namingTags || deriveNamingTags(frame.name || '');
      nTags.forEach((t: string) => namingTags.add(t));
      const sTag = ((frame as any).sizeTags && (frame as any).sizeTags[0]) || getSizeTag((frame as any).width, (frame as any).height);
      if (sTag) sizeTags.add(sTag);
      if ((frame as any).customTags && Array.isArray((frame as any).customTags)) {
        (frame as any).customTags.forEach((tag: string) => customTags.add(tag));
      }
    });

    return {
      namingTags: Array.from(namingTags).sort(),
      sizeTags: Array.from(sizeTags).sort(),
      customTags: Array.from(customTags).sort()
    };
  }, [frames]);

  // Create flat array of all thumbnails
  const allGalleryThumbs = useMemo(() => {
    let idx = 0;
    return frames.map((frame) => {
      const textBundle = collectFrameText(frame);
      return ({
        frame: {
          name: frame.name || 'Untitled Frame',
          url: frame.url || '',
          width: (frame as any).width,
          height: (frame as any).height,
          frameTags: (frame as any).frameTags || (frame as any).tags || [],
          namingTags: (frame as any).namingTags || deriveNamingTags(frame.name || ''),
          sizeTags: (frame as any).sizeTags || (getSizeTag((frame as any).width, (frame as any).height) ? [getSizeTag((frame as any).width, (frame as any).height)] : []),
          customTags: (frame as any).customTags || [],
          textSnippet: textBundle,
        },
        thumb: {
          thumbName: frame.name || `frame_${idx}`,
          label: frame.name || 'Untitled Frame',
          image: frame.image || '',
          texts: textBundle,
          url: frame.url || ''
        },
        index: idx++,
      });
    });
  }, [frames]);

  // Filter by search (disabled for search_results type)
  const filteredThumbs = useMemo(() => {
    // For search_results type, don't allow additional search (filtering is done via searchParams)
    if (shareType === 'search_results') {
      // Return all thumbs, filtering will be done in advancedFilteredThumbs
      return allGalleryThumbs;
    }
    
    if (!search.trim()) return allGalleryThumbs;
    const q = search.toLowerCase().trim();
    return allGalleryThumbs.filter(({ frame, thumb }) => {
      // Search in frame name
      if (frame.name && frame.name.toLowerCase().includes(q)) return true;
      // Search in label
      if (thumb.label && thumb.label.toLowerCase().includes(q)) return true;
      // Search in texts - use both includes and word boundary search for better matching
      if (thumb.texts) {
        const textsLower = thumb.texts.toLowerCase();
        // Direct includes match
        if (textsLower.includes(q)) return true;
        // Word boundary match for better accuracy (handles "never" vs "nevertheless")
        const wordBoundaryRegex = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (wordBoundaryRegex.test(thumb.texts)) return true;
      }
      // Search in textContent if available (direct from frame) - this is the FULL text, not truncated
      if ((frame as any).textContent) {
        const textContent = String((frame as any).textContent || '');
        const textContentLower = textContent.toLowerCase();
        // Direct includes match
        if (textContentLower.includes(q)) return true;
        // Word boundary match for better accuracy
        const wordBoundaryRegex = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (wordBoundaryRegex.test(textContent)) return true;
      }
      // Search in searchTokens if available (tokenized text) - search in each token
      if ((frame as any).searchTokens && Array.isArray((frame as any).searchTokens)) {
        const tokens = (frame as any).searchTokens.map((t: string) => String(t || '').toLowerCase().trim()).filter(Boolean);
        // Check if query matches any token exactly or as substring (bidirectional)
        if (tokens.some((token: string) => token === q || token.includes(q) || q.includes(token))) return true;
      }
      return false;
    });
  }, [allGalleryThumbs, search, shareType]);

  // Apply filters (disabled for search_results type, apply search params for search_results)
  const advancedFilteredThumbs = useMemo(() => {
    let thumbs = filteredThumbs;

    // For search_results type, apply the saved search params and disable user filters
    if (shareType === 'search_results' && searchParams) {
      // Apply text search from params
      if (searchParams.textSearch && searchParams.textSearch.trim()) {
        const q = searchParams.textSearch.toLowerCase().trim();
        thumbs = thumbs.filter(({ frame, thumb }) => {
          // Search in frame name
          if (frame.name && frame.name.toLowerCase().includes(q)) return true;
          // Search in label
          if (thumb.label && thumb.label.toLowerCase().includes(q)) return true;
          // Search in texts - use both includes and word boundary search for better matching
          if (thumb.texts) {
            const textsLower = thumb.texts.toLowerCase();
            // Direct includes match
            if (textsLower.includes(q)) return true;
            // Word boundary match for better accuracy (handles "never" vs "nevertheless")
            const wordBoundaryRegex = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (wordBoundaryRegex.test(thumb.texts)) return true;
          }
          // Search in textContent if available (direct from frame) - this is the FULL text, not truncated
          if ((frame as any).textContent) {
            const textContent = String((frame as any).textContent || '');
            const textContentLower = textContent.toLowerCase();
            // Direct includes match
            if (textContentLower.includes(q)) return true;
            // Word boundary match for better accuracy
            const wordBoundaryRegex = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (wordBoundaryRegex.test(textContent)) return true;
          }
          // Search in searchTokens if available (tokenized text) - search in each token
          if ((frame as any).searchTokens && Array.isArray((frame as any).searchTokens)) {
            const tokens = (frame as any).searchTokens.map((t: string) => String(t || '').toLowerCase().trim()).filter(Boolean);
            // Check if query matches any token exactly or as substring (bidirectional)
            if (tokens.some((token: string) => token === q || token.includes(q) || q.includes(token))) return true;
          }
          return false;
        });
      }

      // Apply file filter
      if (searchParams.fileFilter) {
        // File filter would need to be matched against frame's file name
        // This is a simplified version - you might need to store file_id with frames
      }

      // Apply tag filters
      if (searchParams.namingTags && Array.isArray(searchParams.namingTags) && searchParams.namingTags.length > 0) {
        thumbs = thumbs.filter(({ frame }) => {
          if (!frame.namingTags || !Array.isArray(frame.namingTags)) return false;
          return searchParams.namingTags.some((tag: string) => frame.namingTags.includes(tag));
        });
      }

      if (searchParams.sizeTags && Array.isArray(searchParams.sizeTags) && searchParams.sizeTags.length > 0) {
        thumbs = thumbs.filter(({ frame }) => {
          if (!frame.sizeTags || !Array.isArray(frame.sizeTags)) return false;
          return searchParams.sizeTags.some((tag: string) => frame.sizeTags.includes(tag));
        });
      }

      if (searchParams.customTags && Array.isArray(searchParams.customTags) && searchParams.customTags.length > 0) {
        thumbs = thumbs.filter(({ frame }) => {
          if (!frame.customTags || !Array.isArray(frame.customTags)) return false;
          return searchParams.customTags.some((tag: string) => frame.customTags.includes(tag));
        });
      }

      // Return filtered results (no user interaction allowed)
      return thumbs;
    }

    // For all_indices type, allow user filters
    if (selectedNamingTags.length > 0) {
      thumbs = thumbs.filter(({ frame }) => {
        if (!frame.namingTags || !Array.isArray(frame.namingTags)) return false;
        return selectedNamingTags.some(tag => frame.namingTags.includes(tag));
      });
    }

    if (selectedSizeTags.length > 0) {
      thumbs = thumbs.filter(({ frame }) => {
        if (!frame.sizeTags || !Array.isArray(frame.sizeTags)) return false;
        return selectedSizeTags.some(tag => frame.sizeTags.includes(tag));
      });
    }

    if (selectedCustomTags.length > 0) {
      thumbs = thumbs.filter(({ frame }) => {
        if (!frame.customTags || !Array.isArray(frame.customTags)) return false;
        return selectedCustomTags.some(tag => frame.customTags.includes(tag));
      });
    }

    return thumbs;
  }, [filteredThumbs, selectedNamingTags, selectedSizeTags, selectedCustomTags]);

  const visibleThumbs = useMemo(() => {
    return advancedFilteredThumbs.map((thumb, idx) => ({
      ...thumb,
      index: idx,
    }));
  }, [advancedFilteredThumbs]);

  const totalPages = Math.max(1, Math.ceil(visibleThumbs.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useLayoutEffect(() => {
    const measureHeader = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };
    measureHeader();
    window.addEventListener('resize', measureHeader);
    return () => window.removeEventListener('resize', measureHeader);
  }, []);

  const pagedThumbs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visibleThumbs.slice(start, start + pageSize);
  }, [visibleThumbs, page, pageSize]);

  const modalThumb = modalIndex !== null ? visibleThumbs[modalIndex] : null;

  const handleOpenModal = (idx: number) => {
    setModalIndex(idx);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalIndex(null);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setModalIndex((i) => i !== null && i < visibleThumbs.length - 1 ? i + 1 : i);
      } else if (e.key === "ArrowLeft") {
        setModalIndex((i) => (i !== null && i > 0 ? i - 1 : i));
      } else if (e.key === "Escape") {
        setModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, visibleThumbs.length]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '400px', gap: 2 }}>
        <CircularProgress />
        <Typography variant="body1" color="text.secondary">
          Loading shared index...
        </Typography>
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
          startIcon={<HomeIcon />}
          onClick={() => router.push('/')}
        >
          Go Home
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ direction: 'ltr', bgcolor: '#f7f9fa', minHeight: '100vh' }}>
      {/* Filter Sidebar - Hidden for search_results type */}
      {shareType !== 'search_results' && (
        <Box
          sx={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: filterDrawerOpen ? 300 : 0,
            height: '100vh',
            flexShrink: 0,
            transition: 'width 0.3s ease',
            overflow: 'hidden',
            bgcolor: 'white',
            borderRight: '1px solid #e0e0e0',
            zIndex: 15
          }}
        >
        <Box sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={600}>
              <FilterListIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Filters
            </Typography>
            <Button 
              size="small" 
              onClick={clearAllFilters}
              startIcon={<ClearAllIcon />}
              sx={{ minWidth: 'auto' }}
            >
              Clear
            </Button>
          </Box>

          {/* Results Count - SECOND */}
          <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
              Results
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {shareType === 'all_indices' 
                ? `Showing ${visibleThumbs.length} of ${allGalleryThumbs.length} frames (${pagedThumbs.length} on page ${page}/${totalPages})`
                : (shareType as string) === 'search_results'
                ? `Showing ${visibleThumbs.length} frames (${pagedThumbs.length} on page ${page}/${totalPages})`
                : `Showing ${visibleThumbs.length} of ${allGalleryThumbs.length} frames (${pagedThumbs.length} on page ${page}/${totalPages})`}
            </Typography>
          </Box>

          {/* Images per page - ADDED */}
          <Box sx={{ mb: 3, p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: '#1a1a1a' }}>
              Images per page
            </Typography>
            <TextField
              select
              size="small"
              value={pageSize}
              onChange={(e) => {
                const value = Number(e.target.value) || 24;
                setPageSize(value);
                setPage(1);
              }}
              fullWidth
              SelectProps={{ displayEmpty: true }}
            >
              {[24, 48, 72].map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Naming Tags Filter */}
          <Box sx={filterCardSx}>
            <ListItemButton 
              onClick={() => toggleFilterExpansion('frameTags')}
              sx={{ px: 0, py: 1 }}
            >
              <CategoryIcon sx={{ mr: 1 }} />
              <Typography variant="subtitle2" sx={{ flex: 1 }}>
                Naming Tags ({selectedNamingTags.length})
              </Typography>
              {filtersExpanded.frameTags ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItemButton>
            <Collapse in={filtersExpanded.frameTags}>
              <Box sx={{ ml: 2, mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {getFilterOptions.namingTags.map((tag) => {
                  const isSelected = selectedNamingTags.includes(tag);
                  return (
                    <Box
                      key={tag}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedNamingTags(prev => prev.filter(t => t !== tag));
                        } else {
                          setSelectedNamingTags(prev => [...prev, tag]);
                        }
                      }}
                      sx={{
                        display: 'inline-block',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: '16px',
                        bgcolor: isSelected ? '#667eea' : '#f5f5f5',
                        color: isSelected ? '#fff' : '#000',
                        fontSize: '0.75rem',
                        fontWeight: 400,
                        lineHeight: 1.2,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: isSelected ? '#5568d3' : '#e8e8e8',
                        }
                      }}
                    >
                      {tag}
                    </Box>
                  );
                })}
              </Box>
            </Collapse>
          </Box>

          {/* Size Tags Filter */}
          <Box sx={filterCardSx}>
            <ListItemButton 
              onClick={() => toggleFilterExpansion('customTags')}
              sx={{ px: 0, py: 1 }}
            >
              <ColorLensIcon sx={{ mr: 1 }} />
              <Typography variant="subtitle2" sx={{ flex: 1 }}>
                Size ({selectedSizeTags.length})
              </Typography>
              {filtersExpanded.customTags ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItemButton>
            <Collapse in={filtersExpanded.customTags}>
              <Box sx={{ ml: 2, mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {getFilterOptions.sizeTags.map((tag) => {
                  const isSelected = selectedSizeTags.includes(tag);
                  return (
                    <Box
                      key={tag}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedSizeTags(prev => prev.filter(t => t !== tag));
                        } else {
                          setSelectedSizeTags(prev => [...prev, tag]);
                        }
                      }}
                      sx={{
                        display: 'inline-block',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: '16px',
                        bgcolor: isSelected ? '#667eea' : '#f5f5f5',
                        color: isSelected ? '#fff' : '#000',
                        fontSize: '0.75rem',
                        fontWeight: 400,
                        lineHeight: 1.2,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: isSelected ? '#5568d3' : '#e8e8e8',
                        }
                      }}
                    >
                      {tag}
                    </Box>
                  );
                })}
              </Box>
            </Collapse>
          </Box>

          {/* Custom Tags Filter */}
          {getFilterOptions.customTags.length > 0 && (
            <Box sx={filterCardSx}>
              <ListItemButton 
                onClick={() => toggleFilterExpansion('frameTags')}
                sx={{ px: 0, py: 1 }}
              >
                <ColorLensIcon sx={{ mr: 1 }} />
                <Typography variant="subtitle2" sx={{ flex: 1 }}>
                  Custom Tags ({selectedCustomTags.length})
                </Typography>
                {filtersExpanded.frameTags ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItemButton>
              <Collapse in={filtersExpanded.frameTags}>
                <Box sx={{ ml: 2, mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {getFilterOptions.customTags.map((tag) => {
                    const isSelected = selectedCustomTags.includes(tag);
                    return (
                      <Box
                        key={tag}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCustomTags(prev => prev.filter(t => t !== tag));
                          } else {
                            setSelectedCustomTags(prev => [...prev, tag]);
                          }
                        }}
                        sx={{
                          display: 'inline-block',
                          px: 1.5,
                          py: 0.5,
                          borderRadius: '16px',
                          bgcolor: isSelected ? '#667eea' : '#f5f5f5',
                          color: isSelected ? '#fff' : '#000',
                          fontSize: '0.75rem',
                          fontWeight: 400,
                          lineHeight: 1.2,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: isSelected ? '#5568d3' : '#e8e8e8',
                          }
                        }}
                      >
                        {tag}
                      </Box>
                    );
                  })}
                </Box>
              </Collapse>
            </Box>
          )}

        </Box>
        </Box>
      )}

      {/* Sticky Header */}
      <Box
        ref={headerRef}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 16,
          backgroundColor: '#f7f9fa',
          ml: (shareType !== 'search_results' && filterDrawerOpen) ? '300px' : 0,
          transition: 'margin-left 0.3s ease',
          width: (shareType !== 'search_results' && filterDrawerOpen) ? 'calc(100% - 300px)' : '100%'
        }}
      >
        <Box sx={{ px: 4, pt: 2, pb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              {shareType !== 'search_results' && (
                <IconButton
                  onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
                  sx={{ 
                    bgcolor: filterDrawerOpen ? '#667eea' : 'white',
                    color: filterDrawerOpen ? 'white' : '#667eea',
                    boxShadow: 1,
                    '&:hover': { boxShadow: 2 }
                  }}
                >
                  <FilterListIcon />
                </IconButton>
              )}
              <Typography variant="h3" fontWeight={700} sx={{ letterSpacing: 1 }}>
                {shareType === 'search_results' ? 'Shared Search Results' : shareType === 'all_indices' ? 'Shared Gallery' : 'Shared Index'}
              </Typography>
              {userInfo && (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                  by {userInfo.full_name || userInfo.email}
                </Typography>
              )}
            </Box>
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={() => router.push('/')}
              sx={{ textTransform: 'none' }}
            >
              FigDex Home
            </Button>
          </Box>
        </Box>

        {/* Search Bar - Hidden for search_results type */}
        {shareType !== 'search_results' && (
          <Box sx={{ px: 4, pb: 1 }}>
            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search frames..."
              size="medium"
              fullWidth
              InputProps={{
                startAdornment: (
                  <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
                ),
              }}
              sx={{ maxWidth: 360 }}
            />
          </Box>
        )}
      </Box>

      {/* Main Content */}
      <Box sx={{ 
        ml: (shareType !== 'search_results' && filterDrawerOpen) ? '300px' : 0,
        transition: 'margin-left 0.3s ease',
        px: 4
      }}>
        {allGalleryThumbs.length === 0 ? (
          <Typography sx={{ mt: 6, fontSize: 20 }} color="text.secondary">
            No frames found in this index.
          </Typography>
        ) : (
          <>
            <Masonry
              breakpointCols={{ default: 3, 1200: 3, 900: 2, 600: 1 }}
              className="masonry-grid"
              columnClassName="masonry-grid_column"
              style={{ display: 'flex', gap: 16 }}
            >
              {pagedThumbs.map(({ frame, thumb, index }, idx) => {
                const allTags = [
                  ...(frame.namingTags || []),
                  ...(frame.sizeTags || []),
                  ...(frame.customTags || [])
                ].filter(Boolean);
                const originalIndex = index;
                
                return (
                  <Box
                    key={thumb.thumbName + idx}
                    sx={{
                      mb: 2,
                      textAlign: 'center',
                      cursor: 'pointer',
                      width: 260,
                      mx: 'auto',
                      position: 'relative'
                    }}
                  >
                    <img
                      src={thumb.image}
                      alt={thumb.label}
                      style={{
                        borderRadius: 10,
                        border: (modalIndex === originalIndex) ? '3px solid #667eea' : '1.5px solid #e0e0e0',
                        background: '#fff',
                        marginBottom: 6,
                        width: '100%',
                        display: 'block'
                      }}
                      onClick={() => handleOpenModal(originalIndex)}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.png';
                      }}
                    />
                    
                    {allTags.length > 0 && (
                      <Box
                        sx={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 0.75,
                          justifyContent: 'flex-start',
                          mt: 1,
                          px: 0.5
                        }}
                      >
                        {allTags.map((tag: string, tagIdx: number) => (
                          <Box
                            key={tagIdx}
                            sx={{
                              display: 'inline-block',
                              px: 1.5,
                              py: 0.5,
                              borderRadius: '16px',
                              bgcolor: '#f5f5f5',
                              border: 'none',
                              fontSize: '0.75rem',
                              fontWeight: 400,
                              color: '#000',
                              lineHeight: 1.2,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {tag}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Masonry>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 2 }} dir="ltr">
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                siblingCount={1}
                boundaryCount={1}
                renderItem={(item) => (
                  <PaginationItem
                    slots={{ previous: ArrowForwardIosIcon, next: ArrowBackIosNewIcon }}
                    {...item}
                  />
                )}
              />
            </Box>
          </>
        )}
      </Box>

      {/* Preview Dialog */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Preview</Typography>
          <IconButton onClick={handleCloseModal} aria-label="Close preview">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {modalThumb && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <img
                  src={modalThumb.thumb.image}
                  alt={modalThumb.thumb.label}
                  style={{ maxWidth: '100%', height: 'auto', borderRadius: 8, boxShadow: '0 4px 24px #0002' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.png';
                  }}
                />
              </Box>
              <Typography variant="h6" sx={{ mb: 1, textAlign: 'center' }}>
                {modalThumb.frame.name}
              </Typography>
              {modalThumb.frame.frameTags && modalThumb.frame.frameTags.length > 0 && (
                <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                  {modalThumb.frame.frameTags.map((tag: string, tagIdx: number) => (
                    <Chip
                      key={tagIdx}
                      label={tag}
                      size="small"
                      variant="filled"
                      color="primary"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  ))}
                </Box>
              )}
              {(modalThumb?.frame.url || modalThumb?.thumb.url) && (
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  href={modalThumb.frame.url || modalThumb.thumb.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ mb: 2, maxWidth: 400 }}
                  startIcon={<FigmaIcon />}
                >
                  Open in Figma file
                </Button>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <IconButton
            onClick={() => setModalIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
            disabled={modalIndex === 0}
            size="large"
          >
            <ArrowBackIosNewIcon />
          </IconButton>
          <Typography variant="body2" color="text.secondary">
            {modalIndex !== null ? `${modalIndex + 1} / ${visibleThumbs.length}` : ''}
          </Typography>
          <IconButton
            onClick={() => setModalIndex((i) => (i !== null && i < visibleThumbs.length - 1 ? i + 1 : i))}
            disabled={modalIndex === null || modalIndex === visibleThumbs.length - 1}
            size="large"
          >
            <ArrowForwardIosIcon />
          </IconButton>
        </DialogActions>
      </Dialog>

      <style jsx global>{`
        .masonry-grid {
          display: flex;
          margin-left: -16px;
          width: auto;
        }
        .masonry-grid_column {
          padding-left: 16px;
          background-clip: padding-box;
        }
        .masonry-grid_column > div {
          margin-bottom: 16px;
        }
      `}</style>
    </Box>
  );
}
