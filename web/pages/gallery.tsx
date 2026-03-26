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
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import GridViewIcon from '@mui/icons-material/GridView';
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

// Version tracking - Update this number for each fix/change
const PAGE_VERSION = 'v1.32.03'; // Faster lobby load with deferred frame hydration
const PAGE_VERSION_BUILD_DATE = new Date().toISOString().slice(0, 16).replace('T', ' '); // Auto-generated build timestamp
const DEBUG_GALLERY = false;
const galleryDebug = (...args: any[]) => {
  if (DEBUG_GALLERY) console.log(...args);
};
const galleryWarn = (...args: any[]) => {
  if (DEBUG_GALLERY) console.warn(...args);
};

type Thumbnail = {
  thumbName: string;
  label: string;
  url: string;
  texts: string;
  image: string;
  thumbnail?: string; // Optional thumbnail URL (smaller, faster loading)
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

function getStableLogicalFileId(file: any): string {
  const fileKey = typeof file?.figma_file_key === 'string' ? file.figma_file_key.trim() : '';
  const projectId = typeof file?.project_id === 'string' ? file.project_id.trim() : '';
  const stableProjectId = projectId && projectId !== '0:0' ? projectId : '';
  return fileKey || stableProjectId || '';
}

function getLogicalFileId(file: any): string {
  return getStableLogicalFileId(file) || String(file?.id || '');
}

function getNormalizedFileName(file: any): string {
  return ((file?.file_name || '') as string).replace(/\s+\(Part\s+\d+\/\d+\)$/i, '').trim();
}

function groupLogicalFiles(files: any[]): any[] {
  const partFiles: any[] = [];
  const regularFiles: any[] = [];

  files.forEach((file: any) => {
    const isPart = /\(Part\s+\d+\/\d+\)$/i.test(file.file_name || '');
    if (isPart) partFiles.push(file);
    else regularFiles.push(file);
  });

  const groupedParts = new Map<string, any[]>();
  partFiles.forEach((file: any) => {
    const baseName = getNormalizedFileName(file);
    const key = `${getLogicalFileId(file)}::${baseName}`;
    if (!groupedParts.has(key)) groupedParts.set(key, []);
    groupedParts.get(key)!.push(file);
  });

  const displayFiles: any[] = [...regularFiles];
  groupedParts.forEach((chunks) => {
    if (chunks.length === 1) {
      displayFiles.push(chunks[0]);
      return;
    }
    const first = chunks[0];
    displayFiles.push({
      id: first.id,
      file_name: (first.file_name || '').replace(/\s+\(Part\s+\d+\/\d+\)$/i, '').trim(),
      uploaded_at: first.uploaded_at,
      figma_file_key: first.figma_file_key,
      project_id: first.project_id,
      _isChunked: true,
      _chunks: chunks
    });
  });

  const finalGroups = new Map<string, any[]>();
  displayFiles.forEach((file: any) => {
    const logicalKey = getLogicalFileId(file);
    if (!logicalKey) {
      finalGroups.set(`single::${file.id}`, [file]);
      return;
    }
    if (!finalGroups.has(logicalKey)) finalGroups.set(logicalKey, []);
    finalGroups.get(logicalKey)!.push(file);
  });

  const groupedDisplay: any[] = [];
  finalGroups.forEach((group) => {
    if (group.length === 1) {
      const single = group[0];
      groupedDisplay.push({
        ...single,
        _stableLogicalId: getStableLogicalFileId(single),
        _normalizedFileName: getNormalizedFileName(single),
      });
      return;
    }
    const sorted = [...group].sort((a: any, b: any) => new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime());
    const first = sorted[0];
    const chunks = sorted.flatMap((item: any) => item._chunks ? item._chunks : [item]);
    groupedDisplay.push({
      id: first.id,
      file_name: first.file_name,
      uploaded_at: first.uploaded_at,
      figma_file_key: first.figma_file_key,
      project_id: first.project_id,
      _stableLogicalId: getStableLogicalFileId(first),
      _normalizedFileName: getNormalizedFileName(first),
      _isGroupedFile: true,
      _chunks: chunks
    });
  });

  const groupedByName = new Map<string, any[]>();
  groupedDisplay.forEach((file: any) => {
    const normalizedFileName = typeof file._normalizedFileName === 'string' ? file._normalizedFileName : getNormalizedFileName(file);
    const nameKey = normalizedFileName || String(file.id || '');
    if (!groupedByName.has(nameKey)) groupedByName.set(nameKey, []);
    groupedByName.get(nameKey)!.push(file);
  });

  const mergedDisplay: any[] = [];
  groupedByName.forEach((nameGroup) => {
    const stableIds = Array.from(new Set(
      nameGroup
        .map((file: any) => (typeof file._stableLogicalId === 'string' ? file._stableLogicalId : ''))
        .filter(Boolean)
    ));

    if (nameGroup.length === 1 || stableIds.length > 1) {
      mergedDisplay.push(...nameGroup);
      return;
    }

    const sorted = [...nameGroup].sort((a: any, b: any) => new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime());
    const first = sorted[0];
    const chunks = sorted.flatMap((item: any) => item._chunks ? item._chunks : [item]);
    mergedDisplay.push({
      ...first,
      file_name: first._normalizedFileName || first.file_name,
      _stableLogicalId: stableIds[0] || '',
      _isGroupedFile: true,
      _chunks: chunks
    });
  });

  return mergedDisplay.sort((a: any, b: any) => new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime());
}

function buildLogicalFileMap(displayFiles: any[]) {
  const physicalToLogical = new Map<string, { id: string; fileName: string }>();
  displayFiles.forEach((file: any) => {
    const logical = {
      id: file.id,
      fileName: file.file_name || `Index ${file.id}`
    };
    const units = file._chunks ? file._chunks : [file];
    units.forEach((unit: any) => {
      if (unit?.id) physicalToLogical.set(unit.id, logical);
    });
  });
  return physicalToLogical;
}

function groupLobbyThumbnailResults(displayFiles: any[], thumbnailResults: any[]) {
  const grouped = new Map<string, { id: string; fileName: string; thumbnail?: string; frameCount: number }>();
  const physicalToLogical = buildLogicalFileMap(displayFiles);

  thumbnailResults.forEach((result: any) => {
    if (!result?.success) return;
    const logical = physicalToLogical.get(result.fileId) || { id: result.fileId, fileName: result.fileName || `Index ${result.fileId}` };
    const existing = grouped.get(logical.id);
    if (!existing) {
      grouped.set(logical.id, {
        id: logical.id,
        fileName: logical.fileName,
        thumbnail: result.thumbnail || undefined,
        frameCount: result.frameCount || 0
      });
      return;
    }
    existing.frameCount += result.frameCount || 0;
    if (!existing.thumbnail && result.thumbnail) existing.thumbnail = result.thumbnail;
  });

  return Array.from(grouped.values());
}

function buildLobbyThumbnailsFromMetadata(displayFiles: any[]) {
  return displayFiles.map((file: any) => {
    const chunks = file._chunks ? file._chunks : [file];
    var thumbnail = file.file_thumbnail_url || null;
    var frameCount = 0;

    chunks.forEach((chunk: any) => {
      if (!thumbnail && chunk?.file_thumbnail_url) thumbnail = chunk.file_thumbnail_url;
      if (typeof chunk?.frame_count === 'number') frameCount += chunk.frame_count;
    });

    if (frameCount === 0 && typeof file?.frame_count === 'number') {
      frameCount = file.frame_count;
    }

    return {
      id: file.id,
      fileName: file.file_name,
      thumbnail: thumbnail || undefined,
      frameCount: frameCount || 0
    };
  });
}

function parseIndexPayload(raw: any): any {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getPagesFromIndexPayload(raw: any): any[] {
  const parsed = parseIndexPayload(raw);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.pages)) return parsed.pages;
  return [];
}

