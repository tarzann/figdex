// pages/index.tsx
import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
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
  CircularProgress,
  MenuItem,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
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
  Paper,
  Drawer,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Autocomplete,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListSubheader,
  Pagination,
  PaginationItem,
  Skeleton,
} from '@mui/material';
import { useRouter } from 'next/router';
import Masonry from 'react-masonry-css';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import ApiIcon from '@mui/icons-material/Api';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import StorageIcon from '@mui/icons-material/Storage';
import FilterListIcon from '@mui/icons-material/FilterList';
import ShareIcon from '@mui/icons-material/Share';
import LinkIcon from '@mui/icons-material/Link';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import CategoryIcon from '@mui/icons-material/Category';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import CropLandscapeIcon from '@mui/icons-material/CropLandscape';
import CropPortraitIcon from '@mui/icons-material/CropPortrait';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import TabletIcon from '@mui/icons-material/Tablet';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import DesktopMacIcon from '@mui/icons-material/DesktopMac';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import AppleIcon from '@mui/icons-material/Apple';
import AndroidIcon from '@mui/icons-material/Android';
import WebIcon from '@mui/icons-material/Web';
import DevicesIcon from '@mui/icons-material/Devices';
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

// Helpers to derive tag categories from frame data (client-side)
const deriveNamingTags = (rawName: string): string[] => {
  try {
    if (!rawName) return [];
    // Remove common prefixes and split on separators including '/'
    const cleaned = rawName.replace(/^Thumbnail:\s*/i, '').trim();
    const parts = cleaned.split(/[\-_/\s]+/).filter(Boolean);
    const isAlphaNum = (s: string) => /^[a-z0-9]+$/i.test(s);
    const isSize = (s: string) => /^\d+x\d+$/i.test(s);
    const tokens = parts
      .map(p => p.trim())
      .filter(p => p.length > 0)
      // skip single non-alnum tokens
      .filter(p => !(p.length === 1 && !isAlphaNum(p)))
      // skip size-like tokens here; size handled separately
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
    if (trimmed) {
      fragments.push(trimmed);
    }
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

const formatTextSnippet = (text: string, limit = 160): string => {
  const trimmed = (text || '').trim();
  if (!trimmed) return '';
  return trimmed.length > limit ? `${trimmed.slice(0, limit).trim()}…` : trimmed;
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

export default function GalleryV2() {
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
  const [indexFiles, setIndexFiles] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState('');
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharingIndexId, setSharingIndexId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [fixingIndices, setFixingIndices] = useState(false);
  
  // Filter sidebar state
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState({
    frameType: false,
    colors: false,
    aspectRatio: false,
    device: false,
    dateRange: false,
    content: false,
    frameTags: true,
    customTags: true
  });
  
  // Filter options
  // Remove unused filters (hidden per request)
  const [selectedFrameTypes, setSelectedFrameTypes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedAspectRatios, setSelectedAspectRatios] = useState<string[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<number[]>([0, 30]); // Days ago
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedFrameTags, setSelectedFrameTags] = useState<string[]>([]);
  const [selectedCustomTags, setSelectedCustomTags] = useState<string[]>([]);
  const [selectedNamingTags, setSelectedNamingTags] = useState<string[]>([]);
  const [selectedSizeTags, setSelectedSizeTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLDivElement | null>(null);

  const clearAllFilters = () => {
    setSelectedNamingTags([]);
    setSelectedSizeTags([]);
    setSelectedCustomTags([]);
    setShowFavorites(false);
    setSearch('');
  };
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

  // Load index data
  useEffect(() => {
    const loadIndexData = async () => {
      try {
        setLoading(true);
        setError('');
        let user = null;
        if (typeof window !== 'undefined') {
          const userStr = localStorage.getItem('figma_web_user');
          if (userStr) user = JSON.parse(userStr);
        }
        if (!user || !user.email) {
          setError('No logged in user found');
          setFrames([]);
          setLoading(false);
          return;
        }
        setCurrentIndexFile(user.email);
        const response = await fetch(`/api/get-indices?userEmail=${encodeURIComponent(user.email)}`);
        const data = await response.json();
        console.log('Get indices response:', data);
        
        // Check for warning message (indices with null user_id or no user found)
        if (data.warning) {
          console.warn('⚠️', data.warning);
          setError(data.warning || 'No indices found for user');
          setFrames([]);
          setLoading(false);
          return;
        }
        
        if (!data.success) {
          console.error('❌ API returned error:', data.error || 'Unknown error');
          setError(data.error || 'Failed to load indices');
          setFrames([]);
          setLoading(false);
          return;
        }
        
        if (data.success && Array.isArray(data.data)) {
          // Separate real files from chunked parts ("(Part X/Y)")
          const partFiles: any[] = [];
          const regularFiles: any[] = [];

          data.data.forEach((file: any) => {
            const isPart = /\(Part\s+\d+\/\d+\)$/i.test(file.file_name || '');
            if (isPart) {
              partFiles.push(file);
            } else {
              regularFiles.push(file);
            }
          });

          // Group only the part files by baseName + fileKey to avoid merging distinct files with same name
          const groupedParts = new Map<string, any[]>();
          partFiles.forEach((file: any) => {
            const baseName = (file.file_name || '').replace(/\s+\(Part\s+\d+\/\d+\)$/i, '').trim();
            const key = `${file.figma_file_key || 'k'}::${baseName}`;
            if (!groupedParts.has(key)) groupedParts.set(key, []);
            groupedParts.get(key)!.push(file);
          });

          const displayFiles: any[] = [...regularFiles];
          groupedParts.forEach((chunks, key) => {
            if (chunks.length === 1) {
              displayFiles.push(chunks[0]);
            } else {
              // Create virtual grouped file for the chunked set
              const first = chunks[0];
              const baseName = (first.file_name || '').replace(/\s+\(Part\s+\d+\/\d+\)$/i, '').trim();
              displayFiles.push({
                id: first.id,
                file_name: baseName,
                uploaded_at: first.uploaded_at,
                figma_file_key: first.figma_file_key,
                _isChunked: true,
                _chunks: chunks
              });
            }
          });

          setIndexFiles(displayFiles);
          
          // Load all frames from all indices in parallel (much faster!)
          console.log('Loading all frames from', data.data.length, 'indices in parallel...');
          const loadIndexFrames = async (file: any) => {
            try {
              const indexResponse = await fetch(`/api/get-index-data?indexId=${file.id}`);
              
              if (!indexResponse.ok) {
                console.error(`❌ Failed to load index ${file.id}: HTTP ${indexResponse.status}`);
                return { success: false, fileId: file.id, frames: [] };
              }
              
              const indexData = await indexResponse.json();
              
              if (!indexData.success) {
                console.error(`❌ Index ${file.id} returned error:`, indexData.error);
                return { success: false, fileId: file.id, frames: [] };
              }
              
              // Validate index_data structure
              if (!indexData.data || !indexData.data.index_data) {
                console.error(`❌ Index ${file.id} has invalid structure: missing index_data`);
                return { success: false, fileId: file.id, frames: [] };
              }
              
              // Try to parse index_data - handle both array and object formats
              let indexDataContent = indexData.data.index_data;
              if (typeof indexDataContent === 'string') {
                try {
                  indexDataContent = JSON.parse(indexDataContent);
                } catch (e) {
                  console.error(`❌ Index ${file.id} has invalid JSON:`, e);
                  return { success: false, fileId: file.id, frames: [] };
                }
              }
              
              const fileFrames = Array.isArray(indexDataContent) 
                ? indexDataContent.flatMap((item: any) => {
                    if (!item) return [];
                    // Handle different structures
                    if (item.frames && Array.isArray(item.frames)) {
                      return item.frames.map((frame: any) => ({
                        ...frame,
                        frameTags: frame.frameTags || frame.tags || [],
                        customTags: frame.customTags || []
                      }));
                    }
                    // If item itself is a frame
                    if (item.name && (item.image || item.url)) {
                      return [{
                        ...item,
                        frameTags: item.frameTags || item.tags || [],
                        customTags: item.customTags || []
                      }];
                    }
                    return [];
                  })
                : [];
              
              return { success: true, fileId: file.id, frames: fileFrames, fileName: file.file_name };
            } catch (error) {
              console.error(`❌ Error loading index ${file.id} (${file.file_name}):`, error);
              return { success: false, fileId: file.id, frames: [] };
            }
          };
          
          // Load all indices in parallel
          const loadPromises = data.data.map((file: any) => loadIndexFrames(file));
          const results = await Promise.all(loadPromises);
          
          // Collect frames and corrupted indices
          const allFrames: any[] = [];
          const corruptedIndices: string[] = [];
          
          results.forEach(result => {
            if (result.success && result.frames.length > 0) {
              console.log(`✅ Added ${result.frames.length} frames from ${result.fileName}`);
              allFrames.push(...result.frames);
            } else if (!result.success) {
              corruptedIndices.push(result.fileId);
            }
          });
          
          // Remove corrupted indices from display and delete from database
          if (corruptedIndices.length > 0) {
            console.warn(`⚠️ Found ${corruptedIndices.length} corrupted indices, deleting from database:`, corruptedIndices);
            
            // Delete corrupted indices from database
            const user = getCurrentUser();
            if (user && user.api_key) {
              const deletePromises = corruptedIndices.map(async (indexId: string) => {
                try {
                  const deleteResponse = await fetch(`/api/delete-index`, {
                    method: 'DELETE',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${user.api_key}`
                    },
                    body: JSON.stringify({ indexId: indexId })
                  });
                  
                  const deleteResult = await deleteResponse.json();
                  if (deleteResult.success) {
                    console.log(`✅ Deleted corrupted index ${indexId} from database`);
                    return { success: true, indexId };
                  } else {
                    console.error(`❌ Failed to delete corrupted index ${indexId}:`, deleteResult.error);
                    return { success: false, indexId, error: deleteResult.error };
                  }
                } catch (error) {
                  console.error(`❌ Error deleting corrupted index ${indexId}:`, error);
                  return { success: false, indexId, error: error instanceof Error ? error.message : 'Unknown error' };
                }
              });
              
              const deleteResults = await Promise.all(deletePromises);
              const successfulDeletes = deleteResults.filter(r => r.success).length;
              const failedDeletes = deleteResults.filter(r => !r.success);
              
              if (successfulDeletes > 0) {
                console.log(`✅ Successfully deleted ${successfulDeletes} corrupted index(es) from database`);
              }
              
              if (failedDeletes.length > 0) {
                console.warn(`⚠️ Failed to delete ${failedDeletes.length} corrupted index(es):`, failedDeletes);
              }
            } else {
              console.warn('⚠️ User not authenticated, cannot delete corrupted indices from database');
            }
            
            // Remove from display
            setIndexFiles(prev => prev.filter(file => !corruptedIndices.includes(file.id)));
            
            // Show user a message about corrupted indices
            if (corruptedIndices.length > 0) {
              console.warn(`⚠️ ${corruptedIndices.length} corrupted index(es) were detected and deleted.`);
            }
          }
          
          // Debug logging
          if (allFrames.length > 0) {
            console.log(`✅ Successfully loaded ${allFrames.length} total frames from ${data.data.length - corruptedIndices.length} valid indices`);
          }
          
          // Set frames and clear loading immediately (let React handle rendering progressively)
          setFrames(allFrames);
          setSelectedIndex(''); // Set to show all
          setLoading(false); // Clear loading state as soon as data is ready
        } else {
          setError('No indices found for user');
          setFrames([]);
          setLoading(false);
        }
      } catch (err) {
        setError('Error loading indices');
        setFrames([]);
        setLoading(false);
      }
    };
    if (router.isReady) {
      loadIndexData();
    }
  }, [router.isReady, router.query.index]);

  // Load frames for specific index
  const loadIndexFrames = async (indexId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/get-index-data?indexId=${indexId}`);
      const data = await response.json();
      console.log('Index data response:', data);
      
      if (data.success && data.data && data.data.index_data) {
        console.log('Processing index data:', data.data.index_data);
        
        // The index_data is an array, where each item has a frames array
        const indexDataArray = data.data.index_data;
         let allFrames: any[] = [];
        
        if (Array.isArray(indexDataArray)) {
          // Extract all frames from all items in the array
          indexDataArray.forEach(item => {
            if (item.frames && Array.isArray(item.frames)) {
              // Add frame_tags and custom_tags to each frame
               const framesWithTags = item.frames.map((frame: any) => {
                const baseFrameTags = frame.frameTags || frame.tags || [];
                const namingTags = deriveNamingTags(frame.name || '');
                const sizeTag = getSizeTag(frame.width, frame.height);
                // Custom = all incoming tags minus naming and size
                const custom = (Array.isArray(baseFrameTags) ? baseFrameTags : [])
                  .filter((t: string) => t && !namingTags.includes(t) && !/^\d+x\d+$/i.test(t));
                return {
                  ...frame,
                  frameTags: baseFrameTags,
                  namingTags,
                  sizeTags: sizeTag ? [sizeTag] : [],
                  customTags: frame.customTags && Array.isArray(frame.customTags) ? Array.from(new Set([...(frame.customTags as string[]), ...custom])) : custom
                };
              });
              allFrames = allFrames.concat(framesWithTags);
            }
          });
        }
        
        console.log('Setting frames:', allFrames);
        setFrames(allFrames);
      } else {
        console.log('No valid data found:', data);
        setFrames([]);
      }
    } catch (err) {
      console.error('Error loading index frames:', err);
      setFrames([]);
    } finally {
      setLoading(false);
    }
  };

  // Load favorites from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const favs = localStorage.getItem('favorites');
      setFavorites(favs ? JSON.parse(favs) : []);
    } catch {}
  }, []);
  
  // Save favorites to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);


  // Determine if current user is admin
  useEffect(() => {
    try {
      const user = getCurrentUser();
      const adminEmails = ['ranmor01@gmail.com'];
      setIsAdmin(!!user && adminEmails.includes(user.email));
    } catch (e) {
      setIsAdmin(false);
    }
  }, []);

  const toggleFavorite = (thumbName: string) => {
    setFavorites((prev) =>
      prev.includes(thumbName)
        ? prev.filter((f) => f !== thumbName)
        : [...prev, thumbName]
    );
  };

  // Get current user
  const getCurrentUser = () => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('figma_web_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  };

  // Handle user menu
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  // Handle logout
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('figma_web_user');
    }
    router.replace('/login');
    handleUserMenuClose();
  };

  // Handle copy API key
  const handleCopyApiKey = async () => {
    const user = getCurrentUser();
    console.log('Current user:', user);
    console.log('User api_key:', user?.api_key);
    
    if (user && user.api_key) {
      try {
        await navigator.clipboard.writeText(user.api_key);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        console.log('API key copied to clipboard:', user.api_key);
        alert('API Key copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy API key:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = user.api_key;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          console.log('API key copied using fallback method');
          alert('API Key copied to clipboard!');
        } catch (fallbackErr) {
          console.error('Fallback copy failed:', fallbackErr);
          alert('Failed to copy API key');
        }
        document.body.removeChild(textArea);
      }
    } else {
      console.error('No user or API key found');
      alert('No API key found. Please make sure you are logged in.');
    }
    handleUserMenuClose();
  };

  // Handle settings dialog
  const handleOpenSettings = () => {
    setSettingsDialogOpen(true);
    handleUserMenuClose();
  };

  const handleCloseSettings = () => {
    setSettingsDialogOpen(false);
  };

  // Handle share index
  const handleShareIndex = async (indexId: string) => {
    setSharingIndexId(indexId);
    setShareDialogOpen(true);
    
    try {
      // Check if already shared
      const checkResponse = await fetch(`/api/index/${indexId}/share`);
      const checkData = await checkResponse.json();
      
      if (checkData.success && checkData.isPublic) {
        setShareUrl(checkData.shareUrl);
        return;
      }
      
      // Create share link
      const response = await fetch(`/api/index/${indexId}/share`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShareUrl(data.shareUrl);
      } else {
        alert(`Failed to create share link: ${data.error}`);
        setShareDialogOpen(false);
      }
    } catch (error) {
      console.error('Error sharing index:', error);
      alert('Error sharing index');
      setShareDialogOpen(false);
    }
  };

  // Handle unshare index
  const handleUnshareIndex = async (indexId: string) => {
    if (!confirm('Are you sure you want to stop sharing this index?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/index/${indexId}/share`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShareUrl('');
        alert('Index is now private');
      } else {
        alert(`Failed to unshare index: ${data.error}`);
      }
    } catch (error) {
      console.error('Error unsharing index:', error);
      alert('Error unsharing index');
    }
  };

  // Handle copy share link
  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err) {
      alert('Failed to copy link');
    }
  };

  // Handle delete index
  const handleDeleteIndex = async (indexId: string) => {
    const fileToDelete = indexFiles.find(f => f.id === indexId);
    const isChunked = fileToDelete?._isChunked;
    
    if (!confirm('Are you sure you want to delete this index? This action cannot be undone.')) {
      return;
    }

    setDeletingIndex(indexId);
    try {
      const user = getCurrentUser();
      if (!user || !user.api_key) {
        alert('User not authenticated');
        return;
      }

      // Delete all chunks if this is a chunked file
      const idsToDelete = isChunked ? fileToDelete._chunks.map((c: any) => c.id) : [indexId];
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
      const allSuccess = results.every(r => r.success);
      
      if (!allSuccess) {
        const errors = results.filter(r => !r.success);
        alert(`Failed to delete some parts: ${errors.map((e: any) => e.error).join(', ')}`);
        setDeletingIndex(null);
        return;
      }
      
      // Remove from local state
      setIndexFiles(prev => prev.filter(file => file.id !== indexId));
      
      // If the deleted index was selected, reset to show all
      if (selectedIndex === indexId) {
        setSelectedIndex('');
        // Reload all remaining frames
        const remainingFiles = indexFiles.filter(file => file.id !== indexId);
        const allFrames = [];
        for (const file of remainingFiles) {
          try {
            const indexResponse = await fetch(`/api/get-index-data?indexId=${file.id}`);
            const indexData = await indexResponse.json();
            
            if (indexData.success && indexData.data && indexData.data.index_data) {
              const fileFrames = Array.isArray(indexData.data.index_data) 
                ? indexData.data.index_data.flatMap((item: any) => 
                    item.frames && Array.isArray(item.frames) 
                      ? item.frames.map((frame: any) => ({
                          ...frame,
                          frameTags: frame.frameTags || frame.tags || [],
                          customTags: frame.customTags || []
                        }))
                      : []
                  )
                : [];
              allFrames.push(...fileFrames);
            }
          } catch (error) {
            console.error(`Error reloading index ${file.id}:`, error);
          }
        }
        setFrames(allFrames);
      }
      
      alert('Index deleted successfully');
    } catch (error) {
      console.error('Error deleting index:', error);
      alert('Error deleting index');
    } finally {
      setDeletingIndex(null);
    }
  };

  // Handle fix user indices (admin only)
  const handleFixUserIndices = async () => {
    try {
      setFixingIndices(true);
      const user = getCurrentUser();
      if (!user || !user.email) {
        alert('User not found');
        return;
      }

      const response = await fetch('/api/fix-user-indices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail: user.email })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${data.message}\n\nFixed ${data.fixedCount} indices. Page will reload to show your indices.`);
        // Reload the page to show the fixed indices
        window.location.reload();
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

  // Filter functions
  const toggleFilterExpansion = (filterType: keyof typeof filtersExpanded) => {
    setFiltersExpanded(prev => ({
      ...prev,
      [filterType]: !prev[filterType]
    }));
  };

  const handleFrameTypeChange = (frameType: string, checked: boolean) => {
    if (checked) {
      setSelectedFrameTypes(prev => [...prev, frameType]);
    } else {
      setSelectedFrameTypes(prev => prev.filter(type => type !== frameType));
    }
  };

  const handleColorChange = (color: string, checked: boolean) => {
    if (checked) {
      setSelectedColors(prev => [...prev, color]);
    } else {
      setSelectedColors(prev => prev.filter(c => c !== color));
    }
  };

  const handleSectionChange = (section: string, checked: boolean) => {
    if (checked) {
      setSelectedSections(prev => [...prev, section]);
    } else {
      setSelectedSections(prev => prev.filter(s => s !== section));
    }
  };

  const handleAspectRatioChange = (ratio: string, checked: boolean) => {
    if (checked) {
      setSelectedAspectRatios(prev => [...prev, ratio]);
    } else {
      setSelectedAspectRatios(prev => prev.filter(r => r !== ratio));
    }
  };

  const handleDeviceChange = (device: string, checked: boolean) => {
    if (checked) {
      setSelectedDevices(prev => [...prev, device]);
    } else {
      setSelectedDevices(prev => prev.filter(d => d !== device));
    }
  };

  const handleFrameTagChange = (tag: string, checked: boolean) => {
    console.log('Frame tag changed:', { tag, checked, currentSelected: selectedFrameTags });
    if (checked) {
      const newSelected = [...selectedFrameTags, tag];
      setSelectedFrameTags(newSelected);
      console.log('New selected frame tags:', newSelected);
    } else {
      const newSelected = selectedFrameTags.filter(t => t !== tag);
      setSelectedFrameTags(newSelected);
      console.log('New selected frame tags:', newSelected);
    }
  };

  const handleCustomTagChange = (tag: string, checked: boolean) => {
    if (checked) {
      setSelectedCustomTags(prev => [...prev, tag]);
    } else {
      setSelectedCustomTags(prev => prev.filter(t => t !== tag));
    }
  };

  // Deprecated clear function block removed (replaced by top-level clearAllFilters)

  // Helper function to calculate aspect ratio category
  const getAspectRatioCategory = (width: number, height: number): string => {
    if (!width || !height) return 'Unknown';
    
    const ratio = width / height;
    
    if (Math.abs(ratio - 1) < 0.1) return 'Square (1:1)';
    if (ratio > 1.7) return 'Ultra Wide (16:9+)';
    if (ratio > 1.4) return 'Wide (16:10)';
    if (ratio > 1.2) return 'Landscape (4:3)';
    if (ratio > 0.9) return 'Standard (3:2)';
    if (ratio > 0.6) return 'Portrait (2:3)';
    if (ratio > 0.4) return 'Tall (9:16)';
    return 'Ultra Tall (9:21)';
  };

  // Helper function to determine device category based on frame properties
  const getDeviceCategory = (frame: any): string[] => {
    const categories: string[] = [];
    const name = frame.name?.toLowerCase() || '';
    
    // Check by name patterns
    if (name.includes('mobile') || name.includes('phone') || name.includes('webapp') || name.includes('web app') || name.includes('pwa')) categories.push('Mobile WebApp');
    if (name.includes('tablet') || name.includes('ipad')) categories.push('Tablet');
    if (name.includes('desktop') || name.includes('web') || name.includes('browser')) categories.push('Desktop');
    if (name.includes('ios') || name.includes('iphone') || name.includes('apple')) categories.push('iOS');
    if (name.includes('android')) categories.push('Android');
    
    // Check by dimensions (approximate device sizes)
    if (frame.width && frame.height) {
      const minDimension = Math.min(frame.width, frame.height);
      const maxDimension = Math.max(frame.width, frame.height);
      
      // Mobile WebApp: typically 320-414px wide
      if (minDimension >= 300 && minDimension <= 450) {
        categories.push('Mobile WebApp');
      }
      
      // Tablet: typically 768-1024px wide
      if (minDimension >= 600 && minDimension <= 1100 && maxDimension >= 800 && maxDimension <= 1400) {
        categories.push('Tablet');
      }
      
      // Desktop: typically 1200px+ wide
      if (maxDimension >= 1200) {
        categories.push('Desktop');
      }
    }
    
    return [...new Set(categories)]; // Remove duplicates
  };

  // Available device categories
  const availableDevices = [
    'iOS',
    'Android',
    'Mobile WebApp',
    'Tablet', 
    'Desktop'
  ];

  // Get unique frame types, colors, aspects, sections and tags from current frames
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

  // 1. Create flat array of all thumbnails from all pages
  const allGalleryThumbs = useMemo(() => {
    let idx = 0;
    console.log('Processing frames for gallery:', frames.length, 'frames');
    
    return frames.map((frame) => {
      // Use cached textBundle if available, otherwise compute it (optimization)
      const textBundle = (frame as any)._textBundle || collectFrameText(frame);
      if (!(frame as any)._textBundle && textBundle) {
        (frame as any)._textBundle = textBundle; // Cache for next time
      }
      
      const currentIdx = idx++;
      // Create unique thumbName by combining index with name/url to avoid duplicates
      const uniqueId = `${currentIdx}_${frame.name || 'Untitled'}_${frame.url || ''}`;
      
      // Use pre-computed tags if available (from API), otherwise compute them
      const namingTags = (frame as any).namingTags || deriveNamingTags(frame.name || '');
      const sizeTag = getSizeTag((frame as any).width, (frame as any).height);
      const sizeTags = (frame as any).sizeTags || (sizeTag ? [sizeTag] : []);
      
      return ({
        frame: {
          name: frame.name || 'Untitled Frame',
          url: frame.url || '',
          width: (frame as any).width,
          height: (frame as any).height,
          frameTags: (frame as any).frameTags || (frame as any).tags || [],
          namingTags,
          sizeTags,
          customTags: (frame as any).customTags || [],
          textSnippet: textBundle,
        },
        thumb: {
          thumbName: uniqueId,
          label: frame.name || 'Untitled Frame',
          image: frame.image || '',
          texts: textBundle,
          url: frame.url || ''
        },
        index: currentIdx,
      });
    });
  }, [frames]);

  // Filter gallery thumbnails by text search (page name, label, texts)
  const filteredThumbs = useMemo(() => {
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
  }, [allGalleryThumbs, search]);

  // Apply advanced filters
  const advancedFilteredThumbs = useMemo(() => {
    let thumbs = filteredThumbs;

    // Filter by frame type
    if (selectedFrameTypes.length > 0) {
      thumbs = thumbs.filter(({ frame }) => {
        const frameName = frame.name?.toLowerCase() || '';
        return selectedFrameTypes.some(type => 
          frameName.includes(type.toLowerCase())
        );
      });
    }

    // Filter by colors
    if (selectedColors.length > 0) {
      thumbs = thumbs.filter(({ frame }) => {
        const frameName = frame.name?.toLowerCase() || '';
        return selectedColors.some(color => 
          frameName.includes(color.toLowerCase())
        );
      });
    }

    // Filter by aspect ratio
    if (selectedAspectRatios.length > 0) {
      thumbs = thumbs.filter(({ frame }) => {
        if (!frame.width || !frame.height) return false;
        const aspectCategory = getAspectRatioCategory(frame.width, frame.height);
        return selectedAspectRatios.includes(aspectCategory);
      });
    }

    // Filter by device type
    if (selectedDevices.length > 0) {
      thumbs = thumbs.filter(({ frame }) => {
        const frameDevices = getDeviceCategory(frame);
        return selectedDevices.some(device => frameDevices.includes(device));
      });
    }

    // Filter by sections/groups
    if (selectedSections.length > 0) {
      thumbs = thumbs.filter(({ frame }) => {
        return selectedSections.some(section => 
           (frame as any).section === section || (frame as any).group === section
        );
      });
    }

    // Filter by naming tags
    if (selectedNamingTags.length > 0) {
      thumbs = thumbs.filter(({ frame }) => {
        if (!frame.namingTags || !Array.isArray(frame.namingTags)) return false;
        return selectedNamingTags.some(tag => frame.namingTags.includes(tag));
      });
    }

    // Filter by size tags
    if (selectedSizeTags.length > 0) {
      thumbs = thumbs.filter(({ frame }) => {
        if (!frame.sizeTags || !Array.isArray(frame.sizeTags)) return false;
        return selectedSizeTags.some(tag => frame.sizeTags.includes(tag));
      });
    }

    // Filter by custom tags
    if (selectedCustomTags.length > 0) {
      thumbs = thumbs.filter(({ frame }) => {
        if (!frame.customTags || !Array.isArray(frame.customTags)) return false;
        return selectedCustomTags.some(tag => frame.customTags.includes(tag));
      });
    }

    // Filter by favorites
    if (showFavorites) {
      thumbs = thumbs.filter((t) => favorites.includes(t.thumb.thumbName));
    }

    return thumbs;
  }, [filteredThumbs, selectedNamingTags, selectedSizeTags, selectedCustomTags, showFavorites, favorites]);

  // Final visible thumbs - reindex to match their position in the filtered array
  const visibleThumbs = useMemo(() => {
    return advancedFilteredThumbs.map((thumb, idx) => ({
      ...thumb,
      index: idx, // Reindex to match position in visibleThumbs array
    }));
  }, [advancedFilteredThumbs]);
  const totalPages = Math.max(1, Math.ceil(visibleThumbs.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [search, showFavorites, selectedFrameTypes, selectedColors, selectedAspectRatios, selectedDevices, selectedSections, selectedNamingTags, selectedSizeTags, selectedCustomTags]);

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

  // 2. Display all images in one gallery (Masonry)
  // 3. Modal allows navigation between all images in gallery
  const previewDrawerWidth = 520;
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const modalThumb = modalIndex !== null ? visibleThumbs[modalIndex] : null;

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
          i !== null && i < visibleThumbs.length - 1 ? i + 1 : i
        );
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
      <Box>
        {/* Header skeleton */}
        <Box sx={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 100, 
          bgcolor: '#f8f9fa', 
          borderBottom: '1px solid #e0e0e0',
          py: 2,
          px: 4
        }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton variant="text" width={120} height={40} />
            </Box>
            <Skeleton variant="circular" width={40} height={40} />
          </Box>
          <Skeleton variant="rectangular" width="100%" height={56} sx={{ borderRadius: 1 }} />
        </Box>

        {/* Sidebar skeleton */}
        <Box sx={{ 
          position: 'fixed', 
          left: 0, 
          top: 120, 
          width: 300, 
          height: 'calc(100vh - 120px)', 
          bgcolor: '#fff',
          borderRight: '1px solid #e0e0e0',
          p: 2,
          overflowY: 'auto'
        }}>
          <Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: 2, mb: 2 }} />
          <Skeleton variant="rectangular" width="100%" height={80} sx={{ borderRadius: 1, mb: 2 }} />
          <Skeleton variant="rectangular" width="100%" height={120} sx={{ borderRadius: 2, mb: 2 }} />
        </Box>

        {/* Main content skeleton */}
        <Box sx={{ 
          ml: '300px', 
          px: 4, 
          py: 4 
        }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[180, 220, 200, 250, 190, 230, 210, 240, 200].map((height, idx) => (
              <Box key={idx} sx={{ width: 260, mb: 2 }}>
                <Skeleton 
                  variant="rectangular" 
                  width={260} 
                  height={height} 
                  sx={{ borderRadius: 2, mb: 1 }} 
                />
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-start', mt: 1 }}>
                  <Skeleton variant="rectangular" width={60} height={20} sx={{ borderRadius: '16px' }} />
                  <Skeleton variant="rectangular" width={80} height={20} sx={{ borderRadius: '16px' }} />
                  <Skeleton variant="rectangular" width={50} height={20} sx={{ borderRadius: '16px' }} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    );
  }

  if (error) {
    const showFixButton = isAdmin && error === 'No indices found for user';
    
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
          {showFixButton && (
            <Button 
              variant="contained" 
              onClick={handleFixUserIndices}
              color="warning"
              disabled={fixingIndices}
              startIcon={fixingIndices ? <CircularProgress size={20} /> : <StorageIcon />}
            >
              {fixingIndices ? 'Fixing...' : 'Fix My Indices (Admin)'}
            </Button>
          )}
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
            color="primary"
          >
            Retry
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => router.push('/projects')}
            startIcon={<FolderOpenIcon />}
          >
            Choose Another Project
          </Button>
        </Stack>
      </Box>
    );
  }

  // Format date for display
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
      return 'Invalid Date';
    }
  };

  return (
    <Box sx={{ direction: 'ltr', bgcolor: '#f7f9fa', minHeight: '100vh' }}>
      {/* Filter Sidebar */}
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
          {/* Filter Header */}
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

          {/* Files List - FIRST */}
          <Box sx={{ mb: 3, p: 2, bgcolor: '#f9f9f9', borderRadius: 2, border: '1px solid #e0e0e0', maxHeight: 300, overflowY: 'auto' }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: '#1a1a1a' }}>
              Files
            </Typography>
            <List dense sx={{ p: 0 }}>
              <ListItemButton
                selected={!selectedIndex}
                onClick={async () => {
                  setSelectedIndex('');
                  setLoading(true);
                  const allFrames = [];
                  for (const file of indexFiles) {
                    try {
                      const indexResponse = await fetch(`/api/get-index-data?indexId=${file.id}`);
                      const indexData = await indexResponse.json();

                      if (indexData.success && indexData.data && indexData.data.index_data) {
                        const fileFrames = Array.isArray(indexData.data.index_data)
                          ? indexData.data.index_data.flatMap((item: any) =>
                              item.frames && Array.isArray(item.frames)
                                ? item.frames.map((frame: any) => ({
                                    ...frame,
                                    frameTags: indexData.data.frame_tags || [],
                                    customTags: indexData.data.custom_tags || []
                                  }))
                                : []
                            )
                          : [];
                        allFrames.push(...fileFrames);
                      }
                    } catch (error) {
                      console.error(`Error loading index ${file.id}:`, error);
                    }
                  }
                  setFrames(allFrames);
                  setLoading(false);
                }}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: '#667eea',
                    color: 'white',
                    '&:hover': {
                      bgcolor: '#5568d3',
                    }
                  }
                }}
              >
                <FolderOpenIcon sx={{ mr: 1, fontSize: 18 }} />
                <ListItemText primary="All Files" primaryTypographyProps={{ variant: 'body2' }} />
              </ListItemButton>
              {indexFiles.map((file) => (
                <ListItemButton
                  key={file.id}
                  selected={selectedIndex === file.id}
                  onClick={() => {
                    setSelectedIndex(file.id);
                    loadIndexFrames(file.id);
                  }}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    '&.Mui-selected': {
                      bgcolor: '#667eea',
                      color: 'white',
                      '&:hover': {
                        bgcolor: '#5568d3',
                      }
                    }
                  }}
                >
                  <FolderOpenIcon sx={{ mr: 1, fontSize: 18 }} />
                  <ListItemText 
                    primary={file.file_name || `Index ${file.id}`} 
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Box>

          {/* Results Count - SECOND */}
          <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
              Results
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedIndex ? 
                `Showing frames from: ${indexFiles.find(f => f.id === selectedIndex)?.file_name || 'Selected File'}` : 
                `Showing ${visibleThumbs.length} of ${allGalleryThumbs.length} frames (${pagedThumbs.length} on page ${page}/${totalPages})`
              }
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

          {/* Favorites - THIRD */}
          <Box sx={{ mb: 3, p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                Favorites
              </Typography>
              <Chip 
                label={(() => {
                  // Count only valid favorites (ones that match current thumbNames)
                  const validThumbNames = new Set(allGalleryThumbs.map(t => t.thumb.thumbName));
                  const validFavoritesCount = favorites.filter(fav => validThumbNames.has(fav)).length;
                  return validFavoritesCount;
                })()} 
                size="small" 
                color="primary" 
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            </Box>
            <Button
              fullWidth
              variant={showFavorites ? "contained" : "outlined"}
              color="primary"
              startIcon={showFavorites ? <FavoriteIcon /> : <FavoriteBorderIcon />}
              onClick={() => setShowFavorites(!showFavorites)}
              sx={{ 
                textTransform: 'none',
                justifyContent: 'flex-start'
              }}
            >
              {showFavorites ? 'Show All Frames' : 'Show Only Favorites'}
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Tag Filters - AFTER */}

          {/* Frame Types Filter - removed per request */}

          {/* Colors Filter - removed per request */}

          {/* Aspect Ratio Filter - removed per request */}
          {/* <Box mb={3}>
            <ListItemButton 
              onClick={() => toggleFilterExpansion('aspectRatio')}
              sx={{ px: 0, py: 1 }}
            >
              <AspectRatioIcon sx={{ mr: 1 }} />
              <Typography variant="subtitle2" sx={{ flex: 1 }}>
                Aspect Ratios ({selectedAspectRatios.length})
              </Typography>
              {filtersExpanded.aspectRatio ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItemButton>
            <Collapse in={filtersExpanded.aspectRatio}>
              <FormGroup sx={{ ml: 4 }}>
                {getFilterOptions.aspectRatios.map((ratio) => {
                  // Get appropriate icon for each ratio
                  const getAspectIcon = (ratioName: string) => {
                    if (ratioName.includes('Square')) return <CropSquareIcon sx={{ fontSize: 16, mr: 0.5 }} />;
                    if (ratioName.includes('Ultra Wide') || ratioName.includes('Wide')) return <CropLandscapeIcon sx={{ fontSize: 16, mr: 0.5 }} />;
                    if (ratioName.includes('Landscape') || ratioName.includes('Standard')) return <TabletIcon sx={{ fontSize: 16, mr: 0.5 }} />;
                    if (ratioName.includes('Portrait') || ratioName.includes('Tall')) return <CropPortraitIcon sx={{ fontSize: 16, mr: 0.5 }} />;
                    if (ratioName.includes('Ultra Tall')) return <PhoneIphoneIcon sx={{ fontSize: 16, mr: 0.5 }} />;
                    return <AspectRatioIcon sx={{ fontSize: 16, mr: 0.5 }} />;
                  };

                  return (
                    <FormControlLabel
                      key={ratio}
                      control={
                        <Checkbox
                          size="small"
                          checked={selectedAspectRatios.includes(ratio)}
                          onChange={(e) => handleAspectRatioChange(ratio, e.target.checked)}
                        />
                      }
                      label={
                        <Box display="flex" alignItems="center">
                          {getAspectIcon(ratio)}
                          <Typography variant="body2">{ratio}</Typography>
                        </Box>
                      }
                    />
                  );
                })}
              </FormGroup>
            </Collapse>
          </Box> */}

          {/* Device Type Filter - removed per request */}
          {/* <Box mb={3}>
            <ListItemButton 
              onClick={() => toggleFilterExpansion('device')}
              sx={{ px: 0, py: 1 }}
            >
              <DevicesIcon sx={{ mr: 1 }} />
              <Typography variant="subtitle2" sx={{ flex: 1 }}>
                Device Types ({selectedDevices.length})
              </Typography>
              {filtersExpanded.device ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItemButton>
            <Collapse in={filtersExpanded.device}>
              <FormGroup sx={{ ml: 4 }}>
                {availableDevices.map((device) => {
                  // Get appropriate icon for each device
                  const getDeviceIcon = (deviceName: string) => {
                    switch(deviceName) {
                      case 'iOS': return <AppleIcon sx={{ fontSize: 16, mr: 0.5 }} />;
                      case 'Android': return <AndroidIcon sx={{ fontSize: 16, mr: 0.5 }} />;
                      case 'Mobile WebApp': return <PhoneIphoneIcon sx={{ fontSize: 16, mr: 0.5 }} />;
                      case 'Tablet': return <TabletIcon sx={{ fontSize: 16, mr: 0.5 }} />;
                      case 'Desktop': return <DesktopMacIcon sx={{ fontSize: 16, mr: 0.5 }} />;
                      default: return <DevicesIcon sx={{ fontSize: 16, mr: 0.5 }} />;
                    }
                  };

                  return (
                    <FormControlLabel
                      key={device}
                      control={
                        <Checkbox
                          size="small"
                          checked={selectedDevices.includes(device)}
                          onChange={(e) => handleDeviceChange(device, e.target.checked)}
                        />
                      }
                      label={
                        <Box display="flex" alignItems="center">
                          {getDeviceIcon(device)}
                          <Typography variant="body2">{device}</Typography>
                        </Box>
                      }
                    />
                  );
                })}
              </FormGroup>
            </Collapse>
          </Box> */}

          {/* Sections/Groups Filter - removed per request */}
          {/* <Box mb={3}>
            <ListItemButton 
              onClick={() => toggleFilterExpansion('content')}
              sx={{ px: 0, py: 1 }}
            >
              <FolderOpenIcon sx={{ mr: 1 }} />
              <Typography variant="subtitle2" sx={{ flex: 1 }}>
                Sections ({selectedSections.length})
              </Typography>
              {filtersExpanded.content ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItemButton>
            <Collapse in={filtersExpanded.content}>
              <FormGroup sx={{ ml: 4 }}>
                {getFilterOptions.sections.map((section) => (
                  <FormControlLabel
                    key={section}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedSections.includes(section)}
                        onChange={(e) => handleSectionChange(section, e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">{section}</Typography>}
                  />
                ))}
              </FormGroup>
            </Collapse>
          </Box> */}

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
          <Box sx={filterCardSx}>
            <ListItemButton 
              onClick={() => toggleFilterExpansion('content')}
              sx={{ px: 0, py: 1 }}
            >
              <ColorLensIcon sx={{ mr: 1 }} />
              <Typography variant="subtitle2" sx={{ flex: 1 }}>
                Custom Tags ({selectedCustomTags.length})
              </Typography>
              {filtersExpanded.content ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItemButton>
            <Collapse in={filtersExpanded.content}>
              <Box sx={{ ml: 2, mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {getFilterOptions.customTags.map((tag) => {
                  const isSelected = selectedCustomTags.includes(tag);
                  return (
                    <Box
                      key={tag}
                      onClick={() => handleCustomTagChange(tag, !isSelected)}
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

        </Box>
      </Box>

      {/* Sticky Header - Logo, User Menu, and Search Bar */}
      <Box
        ref={headerRef}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 16,
          backgroundColor: '#f7f9fa',
          ml: filterDrawerOpen ? '300px' : 0,
          transition: 'margin-left 0.3s ease',
          width: filterDrawerOpen ? 'calc(100% - 300px)' : '100%'
        }}
      >
        {/* Top Header with Logo and User Menu */}
        <Box sx={{ px: 4, pt: 2, pb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
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
              <Typography variant="h3" fontWeight={700} sx={{ letterSpacing: 1 }}>
                FigDex
              </Typography>
            </Box>
            
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton
                onClick={handleUserMenuOpen}
                sx={{ 
                  bgcolor: 'white',
                  boxShadow: 1,
                  '&:hover': { boxShadow: 2 }
                }}
              >
                <Avatar sx={{ bgcolor: '#667eea', width: 32, height: 32 }}>
                  <AccountCircleIcon />
                </Avatar>
              </IconButton>

              {/* User Menu */}
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

                <MenuItem onClick={() => { router.push('/index-management'); handleUserMenuClose(); }}>
                  <ListItemIcon>
                    <StorageIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Index Management</ListItemText>
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
                
                <MenuItem onClick={handleCopyApiKey}>
                  <ListItemIcon>
                    <ContentCopyIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{copied ? 'API Key Copied!' : 'Copy API Key'}</ListItemText>
                </MenuItem>
                
                <MenuItem onClick={handleOpenSettings}>
                  <ListItemIcon>
                    <StorageIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Index Management</ListItemText>
                </MenuItem>
                
                <Divider />
                
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Logout</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          </Box>
        </Box>
      
        {/* Search and Filter Bar */}
        <Box sx={{ px: 4, pb: 1 }}>
          <Box sx={{ mb: 1 }}>
            <Box display="flex" alignItems="flex-end" gap={2} sx={{ width: '100%', flexWrap: 'nowrap', overflowX: 'auto' }}>
              <Box sx={{ flex: '1 1 260px', minWidth: 180, maxWidth: 600 }}>
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
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ 
        ml: filterDrawerOpen ? '300px' : 0,
        transition: 'margin-left 0.3s ease',
        px: 4
      }}>
        {/* Categorized Tags Display (per frame) */}
        <Grid container spacing={4}>
        {/* Main gallery: */}
        <Masonry
          breakpointCols={{ default: 3, 1200: 3, 900: 2, 600: 1 }}
          className="masonry-grid"
          columnClassName="masonry-grid_column"
          style={{ display: 'flex', gap: 16 }}
        >
          {pagedThumbs.map(({ frame, thumb, index }, idx) => {
            // Collect all tags for display
            const allTags = [
              ...(frame.namingTags || []),
              ...(frame.sizeTags || []),
              ...(frame.customTags || [])
            ].filter(Boolean);
            
            // Use the original index from visibleThumbs, not the paged index
            const originalIndex = index;
            
            return (
              <Box
                key={thumb.thumbName + idx}
                sx={{
                  mb: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  width: 260,
                  position: 'relative'
                }}
              >
                <img
                  src={thumb.image}
                  alt={thumb.label}
                  loading="lazy"
                  style={{
                    borderRadius: 10,
                    border: (modalIndex === originalIndex) ? '3px solid #667eea' : '1.5px solid #e0e0e0',
                    background: '#fff',
                    marginBottom: 6,
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    objectFit: 'contain'
                  }}
                  onClick={() => handleOpenModal(originalIndex)}
                />
                <IconButton
                  onClick={() => toggleFavorite(thumb.thumbName)}
                  color="error"
                  sx={{ position: 'absolute', top: 8, right: 8, background: '#fff8', zIndex: 1 }}
                  aria-label="Add to favorites"
                >
                  {favorites.includes(thumb.thumbName) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                </IconButton>
                
                {/* Tags Display */}
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
            width: 260px;
          }
        `}</style>
        
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
      </Grid>
      {allGalleryThumbs.length === 0 && (
        <Typography sx={{ mt: 6, fontSize: 20 }} color="text.secondary">
          No results found.
        </Typography>
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

      {/* Index Management Dialog */}
      <Dialog 
        open={settingsDialogOpen} 
        onClose={handleCloseSettings}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <StorageIcon />
            Index Management
          </Box>
        </DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
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
                        {(() => {
                          // For chunked files, calculate total from all chunks
                          if (file._isChunked) {
                            const total = file._chunks.reduce((sum: any, chunk: any) => {
                              if (chunk.index_data && Array.isArray(chunk.index_data)) {
                                return sum + chunk.index_data.reduce((subSum: any, item: any) => {
                                  return subSum + (item.frames && Array.isArray(item.frames) ? item.frames.length : 0);
                                }, 0);
                              }
                              return sum + (chunk.frame_count || 0);
                            }, 0);
                            return total;
                          }
                          // For single files
                          if (file.frame_count) return file.frame_count;
                          if (file.index_data && Array.isArray(file.index_data)) {
                             const frameCount = file.index_data.reduce((total: any, item: any) => {
                              return total + (item.frames && Array.isArray(item.frames) ? item.frames.length : 0);
                            }, 0);
                            return frameCount;
                          }
                          return 'Unknown';
                        })()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <IconButton
                          color="primary"
                          onClick={() => handleShareIndex(file.id)}
                          size="small"
                          title="Share"
                        >
                          <ShareIcon fontSize="small" />
                        </IconButton>
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
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No indices found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSettings} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <ShareIcon />
              Share Index
            </Box>
            <IconButton onClick={() => setShareDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
              Anyone with this link can view your index:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              <TextField
                fullWidth
                value={shareUrl}
                InputProps={{
                  readOnly: true,
                  startAdornment: <LinkIcon sx={{ mr: 1, color: '#666' }} />
                }}
                variant="outlined"
              />
              <Button
                variant="contained"
                onClick={handleCopyShareLink}
                startIcon={shareCopied ? <CheckIcon /> : <ContentCopyIcon />}
              >
                {shareCopied ? 'Copied!' : 'Copy'}
              </Button>
            </Box>
            <Button
              variant="outlined"
              color="error"
              fullWidth
              onClick={() => sharingIndexId && handleUnshareIndex(sharingIndexId)}
              disabled={!shareUrl}
            >
              Stop Sharing
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
} 