function normalizeFrameForGallery(frame: any, pageName: string, fileMeta?: { id?: string; fileName?: string }) {
  return {
    ...frame,
    pageName: pageName || frame.pageName || '',
    frameTags: Array.isArray(frame.frameTags) ? frame.frameTags : (Array.isArray(frame.tags) ? frame.tags : []),
    customTags: Array.isArray(frame.customTags) ? frame.customTags : (frame.customTags ? [frame.customTags] : []),
    textContent: frame.textContent || null,
    searchTokens: Array.isArray(frame.searchTokens) ? frame.searchTokens : null,
    _fileId: fileMeta?.id || frame._fileId,
    _fileName: fileMeta?.fileName || frame._fileName,
  };
}

function extractFramesFromIndexPayload(raw: any, fileMeta?: { id?: string; fileName?: string }) {
  const parsed = parseIndexPayload(raw);
  const pages = getPagesFromIndexPayload(raw);
  const seen = new Set<string>();
  const pageFrames = pages.flatMap((item: any) => {
    if (!item?.frames?.length) return [];
    const pageName = item.name || item.pageName || '';
    return item.frames
      .map((frame: any) => normalizeFrameForGallery(frame, pageName, fileMeta))
      .filter((frame: any, index: number) => {
        const key = String(frame.url || frame.id || `${fileMeta?.id || 'file'}::${pageName}::${frame.name || 'frame'}::${index}`);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  });

  if (pageFrames.length > 0) return pageFrames;

  if (Array.isArray(parsed)) {
    return parsed
      .filter((item: any) => item?.name && (item?.image || item?.url))
      .map((item: any) => normalizeFrameForGallery(item, '', fileMeta))
      .filter((frame: any, index: number) => {
        const key = String(frame.url || frame.id || `${fileMeta?.id || 'file'}::direct::${frame.name || 'frame'}::${index}`);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  return [];
}

function extractLobbyPreviewFromIndexPayload(raw: any, coverImageUrl?: string | null) {
  const parsed = parseIndexPayload(raw);
  const pages = getPagesFromIndexPayload(raw);
  let thumbnail = coverImageUrl || null;
  let totalFrameCount = 0;

  pages.forEach((page: any) => {
    if (!Array.isArray(page?.frames) || page.frames.length === 0) return;
    totalFrameCount += page.frames.length;
    if (!thumbnail) {
      const firstFrame = page.frames[0];
      thumbnail = firstFrame?.thumb_url || firstFrame?.image || null;
    }
  });

  if (!thumbnail && parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.coverImageUrl) {
    thumbnail = parsed.coverImageUrl;
  }

  if (totalFrameCount === 0 && Array.isArray(parsed)) {
    const directFrames = parsed.filter((item: any) => item?.name && (item?.image || item?.url));
    totalFrameCount = directFrames.length;
    if (!thumbnail && directFrames.length > 0) {
      thumbnail = directFrames[0]?.thumb_url || directFrames[0]?.image || null;
    }
  }

  return { thumbnail, totalFrameCount };
}

async function parseJsonResponse(response: Response, context: string) {
  const text = await response.text();
  if (!response.ok) {
    const message = text ? text.slice(0, 200) : `HTTP ${response.status}`;
    throw new Error(`${context}: ${message}`);
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    const snippet = text ? text.slice(0, 200) : 'Empty response';
    throw new Error(`${context}: ${snippet}`);
  }
}

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(mapper));
    results.push(...batchResults);
  }
  return results;
}

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
  const [indexFiles, setIndexFiles] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState('');
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareCopied, setShareCopied] = useState<string | null>(null); // Track which share link was copied
  const [sharedViews, setSharedViews] = useState<any[]>([]);
  const [selectedShareType, setSelectedShareType] = useState<'all_indices' | 'search_results' | null>(null);
  const [creatingShare, setCreatingShare] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null); // Track which share link name is being edited
  const [editingNameValue, setEditingNameValue] = useState<string>(''); // Temporary value for editing
  const [fixingIndices, setFixingIndices] = useState(false);
  
  // Gallery Lobby state
  const [viewMode, setViewMode] = useState<'lobby' | 'allFrames' | 'file'>('lobby'); // 'lobby' = show file thumbnails, 'allFrames' = show all frames, 'file' = show frames of selected file
  const [selectedFile, setSelectedFile] = useState<{ id: string; fileName: string } | null>(null);
  const [fileThumbnails, setFileThumbnails] = useState<Array<{ id: string; fileName: string; thumbnail?: string; frameCount: number }>>([]);
  const [allFramesData, setAllFramesData] = useState<any[]>([]); // Store all frames for allFrames view
  const [guestPlan, setGuestPlan] = useState<string | null>(null); // Plan from get-indices when guest (e.g. 'guest')
  const [lobbyFramesLoading, setLobbyFramesLoading] = useState(false);
  const [authFromUrlApplied, setAuthFromUrlApplied] = useState(0); // Incremented when apiKey/viewToken applied from URL; triggers reload
  const [visibilityRefreshTrigger, setVisibilityRefreshTrigger] = useState(0); // Incremented when tab becomes visible; triggers reload (e.g. after indexing from plugin)

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
    customTags: true,
    sizeTags: true
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
  const [namingTagsFilter, setNamingTagsFilter] = useState<string>('');
  const [sizeTagsFilter, setSizeTagsFilter] = useState<string>('');
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
    setNamingTagsFilter('');
    setSizeTagsFilter('');
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

  // Accept apiKey from URL (for FigDex plugin – sets figma_web_user so gallery loads indices without prior web login)
  useEffect(() => {
    if (!router.isReady || typeof window === 'undefined') return;
    const rawKey = router.query.apiKey;
    const apiKey = Array.isArray(rawKey) ? rawKey[0] : rawKey;
    if (!apiKey || typeof apiKey !== 'string') return;
    const applyApiKey = async () => {
      try {
        const resp = await fetch('/api/validate-api-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey }),
        });
        const data = await resp.json();
        const user = data?.user || {};
        const storedUser = {
          email: user.email || '',
          full_name: user.full_name || user.name || 'Guest',
          api_key: apiKey,
        };
        localStorage.setItem('figma_web_user', JSON.stringify(storedUser));
        const url = new URL(window.location.href);
        url.searchParams.delete('apiKey');
        window.history.replaceState({}, '', url.toString());
        setAuthFromUrlApplied((n) => n + 1);
      } catch (e) {
        console.error('Failed to apply apiKey from URL', e);
      }
    };
    applyApiKey();
  }, [router.isReady, router.query.apiKey]);

  // Load index data
  useEffect(() => {
    const loadIndexData = async () => {
      try {
        setLoading(true);
        setError('');
        let user = null;
        let anonId: string | null = null;
        if (typeof window !== 'undefined') {
          const userStr = localStorage.getItem('figma_web_user');
          if (userStr) user = JSON.parse(userStr);
          const raw = router.query.anonId;
          anonId = (Array.isArray(raw) ? raw[0] : raw) || localStorage.getItem('figdex_anon_id') || null;
          if (anonId) anonId = anonId.trim().slice(0, 200) || null;
          if (anonId && typeof window !== 'undefined') localStorage.setItem('figdex_anon_id', anonId);
        }
        // Prefer logged-in user over anonId: after claim, indices move to user_id so guest path returns empty
        const useGuestPath = anonId && (!user || !user.email);
          if (useGuestPath && anonId) {
            setCurrentIndexFile('guest');
            const response = await fetch(`/api/get-indices?anonId=${encodeURIComponent(anonId)}`);
            const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            if (data.plan) {
              setGuestPlan(data.plan);
              if (typeof window !== 'undefined') localStorage.setItem('figdex_plan', data.plan);
            }
            const displayFiles = groupLogicalFiles(data.data);
            setIndexFiles(displayFiles);
            setFrames([]);
            // Load file thumbnails and frames for guest (same as user path)
            const filesToLoad = displayFiles.flatMap((f: any) => (f._chunks ? f._chunks : [f]));
            const allFileThumbnails: Array<{ id: string; fileName: string; thumbnail?: string; frameCount: number }> = buildLobbyThumbnailsFromMetadata(displayFiles);
            setFileThumbnails(allFileThumbnails);
            setAllFramesData([]);
            setLoading(false);
            setLobbyFramesLoading(false);
            return;
          }
        }
        if (!user || !user.email) {
          setError('No logged in user found. Sign in or open your gallery link from the Figma plugin.');
          setFrames([]);
          setLoading(false);
          return;
        }
        setCurrentIndexFile(user.email);
        const response = await fetch(`/api/get-indices?userEmail=${encodeURIComponent(user.email)}`);
        const data = await response.json();
        galleryDebug('Get indices response:', data);
        
        // Check for warning message (indices with null user_id or no user found)
        if (data.warning) {
          galleryWarn('⚠️', data.warning);
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
          const displayFiles = groupLogicalFiles(data.data);
          setIndexFiles(displayFiles);
          
          // Load all frames from all indices in parallel (much faster!)
          galleryDebug('Loading all frames from', data.data.length, 'indices in parallel...');
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
              
              // Debug: Check if thumb_url exists in frames
              if (indexData.data && indexData.data.index_data) {
                const dataContent = indexData.data.index_data;
                const framesArray = Array.isArray(dataContent) 
                  ? dataContent.flatMap((item: any) => item.frames || [])
                  : [];
                const framesWithThumbs = framesArray.filter((f: any) => f.thumb_url).length;
                if (framesArray.length > 0) {
                  galleryDebug(`📊 Index ${file.id}: ${framesWithThumbs}/${framesArray.length} frames have thumb_url`);
                }
              }
              
              // Validate index_data structure
              if (!indexData.data || !indexData.data.index_data) {
                console.error(`❌ Index ${file.id} has invalid structure: missing index_data`);
                return { success: false, fileId: file.id, frames: [] };
              }
              
              // Try to parse index_data - handle both array and object formats
              const fileFrames = extractFramesFromIndexPayload(indexData.data.index_data, { id: file.id, fileName: file.file_name });
              
              return { success: true, fileId: file.id, frames: fileFrames, fileName: file.file_name };
            } catch (error) {
              console.error(`❌ Error loading index ${file.id} (${file.file_name}):`, error);
              return { success: false, fileId: file.id, frames: [] };
            }
          };
          
          const filesToLoad = displayFiles.flatMap((f: any) => (f._chunks ? f._chunks : [f]));
          const physicalToLogical = buildLogicalFileMap(displayFiles);

          // Load file thumbnails or frames based on view mode
          let loadPromises: Promise<any>[];
          let frameResults: any[] = [];
          
          if (viewMode === 'lobby') {
            const allFileThumbnails = buildLobbyThumbnailsFromMetadata(displayFiles);
            setFileThumbnails(allFileThumbnails);
            setAllFramesData([]);
            setLoading(false);
            setLobbyFramesLoading(false);
            return;
          } else if (viewMode === 'allFrames') {
            // Load all frames from all files
            loadPromises = filesToLoad.map((file: any) => loadIndexFrames(file));
            frameResults = await Promise.all(loadPromises);
          } else {
            // Load frames for file view (specific file)
            loadPromises = filesToLoad.map((file: any) => loadIndexFrames(file));
            frameResults = await Promise.all(loadPromises);
          }
          
          // Collect file thumbnails/frames and corrupted indices
          const allFrames: any[] = [];
          const corruptedIndices: string[] = [];
          
          // Process frame results – deduplicate by frame.id to avoid same frame from multiple indices
          const seenFrameIds = new Set<string>();
          frameResults.forEach(result => {
            if (result.success && result.frames && result.frames.length > 0) {
              console.log(`✅ Added ${result.frames.length} frames from ${result.fileName}`);
              // Debug: log tags for first frame
              if (result.frames.length > 0) {
                const firstFrame = result.frames[0];
                console.log('🔍 [loadIndexData] First frame tags:', {
                  name: firstFrame.name,
                  customTags: firstFrame.customTags,
                  customTagsType: typeof firstFrame.customTags,
                  isArray: Array.isArray(firstFrame.customTags),
                  frameTags: firstFrame.frameTags
                });
              }
              // Add fileId and fileName to each frame; skip duplicates by frame.url (Figma URL is unique) or frame.id
              const framesWithFileId = result.frames
                .filter((frame: any) => {
                  const fid = frame.url || frame.id || `${result.fileId}::${frame.name || 'u'}::${frame.id || ''}`;
                  if (seenFrameIds.has(fid)) return false;
                  seenFrameIds.add(fid);
                  return true;
                })
                .map((frame: any) => ({
                  ...frame,
                  _fileId: (physicalToLogical.get(result.fileId) || { id: result.fileId }).id,
                  _fileName: (physicalToLogical.get(result.fileId) || { fileName: result.fileName }).fileName
                }));
              allFrames.push(...framesWithFileId);
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
          
          // Debug logging and set state
          if (viewMode === 'allFrames') {
            if (allFrames.length > 0) {
              console.log(`✅ Successfully loaded ${allFrames.length} total frames from ${data.data.length - corruptedIndices.length} valid indices`);
            }
            setFrames(allFrames);
            setAllFramesData(allFrames);
          } else {
            if (allFrames.length > 0) {
              console.log(`✅ Successfully loaded ${allFrames.length} total frames from ${data.data.length - corruptedIndices.length} valid indices`);
            }
            setFrames(allFrames);
          }
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
  }, [router.isReady, router.query.index, router.query.anonId, viewMode, authFromUrlApplied, visibilityRefreshTrigger]);

  // When tab becomes visible (e.g. user returns after indexing from plugin), refetch indices
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handler = () => {
      if (!document.hidden) setVisibilityRefreshTrigger((n) => n + 1);
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // Load frames for specific file (handles chunked files by merging all chunks)
  const loadFileFrames = async (fileInfo: { id: string; fileName: string; _chunks?: any[] }) => {
    try {
      setLoading(true);
      setViewMode('file');
      setSelectedFile(fileInfo);
      // Clear frames first to prevent showing frames from previous file
      setFrames([]);
      
      const indicesToLoad = fileInfo._chunks?.length ? fileInfo._chunks : [{ id: fileInfo.id }];
      const seen = new Set<string>();
      const results = await mapInBatches(indicesToLoad, 4, async (idx: any) => {
        const indexId = typeof idx === 'object' && idx?.id ? idx.id : idx;
        const response = await fetch(`/api/get-index-data?indexId=${indexId}`);
        const data = await parseJsonResponse(response, 'Failed to load file frames');
        if (!data?.success || !data?.data?.index_data) {
          return { success: false, error: data?.error || 'Failed to load file frames', frames: [] };
        }
        const fileFrames = extractFramesFromIndexPayload(data.data.index_data, { id: fileInfo.id, fileName: fileInfo.fileName })
          .filter((frame: any, index: number) => {
            const key = String(frame.url || frame.id || `${fileInfo.id}::${frame.pageName || ''}::${frame.name || 'frame'}::${index}`);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        return { success: true, frames: fileFrames };
      });

      const failedResult = results.find((result: any) => !result.success);
      if (failedResult) {
        setError(failedResult.error || 'Failed to load file frames');
        setFrames([]);
        setLoading(false);
        return;
      }

      const allFrames: any[] = [];
      results.forEach((result: any) => {
        if (Array.isArray(result.frames)) allFrames.push(...result.frames);
      });
      
      setFrames(allFrames);
    } catch (err: any) {
      console.error('Error loading file frames:', err);
      setError(err.message || 'An error occurred while loading file frames');
      setFrames([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Load frames for specific index
  const loadIndexFrames = async (indexId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/get-index-data?indexId=${indexId}`);
      const data = await parseJsonResponse(response, 'Failed to load index frames');
      galleryDebug('Index data response:', data);
      
      if (data.success && data.data && data.data.index_data) {
        galleryDebug('Processing index data');
        
        const allFrames = extractFramesFromIndexPayload(data.data.index_data).map((frame: any) => {
          const frameCustomTags = Array.isArray(frame.customTags) ? frame.customTags : [];
          const hasCustomTagsFromPlugin = frameCustomTags.length > 0;
          const namingTags = deriveNamingTags(frame.name || '');
          const sizeTag = getSizeTag(frame.width, frame.height);
          let customTags = frameCustomTags;

          if (!hasCustomTagsFromPlugin) {
            const baseFrameTags = frame.frameTags || frame.tags || [];
            customTags = (Array.isArray(baseFrameTags) ? baseFrameTags : [])
              .filter((t: string) => t && !namingTags.includes(t) && !/^\d+x\d+$/i.test(t));
          }

          return {
            ...frame,
            namingTags,
            sizeTags: sizeTag ? [sizeTag] : [],
            customTags: Array.isArray(customTags) ? customTags : []
          };
        });
        
        galleryDebug('Setting frames:', allFrames.length);
        setFrames(allFrames);
      } else {
        galleryDebug('No valid data found');
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

  // In lobby mode, hydrate frame search data only when the user actually starts searching.
  useEffect(() => {
    if (viewMode !== 'lobby') return;
    if (!search.trim()) return;
    if (allFramesData.length > 0) return;
    if (indexFiles.length === 0) return;

    let cancelled = false;

    const loadLobbyFramesOnDemand = async () => {
      setLobbyFramesLoading(true);
      try {
        const filesToLoad = indexFiles.flatMap((file: any) => (file._chunks ? file._chunks : [file]));
        const physicalToLogical = buildLogicalFileMap(indexFiles);
        const seenFrameIds = new Set<string>();
        const hydratedFrames: any[] = [];
        const batchSize = 4;

        const loadFramesForFile = async (file: any) => {
          const indexResponse = await fetch(`/api/get-index-data?indexId=${file.id}`);
          if (!indexResponse.ok) return [];
          const indexData = await parseJsonResponse(indexResponse, `Failed to hydrate lobby frames for ${file.id}`);
          if (!indexData.success || !indexData.data?.index_data) return [];

          const logical = physicalToLogical.get(file.id) || { id: file.id, fileName: file.file_name };
          return extractFramesFromIndexPayload(indexData.data.index_data, { id: logical.id, fileName: logical.fileName })
            .filter((frame: any) => {
              const fid = frame.url || frame.id || `${logical.id}::${frame.name || 'u'}::${frame.pageName || ''}`;
              if (seenFrameIds.has(fid)) return false;
              seenFrameIds.add(fid);
              return true;
            });
        };

        for (let i = 0; i < filesToLoad.length; i += batchSize) {
          if (cancelled) return;
          const batch = filesToLoad.slice(i, i + batchSize);
          const batchResults = await Promise.all(batch.map((file: any) => loadFramesForFile(file)));
          batchResults.forEach((framesBatch) => hydratedFrames.push(...framesBatch));
        }

        if (!cancelled) {
          setAllFramesData(hydratedFrames);
        }
      } catch (error) {
        if (!cancelled) {
          galleryWarn('Lobby search hydration failed:', error);
        }
      } finally {
        if (!cancelled) {
          setLobbyFramesLoading(false);
        }
      }
    };

    loadLobbyFramesOnDemand();

    return () => {
      cancelled = true;
    };
  }, [viewMode, search, indexFiles, allFramesData.length]);

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

  // Load shared views
  const loadSharedViews = async () => {
    try {
      const user = getCurrentUser();
      if (!user || !user.api_key) return;

      const response = await fetch('/api/user/share', {
        headers: {
          'Authorization': `Bearer ${user.api_key}`
        }
      });
      const data = await response.json();

      if (data.success) {
        setSharedViews(data.sharedViews || []);
      }
    } catch (error) {
      console.error('Error loading shared views:', error);
    }
  };

  // Handle share gallery
  const handleShareGallery = () => {
    setShareDialogOpen(true);
    loadSharedViews();
  };

  // Create share link
  const handleCreateShare = async (shareType: 'all_indices' | 'search_results') => {
    try {
      setCreatingShare(true);
      const user = getCurrentUser();
      if (!user || !user.api_key) {
        alert('User not authenticated');
        return;
      }

      // Prepare search params for search_results
      let searchParams: any = null;
      if (shareType === 'search_results') {
        searchParams = {
          textSearch: search,
          sizeTags: selectedSizeTags.length > 0 ? selectedSizeTags : undefined,
          customTags: selectedCustomTags.length > 0 ? selectedCustomTags : undefined
        };
        // Remove undefined values
        Object.keys(searchParams).forEach(key => searchParams[key] === undefined && delete searchParams[key]);
      }

      const response = await fetch('/api/user/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.api_key}`
        },
        body: JSON.stringify({
          shareType,
          searchParams: shareType === 'search_results' ? searchParams : undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setShareUrl(data.shareUrl);
        await loadSharedViews();
      } else {
        alert(`Failed to create share link: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating share:', error);
      alert('Error creating share link');
    } finally {
      setCreatingShare(false);
    }
  };

  // Disable share link
  const handleDisableShare = async (shareId: string) => {
    if (!confirm('Are you sure you want to disable this share link?')) {
      return;
    }

    try {
      const user = getCurrentUser();
      if (!user || !user.api_key) {
        alert('User not authenticated');
        return;
      }

      const response = await fetch('/api/user/share', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.api_key}`
        },
        body: JSON.stringify({
          id: shareId,
          enabled: false
        })
      });

      const data = await response.json();

      if (data.success) {
        await loadSharedViews();
        if (shareUrl && sharedViews.find(v => v.id === shareId)?.shareUrl === shareUrl) {
          setShareUrl('');
        }
      } else {
        alert(`Failed to disable share link: ${data.error}`);
      }
    } catch (error) {
      console.error('Error disabling share:', error);
      alert('Error disabling share link');
    }
  };

  // Delete share link
  const handleDeleteShare = async (shareId: string) => {
    if (!confirm('Are you sure you want to delete this share link?')) {
      return;
    }

    try {
      const user = getCurrentUser();
      if (!user || !user.api_key) {
        alert('User not authenticated');
        return;
      }

      const response = await fetch(`/api/user/share?id=${shareId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.api_key}`
        }
      });

      const data = await response.json();

      if (data.success) {
        await loadSharedViews();
        if (shareUrl && sharedViews.find(v => v.id === shareId)?.shareUrl === shareUrl) {
          setShareUrl('');
        }
      } else {
        alert(`Failed to delete share link: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting share:', error);
      alert('Error deleting share link');
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
  // Use allFramesData to include tags from all files (for lobby view) or frames for current file
  // Note: namingTags are NOT included in filter options, but are still used for search
  const getFilterOptions = useMemo(() => {
    const sizeTags = new Set<string>();
    const customTags = new Set<string>();

    // Use allFramesData if available (for lobby/allFrames view), otherwise use frames (for file view)
    const sourceFrames = allFramesData.length > 0 ? allFramesData : frames;

    sourceFrames.forEach((frame, idx) => {
       const sTag = ((frame as any).sizeTags && (frame as any).sizeTags[0]) || getSizeTag((frame as any).width, (frame as any).height);
      if (sTag) sizeTags.add(sTag);
      
      if ((frame as any).customTags && Array.isArray((frame as any).customTags)) {
        (frame as any).customTags.forEach((tag: string) => {
          if (tag && typeof tag === 'string' && tag.trim().length > 0) {
            customTags.add(tag.trim());
          }
        });
      }
    });

    return {
      sizeTags: Array.from(sizeTags).sort(),
      customTags: Array.from(customTags).sort()
    };
  }, [allFramesData, frames]);

  // 1. Create flat array of all thumbnails from all pages
  // Create file thumbnails for lobby view
  const allFileThumbs = useMemo(() => {
    // Fallback: when loadFileThumbnail returns 0 frames but allFramesData has frames, count from there
    const countByFileId = new Map<string, number>();
    for (const f of allFramesData) {
      const fid = (f as any)._fileId;
      if (fid) countByFileId.set(fid, (countByFileId.get(fid) || 0) + 1);
    }
    const thumbByFileId = new Map<string, { thumbnail?: string; frameCount: number }>();
    fileThumbnails.forEach((file) => {
      if (!thumbByFileId.has(file.id)) {
        thumbByFileId.set(file.id, { thumbnail: file.thumbnail, frameCount: file.frameCount });
        return;
      }
      const existing = thumbByFileId.get(file.id)!;
      existing.frameCount += file.frameCount || 0;
      if (!existing.thumbnail && file.thumbnail) existing.thumbnail = file.thumbnail;
    });
    return indexFiles.map((file: any, idx) => {
      const thumbInfo = thumbByFileId.get(file.id) || { thumbnail: undefined, frameCount: 0 };
      let frameCount = thumbInfo.frameCount;
      if (frameCount === 0 && countByFileId.has(file.id)) {
        frameCount = countByFileId.get(file.id) || 0;
      }
      return {
        file: {
          id: file.id,
          fileName: file.file_name || file.fileName,
          _chunks: file._chunks,
          frameCount
        },
        thumb: {
          thumbName: `${file.id}_${idx}`,
          label: file.file_name || file.fileName,
          image: thumbInfo.thumbnail || null, // Use null instead of empty string to avoid placeholder
        },
        index: idx
      };
    });
  }, [fileThumbnails, allFramesData, indexFiles]);

  // Create gallery thumbs from allFramesData for search in lobby mode
  // Also store fileId mapping for filtering files by matching frames
  const allFramesGalleryThumbs = useMemo(() => {
    let idx = 0;
    
    return allFramesData.map((frame) => {
      const fileId = (frame as any)._fileId;
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
      
      const fileName = (frame as any)._fileName || null;
      const pageName = (frame as any).pageName || null;
      const filePageSubtitle = [fileName, pageName].filter(Boolean).join(' • ');
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
          // Preserve textContent and searchTokens for search
          textContent: (frame as any).textContent || null,
          searchTokens: (frame as any).searchTokens || null,
          pageName,
          _fileName: fileName,
        },
        thumb: {
          thumbName: uniqueId,
          label: frame.name || 'Untitled Frame',
          image: frame.image || '',
          thumbnail: (frame as any).thumb_url || frame.image || '',
          texts: textBundle,
          url: frame.url || '',
          filePageSubtitle, // e.g. "MyFile.fig • Page 1" for display under frame name
        },
        index: currentIdx,
        _fileId: fileId // Store fileId for mapping back to files
      });
    });
  }, [allFramesData]);

  // Filter file thumbnails by text search
  // In lobby mode: if searching, filter files based on matching frames; otherwise filter by file name
  const filteredFileThumbs = useMemo(() => {
    if (!search.trim()) return allFileThumbs;
    
    // If in lobby mode and we have allFramesGalleryThumbs, filter files by matching frames
    if (viewMode === 'lobby' && allFramesGalleryThumbs.length > 0) {
      const q = search.toLowerCase().trim();
      // Find frames that match the search
      const wordBoundaryRegex = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      const matchingFrames = allFramesGalleryThumbs.filter(({ frame, thumb }) => {
        if (frame.name && wordBoundaryRegex.test(frame.name)) return true;
        if (thumb.label && wordBoundaryRegex.test(thumb.label)) return true;
        if ((frame as any).pageName && String((frame as any).pageName).toLowerCase().includes(q)) return true;
        if ((frame as any).textContent && wordBoundaryRegex.test(String((frame as any).textContent))) return true;
        if ((frame as any).searchTokens && Array.isArray((frame as any).searchTokens)) {
          const tokens = (frame as any).searchTokens.map((t: string) => String(t || '').trim()).filter(Boolean);
          if (tokens.some((token: string) => token.toLowerCase() === q || wordBoundaryRegex.test(token))) return true;
        }
        if (thumb.texts && wordBoundaryRegex.test(thumb.texts)) return true;
        if (frame.customTags && Array.isArray(frame.customTags) &&
            frame.customTags.some((tag: string) => tag.toLowerCase() === q || wordBoundaryRegex.test(tag))) return true;
        if (frame.frameTags && Array.isArray(frame.frameTags) &&
            frame.frameTags.some((tag: string) => tag.toLowerCase() === q || wordBoundaryRegex.test(tag))) return true;
        return false;
      });
      
      // Get unique fileIds from matching frames
      const matchingFileIds = new Set(
        matchingFrames.map((item: any) => item._fileId).filter(Boolean)
      );
      
      galleryDebug(`🔍 Search "${search}": Found ${matchingFrames.length} matching frames in ${matchingFileIds.size} files`);
      
      // Return only files that have matching frames
      return allFileThumbs.filter(({ file }) => matchingFileIds.has(file.id));
    }
    
    // Otherwise, filter by file name (fallback)
    const q = search.toLowerCase();
    return allFileThumbs.filter(({ file, thumb }) =>
      file.fileName.toLowerCase().includes(q) ||
      (thumb.label && thumb.label.toLowerCase().includes(q))
    );
  }, [allFileThumbs, search, viewMode, allFramesGalleryThumbs]);

  const allGalleryThumbs = useMemo(() => {
    let idx = 0;
    
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
          // Preserve textContent and searchTokens for search
          textContent: (frame as any).textContent || null,
          searchTokens: (frame as any).searchTokens || null,
        },
        thumb: {
          thumbName: uniqueId,
          label: frame.name || 'Untitled Frame',
          image: frame.image || '',
          thumbnail: (frame as any).thumb_url || frame.image || '', // Use thumb_url if available, fallback to image
          texts: textBundle,
          url: frame.url || ''
        },
        index: currentIdx,
      });
    });
  }, [frames]);

  // Filter gallery thumbnails by text search (page name, label, texts)
  // In lobby mode with search: search in all frames; in file/allFrames mode: search in current frames
  // In lobby mode without search: use allFramesGalleryThumbs (but won't be used for display)
  const filteredThumbs = useMemo(() => {
    if (!search.trim()) {
      // When no search, return appropriate source (but for lobby mode without search, we show file thumbs, not these)
      return viewMode === 'lobby' ? allFramesGalleryThumbs : allGalleryThumbs;
    }
    const q = search.toLowerCase().trim();
    const sourceThumbs = viewMode === 'lobby' ? allFramesGalleryThumbs : allGalleryThumbs;
    const wordBoundaryRegex = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return sourceThumbs.filter(({ frame, thumb }) => {
      // Search in frame name
      if (frame.name && wordBoundaryRegex.test(frame.name)) {
        console.log(`✅ [Search] Match in name: "${frame.name}"`);
        return true;
      }
      // Search in label
      if (thumb.label && wordBoundaryRegex.test(thumb.label)) {
        console.log(`✅ [Search] Match in label: "${thumb.label}"`);
        return true;
      }
      // Search in pageName (e.g. "novapay" contains "nova") - use includes for compound names
      if ((frame as any).pageName && String((frame as any).pageName).toLowerCase().includes(q)) {
        console.log(`✅ [Search] Match in pageName: "${(frame as any).pageName}"`);
        return true;
      }
      
      // Search in textContent - word boundary only
      if ((frame as any).textContent && wordBoundaryRegex.test(String((frame as any).textContent || ''))) {
        console.log(`✅ [Search] Match in textContent: "${frame.name}"`);
        return true;
      }
      
      // Search in searchTokens - exact or word-boundary (avoid "innovation" matching "nova")
      if ((frame as any).searchTokens && Array.isArray((frame as any).searchTokens)) {
        const tokens = (frame as any).searchTokens.map((t: string) => String(t || '').trim()).filter(Boolean);
        const tokenMatch = tokens.find((token: string) => token.toLowerCase() === q || wordBoundaryRegex.test(token));
        if (tokenMatch) {
          console.log(`✅ [Search] Match in searchTokens: "${frame.name}"`);
          return true;
        }
      }
      
      // Search in texts (fallback) - word boundary only
      if (thumb.texts && wordBoundaryRegex.test(thumb.texts)) {
        console.log(`✅ [Search] Match in texts: "${frame.name}"`);
        return true;
      }
      
      // Search in custom tags - exact or word-boundary
      if (frame.customTags && Array.isArray(frame.customTags)) {
        if (frame.customTags.some((tag: string) => tag.toLowerCase() === q || wordBoundaryRegex.test(tag))) {
          console.log(`✅ [Search] Match in customTags: "${frame.name}"`);
          return true;
        }
      }
      if (frame.frameTags && Array.isArray(frame.frameTags)) {
        if (frame.frameTags.some((tag: string) => tag.toLowerCase() === q || wordBoundaryRegex.test(tag))) {
          console.log(`✅ [Search] Match in frameTags: "${frame.name}"`);
          return true;
        }
      }
      return false;
    });
  }, [viewMode === 'lobby' ? allFramesGalleryThumbs : allGalleryThumbs, search, viewMode]);

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

    // Filter by naming tags - REMOVED: naming tags are only used for search, not for filtering

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
  }, [filteredThumbs, selectedSizeTags, selectedCustomTags, showFavorites, favorites]);

  // Final visible thumbs - reindex to match their position in the filtered array
  // Determine which thumbs to show based on view mode
  const visibleThumbs = useMemo(() => {
    if (viewMode === 'lobby') {
      // In lobby mode: if searching, show matching frames; otherwise show file thumbs
      if (search.trim()) {
        // Show matching frames when searching in lobby
        return advancedFilteredThumbs.map((thumb, idx) => ({
          ...thumb,
          index: idx,
          isFile: false
        }));
      } else {
        // Show file thumbs when not searching in lobby
        return filteredFileThumbs.map((thumb, idx) => ({
          ...thumb,
          index: idx,
          isFile: true
        }));
      }
    } else if (viewMode === 'allFrames') {
      // In allFrames mode, show all frame thumbs
      return advancedFilteredThumbs.map((thumb, idx) => ({
        ...thumb,
        index: idx,
        isFile: false
      }));
    } else {
      // In file mode, show frame thumbs from selected file only
      return advancedFilteredThumbs.map((thumb, idx) => ({
        ...thumb,
        index: idx,
        isFile: false
      }));
    }
  }, [viewMode === 'lobby' ? (search.trim() ? advancedFilteredThumbs : filteredFileThumbs) : advancedFilteredThumbs, viewMode, search]);
  const totalPages = Math.max(1, Math.ceil(visibleThumbs.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [search, showFavorites, selectedFrameTypes, selectedColors, selectedAspectRatios, selectedDevices, selectedSections, selectedSizeTags, selectedCustomTags]);

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
  // Filter out files from modal - only show frames
  const frameThumbsForModal = useMemo(() => {
    return visibleThumbs.filter((item: any) => !item.isFile && item.frame);
  }, [visibleThumbs]);
  const modalThumb = modalIndex !== null ? frameThumbsForModal[modalIndex] : null;

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
          i !== null && i < frameThumbsForModal.length - 1 ? i + 1 : i
        );
      } else if (e.key === "ArrowLeft") {
        setModalIndex((i) => (i !== null && i > 0 ? i - 1 : i));
      } else if (e.key === "Escape") {
        setModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, frameThumbsForModal.length]);

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

          {/* Navigation - Unified */}
          <Box sx={{ mb: 3, p: 2, bgcolor: '#f9f9f9', borderRadius: 2, border: '1px solid #e0e0e0', maxHeight: 400, overflowY: 'auto' }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: '#1a1a1a' }}>
              Navigation
            </Typography>
            <List dense sx={{ p: 0 }}>
              {/* Gallery Lobby - First item */}
              <ListItemButton
                selected={viewMode === 'lobby' && !selectedFile}
                onClick={() => {
                  setViewMode('lobby');
                  setSelectedFile(null);
                  setSelectedIndex('');
                  // useEffect will reload data when viewMode changes
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
                <ViewModuleIcon sx={{ mr: 1, fontSize: 18 }} />
                <ListItemText primary="Gallery Lobby" primaryTypographyProps={{ variant: 'body2' }} />
              </ListItemButton>
              
              {/* All Frames - Second item */}
              <ListItemButton
                selected={viewMode === 'allFrames'}
                onClick={() => {
                  setViewMode('allFrames');
                  setSelectedFile(null);
                  setSelectedIndex('');
                  // useEffect will reload data when viewMode changes
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
                <GridViewIcon sx={{ mr: 1, fontSize: 18 }} />
                <ListItemText primary="All Frames" primaryTypographyProps={{ variant: 'body2' }} />
              </ListItemButton>
              
              {/* Files - Hierarchical under Lobby */}
              {indexFiles.map((file) => (
                <ListItemButton
                  key={file.id}
                  selected={selectedIndex === file.id || (selectedFile?.id === file.id && viewMode === 'file')}
                  onClick={() => {
                    setSelectedIndex(file.id);
                    loadFileFrames({ id: file.id, fileName: file.file_name || `Index ${file.id}`, _chunks: file._chunks });
                  }}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    pl: 4,
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
              {viewMode === 'lobby' ? 
                `Showing ${visibleThumbs.length} files (${pagedThumbs.length} on page ${page}/${totalPages})` :
                viewMode === 'allFrames' ?
                  `Showing ${visibleThumbs.length} of ${allGalleryThumbs.length} frames (${pagedThumbs.length} on page ${page}/${totalPages})` :
                selectedIndex ? 
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

          {/* Naming Tags Filter - Removed: naming tags are only used for search, not displayed in filters or under frames */}

          {/* Size Tags Filter */}
          <Box sx={filterCardSx}>
            <ListItemButton 
              onClick={() => toggleFilterExpansion('sizeTags')}
              sx={{ px: 0, py: 1 }}
            >
              <ColorLensIcon sx={{ mr: 1 }} />
              <Typography variant="subtitle2" sx={{ flex: 1 }}>
                Size ({selectedSizeTags.length})
              </Typography>
              {filtersExpanded.sizeTags ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItemButton>
            <Collapse in={filtersExpanded.sizeTags}>
              <Box sx={{ ml: 2, mt: 1 }}>
                <TextField
                  size="small"
                  placeholder="Filter tags..."
                  value={sizeTagsFilter}
                  onChange={(e) => setSizeTagsFilter(e.target.value)}
                  sx={{ 
                    mb: 1.5, 
                    width: '100%',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1,
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <SearchIcon sx={{ color: '#999', mr: 1, fontSize: 18 }} />
                    )
                  }}
                />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {getFilterOptions.sizeTags
                    .filter(tag => tag.toLowerCase().includes(sizeTagsFilter.toLowerCase()))
                    .map((tag) => {
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
              </Box>
            </Collapse>
          </Box>

          {/* Custom Tags Filter */}
          <Box sx={filterCardSx}>
            <ListItemButton 
              onClick={() => toggleFilterExpansion('customTags')}
              sx={{ px: 0, py: 1 }}
            >
              <ColorLensIcon sx={{ mr: 1 }} />
              <Typography variant="subtitle2" sx={{ flex: 1 }}>
                Custom Tags ({selectedCustomTags.length})
              </Typography>
              {filtersExpanded.customTags ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItemButton>
            <Collapse in={filtersExpanded.customTags}>
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
              <Box>
                <Typography variant="h3" fontWeight={700} sx={{ letterSpacing: 1 }}>
                  FigDex
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  {currentIndexFile === 'guest' && (
                    <Chip 
                      label={(guestPlan || 'guest').charAt(0).toUpperCase() + (guestPlan || 'guest').slice(1)} 
                      size="small"
                      sx={{ fontSize: '0.65rem', height: '20px', bgcolor: '#e3f2fd', color: '#1565c0' }}
                    />
                  )}
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
                <MenuItem onClick={() => { router.push('/'); handleUserMenuClose(); }}>
                  <ListItemIcon>
                    <SearchIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>My FigDex</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { handleShareGallery(); handleUserMenuClose(); }}>
                  <ListItemIcon>
                    <ShareIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Share Gallery</ListItemText>
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
                <MenuItem onClick={handleCopyApiKey}>
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
                  placeholder={viewMode === 'lobby' ? "Search all frames..." : viewMode === 'allFrames' ? "Search all frames..." : "Search frames..."}
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
        {/* Main gallery: lobby uses Grid (avoids Masonry overlap with 1-2 covers), file/allFrames use Masonry */}
        {viewMode === 'lobby' ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 2,
              width: '100%'
            }}
          >
          {pagedThumbs.map((item: any, idx: number) => {
            // Handle both file and frame views
            if (item.isFile && item.file) {
              // Render file thumbnail (lobby view)
              const { file, thumb } = item;
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
                  onClick={() => loadFileFrames(file)}
                >
                  {thumb.image ? (
                    <>
                      {console.log(`📸 [Render] Rendering cover image for ${file.fileName}: ${thumb.image.substring(0, 60)}...`)}
                      <img
                        src={thumb.image}
                        alt={thumb.label}
                        loading="lazy"
                        style={{
                          borderRadius: 10,
                          border: '1.5px solid #e0e0e0',
                          background: '#fff',
                          marginBottom: 6,
                          width: '100%',
                          height: '156px', // 5:3 aspect ratio (width * 3/5): 260 * 3/5 = 156
                          display: 'block',
                          objectFit: 'cover'
                        }}
                        onLoad={() => {
                          console.log(`✅ [Cover Image] Successfully loaded: ${thumb.image?.substring(0, 60)}...`);
                        }}
                      onError={(e) => {
                        const imgElement = e.target as HTMLImageElement;
                        const fullUrl = imgElement.src;
                        console.error(`❌ [Cover Image] Failed to load: ${fullUrl}`);
                        console.error(`❌ [Cover Image] Error details:`, {
                          type: e.type,
                          target: imgElement,
                          naturalWidth: imgElement.naturalWidth,
                          naturalHeight: imgElement.naturalHeight,
                          complete: imgElement.complete,
                          src: imgElement.src
                        });
                        
                        // Try to fetch the URL directly to see what error we get
                        fetch(fullUrl, { method: 'HEAD', mode: 'no-cors' })
                          .then(() => console.log(`✅ [Cover Image] URL is accessible (no-cors mode)`))
                          .catch((fetchError) => {
                            console.error(`❌ [Cover Image] Fetch error:`, fetchError);
                            // Try to check if it's a CORS issue
                            fetch(fullUrl, { method: 'HEAD' })
                              .then((response) => {
                                console.log(`✅ [Cover Image] URL is accessible, status: ${response.status}`);
                              })
                              .catch((corsError) => {
                                console.error(`❌ [Cover Image] CORS error:`, corsError);
                              });
                          });
                        
                        // If image fails to load, show placeholder
                        imgElement.style.display = 'none';
                        const box = imgElement.parentElement;
                        if (box && !box.querySelector('.placeholder')) {
                          const placeholder = document.createElement('div');
                          placeholder.className = 'placeholder';
                          placeholder.style.cssText = 'padding: 40px; text-align: center; color: #999; background: #f5f5f5; border-radius: 10px;';
                          placeholder.textContent = 'No thumbnail';
                          box.appendChild(placeholder);
                        }
                      }}
                      />
                    </>
                  ) : (
                    <Box
                      sx={{
                        borderRadius: 10,
                        border: '1.5px solid #e0e0e0',
                        background: '#f5f5f5',
                        marginBottom: 6,
                        width: '100%',
                        height: '156px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#999'
                      }}
                    >
                      <Typography variant="body2">No thumbnail</Typography>
                    </Box>
                  )}
                  <Box sx={{ px: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                      {file.fileName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {file.frameCount} frames
                    </Typography>
                  </Box>
                </Box>
              );
            }
            
            // Render frame thumbnail (file view)
            if (!item.frame || !item.thumb) return null;
            const { frame, thumb, index } = item;
            // Collect all tags for display (excluding namingTags - they are only used for search)
            const allTags = [
              ...(frame.frameTags || []),
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
                  src={thumb.thumbnail || thumb.image}
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
                  onClick={() => {
                    // Find the index in frameThumbsForModal
                    const frameIndex = frameThumbsForModal.findIndex((item: any) => item.index === originalIndex);
                    if (frameIndex !== -1) {
                      handleOpenModal(frameIndex);
                    }
                  }}
                  onLoad={(e) => {
                    const isThumbnail = thumb.thumbnail && thumb.thumbnail !== thumb.image;
                    if (isThumbnail) {
                      console.log(`✅ Thumbnail loaded for: ${thumb.label}`);
                    }
                    // Keep thumbnails only - full image loads only on click (in modal)
                  }}
                />
                <IconButton
                  onClick={() => toggleFavorite(thumb.thumbName)}
                  color="error"
                  sx={{ position: 'absolute', top: 8, right: 8, background: '#fff8', zIndex: 1 }}
                  aria-label="Add to favorites"
                >
                  {favorites.includes(thumb.thumbName) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                </IconButton>
                
                {/* Frame name and file/page */}
                <Box sx={{ px: 0.5, mt: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {thumb.label}
                  </Typography>
                  {(thumb as any).filePageSubtitle && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {(thumb as any).filePageSubtitle}
                    </Typography>
                  )}
                </Box>
                
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
          </Box>
        ) : (
        <Masonry
          breakpointCols={{ default: 3, 1200: 3, 900: 2, 600: 1 }}
          className="masonry-grid"
          columnClassName="masonry-grid_column"
          style={{ display: 'flex', gap: 16 }}
        >
          {pagedThumbs.map((item: any, idx: number) => {
            if (item.isFile && item.file) {
              const { file, thumb } = item;
              return (
                <Box key={thumb.thumbName + idx} sx={{ mb: 2, textAlign: 'center', cursor: 'pointer', width: 260, position: 'relative' }} onClick={() => loadFileFrames(file)}>
                  {thumb.image ? (
                    <img src={thumb.image} alt={thumb.label} loading="lazy" style={{ borderRadius: 10, border: '1.5px solid #e0e0e0', background: '#fff', marginBottom: 6, width: '100%', height: 156, display: 'block', objectFit: 'cover' }} onError={(e) => { const el = e.target as HTMLImageElement; el.style.display = 'none'; const box = el.parentElement; if (box && !box.querySelector('.placeholder')) { const p = document.createElement('div'); p.className = 'placeholder'; p.style.cssText = 'padding:40px;text-align:center;color:#999;background:#f5f5f5;border-radius:10px;'; p.textContent = 'No thumbnail'; box.appendChild(p); } }} />
                  ) : (
                    <Box sx={{ borderRadius: 10, border: '1.5px solid #e0e0e0', background: '#f5f5f5', marginBottom: 6, width: '100%', height: 156, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}><Typography variant="body2">No thumbnail</Typography></Box>
                  )}
                  <Box sx={{ px: 0.5 }}><Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>{file.fileName}</Typography><Typography variant="caption" color="text.secondary">{file.frameCount} frames</Typography></Box>
                </Box>
              );
            }
            if (!item.frame || !item.thumb) return null;
            const { frame, thumb, index } = item;
            const allTagsFrame = [...(frame.frameTags || []), ...(frame.sizeTags || []), ...(frame.customTags || [])].filter(Boolean);
            const originalIndexFrame = index;
            return (
              <Box key={thumb.thumbName + idx} sx={{ mb: 2, textAlign: 'center', cursor: 'pointer', width: 260, position: 'relative' }}>
                <img src={thumb.thumbnail || thumb.image} alt={thumb.label} loading="lazy" style={{ borderRadius: 10, border: (modalIndex === originalIndexFrame) ? '3px solid #667eea' : '1.5px solid #e0e0e0', background: '#fff', marginBottom: 6, width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }} onClick={() => { const fi = frameThumbsForModal.findIndex((it: any) => it.index === originalIndexFrame); if (fi !== -1) handleOpenModal(fi); }} />
                <IconButton onClick={() => toggleFavorite(thumb.thumbName)} color="error" sx={{ position: 'absolute', top: 8, right: 8, background: '#fff8', zIndex: 1 }} aria-label="Add to favorites">{favorites.includes(thumb.thumbName) ? <FavoriteIcon /> : <FavoriteBorderIcon />}</IconButton>
                <Box sx={{ px: 0.5, mt: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{thumb.label}</Typography>
                  {(thumb as any).filePageSubtitle && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{(thumb as any).filePageSubtitle}</Typography>
                  )}
                </Box>
                {allTagsFrame.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'flex-start', mt: 1, px: 0.5 }}>
                    {allTagsFrame.map((tag: string, tagIdx: number) => (
                      <Box key={tagIdx} sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: '16px', bgcolor: '#f5f5f5', border: 'none', fontSize: '0.75rem', fontWeight: 400, color: '#000', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{tag}</Box>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}
        </Masonry>
        )}
        
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
          {modalThumb && !modalThumb.isFile && 'frame' in modalThumb && modalThumb.frame && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <img
                  src={modalThumb.thumb.image}
                  alt={modalThumb.thumb.label}
                  style={{ maxWidth: '100%', height: 'auto', borderRadius: 8, boxShadow: '0 4px 24px #0002' }}
                  loading="eager"
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
            {modalIndex !== null ? `${modalIndex + 1} / ${frameThumbsForModal.length}` : ''}
          </Typography>
          <IconButton
            onClick={() => setModalIndex((i) => (i !== null && i < frameThumbsForModal.length - 1 ? i + 1 : i))}
            disabled={modalIndex === null || modalIndex === frameThumbsForModal.length - 1}
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
      <Dialog open={shareDialogOpen} onClose={() => { setShareDialogOpen(false); setSelectedShareType(null); }} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <ShareIcon />
              Share Gallery
            </Box>
            <IconButton onClick={() => { setShareDialogOpen(false); setSelectedShareType(null); }} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Create new share */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              Create Share Link
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
              <Button
                variant={selectedShareType === 'all_indices' ? 'contained' : 'outlined'}
                onClick={() => setSelectedShareType('all_indices')}
                disabled={creatingShare}
                fullWidth
              >
                Share All Indices
              </Button>
              <Button
                variant={selectedShareType === 'search_results' ? 'contained' : 'outlined'}
                onClick={() => setSelectedShareType('search_results')}
                disabled={creatingShare}
                fullWidth
              >
                Share Current Search Results
              </Button>
            </Box>
            {selectedShareType && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1, color: '#666' }}>
                  {selectedShareType === 'all_indices' 
                    ? 'Share link will allow viewing all your indices with search and filters enabled.'
                    : 'Share link will show only the current filtered/search results. Viewers cannot search or filter.'}
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => handleCreateShare(selectedShareType)}
                  disabled={creatingShare}
                  fullWidth
                >
                  {creatingShare ? 'Creating...' : 'Create Share Link'}
                </Button>
              </Box>
            )}

            {/* Existing shares */}
            <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
              Existing Share Links
            </Typography>
            {sharedViews.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No share links created yet.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {sharedViews.map((view) => (
                  <Box
                    key={view.id}
                    sx={{
                      p: 2,
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                      {editingName === view.id ? (
                        <TextField
                          autoFocus
                          size="small"
                          value={editingNameValue}
                          onChange={(e) => setEditingNameValue(e.target.value)}
                          placeholder="Enter share name..."
                          fullWidth
                          sx={{ flex: 1 }}
                        />
                      ) : (
                        <Typography variant="body1" fontWeight={600} sx={{ flex: 1 }}>
                          {view.share_name || (view.share_type === 'all_indices' ? 'All Indices' : 'Search Results')}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        {editingName === view.id ? (
                          <>
                            <IconButton
                              size="small"
                              onClick={async () => {
                                const user = getCurrentUser();
                                if (!user || !user.api_key) return;
                                const response = await fetch('/api/user/share', {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${user.api_key}`
                                  },
                                  body: JSON.stringify({ id: view.id, shareName: editingNameValue })
                                });
                                if (response.ok) {
                                  await loadSharedViews();
                                  setEditingName(null);
                                  setEditingNameValue('');
                                }
                              }}
                              color="primary"
                            >
                              <SaveIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingName(null);
                                setEditingNameValue('');
                              }}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </>
                        ) : (
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingName(view.id);
                              setEditingNameValue(view.share_name || '');
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}
                        <Chip
                          label={view.enabled ? 'Active' : 'Disabled'}
                          color={view.enabled ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                    </Box>
                    {!editingName && view.share_type && (
                      <Typography variant="caption" color="text.secondary">
                        {view.share_type === 'all_indices' ? 'All Indices' : 'Search Results'}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        fullWidth
                        value={view.shareUrl}
                        InputProps={{
                          readOnly: true,
                          startAdornment: <LinkIcon sx={{ mr: 1, color: '#666' }} />
                        }}
                        variant="outlined"
                        size="small"
                      />
                      <Button
                        variant="outlined"
                        onClick={() => {
                          navigator.clipboard.writeText(view.shareUrl);
                          setShareCopied(view.id);
                          setTimeout(() => setShareCopied(null), 2000);
                        }}
                        startIcon={shareCopied === view.id ? <CheckIcon /> : <ContentCopyIcon />}
                      >
                        {shareCopied === view.id ? 'Copied!' : 'Copy'}
                      </Button>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleDisableShare(view.id)}
                        disabled={!view.enabled}
                      >
                        Disable
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={() => handleDeleteShare(view.id)}
                      >
                        Delete
                      </Button>
                      {!view.enabled && (
                        <Button
                          variant="outlined"
                          size="small"
                          color="success"
                          onClick={async () => {
                            const user = getCurrentUser();
                            if (!user || !user.api_key) return;
                            const response = await fetch('/api/user/share', {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${user.api_key}`
                              },
                              body: JSON.stringify({ id: view.id, enabled: true })
                            });
                            if (response.ok) await loadSharedViews();
                          }}
                        >
                          Enable
                        </Button>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
} 
