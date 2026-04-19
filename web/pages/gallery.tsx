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
import {
  PUBLIC_SITE_BACKGROUND_SX,
  PUBLIC_SITE_PRIMARY_BUTTON_SX,
  PUBLIC_SITE_SECONDARY_BUTTON_SX,
  PUBLIC_SITE_SURFACE_SX,
} from '../lib/public-site-styles';
// import Header from '../components/Header';

const DEBUG_GALLERY = false;
const galleryDebug = (...args: any[]) => {
  if (DEBUG_GALLERY) console.log(...args);
};
const galleryWarn = (...args: any[]) => {
  if (DEBUG_GALLERY) console.warn(...args);
};

const GALLERY_SURFACE_SX = {
  ...PUBLIC_SITE_SURFACE_SX,
  borderRadius: 3,
  boxShadow: '0 12px 32px rgba(15,23,42,0.05)',
};

const GALLERY_CARD_SX = {
  borderRadius: 4,
  border: '1px solid #dbe3f0',
  background: '#ffffff',
  overflow: 'hidden',
  boxShadow: '0 16px 40px rgba(15,23,42,0.07)',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 22px 48px rgba(15,23,42,0.1)',
    borderColor: '#c7d7fe',
  },
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

type FilePageInfo = {
  id: string;
  name: string;
  frameCount: number;
  sortOrder?: number;
  isIndexed?: boolean;
};

type DisplayFilePage = FilePageInfo & {
  isFolder?: boolean;
  childPageIds?: string[];
  childPages?: FilePageInfo[];
  displayFrameCount?: number;
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

const FOLDER_PAGE_ICON_PATTERN = /^[\s]*([📁🗂️🗂📂])\s*/u;

function isFolderLikePageName(name: string): boolean {
  return FOLDER_PAGE_ICON_PATTERN.test(String(name || ''));
}

function stripFolderPrefix(name: string): string {
  return String(name || '').replace(FOLDER_PAGE_ICON_PATTERN, '').trim() || String(name || '');
}

function buildDisplayFilePages(pages: FilePageInfo[]): DisplayFilePage[] {
  const sortedPages = [...pages].sort((a, b) => {
    const aOrder = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
    const bOrder = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });

  const displayPages: DisplayFilePage[] = [];
  let activeFolder: DisplayFilePage | null = null;

  sortedPages.forEach((page) => {
    if (isFolderLikePageName(page.name)) {
      const folderPage: DisplayFilePage = {
        ...page,
        name: stripFolderPrefix(page.name),
        isFolder: true,
        isIndexed: true,
        childPageIds: [],
        childPages: [],
        displayFrameCount: 0,
      };
      displayPages.push(folderPage);
      activeFolder = folderPage;
      return;
    }

    if (activeFolder) {
      activeFolder.childPageIds = [...(activeFolder.childPageIds || []), page.id];
      activeFolder.childPages = [...(activeFolder.childPages || []), page];
      activeFolder.displayFrameCount = (activeFolder.displayFrameCount || 0) + (typeof page.frameCount === 'number' ? page.frameCount : 0);
    }

    displayPages.push({
      ...page,
      displayFrameCount: typeof page.frameCount === 'number' ? page.frameCount : 0,
    });
  });

  return displayPages;
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
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
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
  const [selectedFile, setSelectedFile] = useState<{ id: string; fileName: string; fileKey?: string | null; _chunks?: any[] } | null>(null);
  const [filePages, setFilePages] = useState<FilePageInfo[]>([]);
  const [selectedFilePageId, setSelectedFilePageId] = useState<string | null>(null);
  const [selectedFilePageFrameCount, setSelectedFilePageFrameCount] = useState(0);
  const [filePageLoading, setFilePageLoading] = useState(false);
  const [fileSearchLoading, setFileSearchLoading] = useState(false);
  const [fileModeSearchActive, setFileModeSearchActive] = useState(false);
  const [fileThumbnails, setFileThumbnails] = useState<Array<{ id: string; fileName: string; thumbnail?: string; frameCount: number }>>([]);
  const [allFramesData, setAllFramesData] = useState<any[]>([]); // Store all frames for allFrames view
  const [guestPlan, setGuestPlan] = useState<string | null>(null); // Plan from get-indices when guest (e.g. 'guest')
  const [lobbyFramesLoading, setLobbyFramesLoading] = useState(false);
  const [authFromUrlApplied, setAuthFromUrlApplied] = useState(0); // Incremented when apiKey/viewToken applied from URL; triggers reload
  const [visibilityRefreshTrigger, setVisibilityRefreshTrigger] = useState(0); // Incremented when tab becomes visible; triggers reload (e.g. after indexing from plugin)
  const [dismissedSuccessFileKey, setDismissedSuccessFileKey] = useState('');
  const [hasStoredUser, setHasStoredUser] = useState(false);
  const displayFilePages = useMemo(() => buildDisplayFilePages(filePages), [filePages]);

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
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
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
          id: user.id || '',
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
        if (viewMode === 'file' && selectedFile) {
          return;
        }
        setLoading(true);
        setError('');
        let user = null;
        let anonId: string | null = null;
        if (typeof window !== 'undefined') {
          const userStr = localStorage.getItem('figma_web_user');
          if (userStr) user = JSON.parse(userStr);
          setHasStoredUser(!!user?.email);
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
            const data = await parseJsonResponse(response, 'Failed to load guest indices');
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
        const userIdParam = user?.id ? `&userId=${encodeURIComponent(user.id)}` : '';
        const response = await fetch(`/api/get-indices?userEmail=${encodeURIComponent(user.email)}${userIdParam}`);
        const data = await parseJsonResponse(response, 'Failed to load gallery indices');
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
  }, [router.isReady, router.query.index, router.query.anonId, viewMode, selectedFile, authFromUrlApplied, visibilityRefreshTrigger]);

  // When tab becomes visible (e.g. user returns after indexing from plugin), refetch indices
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handler = () => {
      if (!document.hidden) setVisibilityRefreshTrigger((n) => n + 1);
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  useEffect(() => {
    if (!loading) {
      setHasLoadedOnce(true);
    }
  }, [loading]);

  const getFileIndexIds = (fileInfo: { id: string; _chunks?: any[] }) =>
    fileInfo._chunks?.length ? fileInfo._chunks.map((chunk: any) => chunk.id) : [fileInfo.id];

  const loadSelectedFilePage = async (
    fileInfo: { id: string; fileName: string; _chunks?: any[] },
    pageId: string,
    pageNumber: number,
    pageSizeValue: number,
    pageIds?: string[]
  ) => {
    try {
      setFilePageLoading(true);
      setFrames([]);
      setFileModeSearchActive(false);
      const offset = Math.max(0, (pageNumber - 1) * pageSizeValue);
      const requestedPageIds = Array.isArray(pageIds) && pageIds.length > 0 ? pageIds : [pageId];
      const pageQuery = requestedPageIds.length > 1
        ? `pageIds=${encodeURIComponent(requestedPageIds.join(','))}`
        : `pageId=${encodeURIComponent(pageId)}`;
      const response = await fetch(
        `/api/file-index-view?mode=page&indexIds=${encodeURIComponent(getFileIndexIds(fileInfo).join(','))}&${pageQuery}&offset=${offset}&limit=${pageSizeValue}`
      );
      const data = await parseJsonResponse(response, 'Failed to load page frames');
      if (!data?.success) {
        setError(data?.error || 'Failed to load page frames');
        setFrames([]);
        return;
      }
      const pageFrames = Array.isArray(data?.data?.frames) ? data.data.frames.map((frame: any) => ({
        ...frame,
        _fileId: fileInfo.id,
        _fileName: fileInfo.fileName,
      })) : [];
      setSelectedFilePageId(pageId);
      setSelectedFilePageFrameCount(
        typeof data?.data?.totalFrames === 'number'
          ? data.data.totalFrames
          : pageFrames.length
      );
      setFrames(pageFrames);
    } catch (err: any) {
      console.error('Error loading page frames:', err);
      setError(err.message || 'An error occurred while loading page frames');
      setFrames([]);
    } finally {
      setFilePageLoading(false);
    }
  };

  const searchSelectedFile = async (fileInfo: { id: string; fileName: string; _chunks?: any[] }, query: string) => {
    try {
      setError('');
      setFileSearchLoading(true);
      const response = await fetch(`/api/file-index-view?mode=search&indexIds=${encodeURIComponent(getFileIndexIds(fileInfo).join(','))}&q=${encodeURIComponent(query)}`);
      const data = await parseJsonResponse(response, 'Failed to search file');
      if (!data?.success) {
        setError(data?.error || 'Failed to search file');
        return;
      }
      const searchFrames = Array.isArray(data?.data?.frames) ? data.data.frames.map((frame: any) => ({
        ...frame,
        _fileId: fileInfo.id,
        _fileName: fileInfo.fileName,
      })) : [];
      setFileModeSearchActive(true);
      setFrames(searchFrames);
    } catch (err: any) {
      console.error('Error searching file frames:', err);
      setError(err.message || 'An error occurred while searching file frames');
    } finally {
      setFileSearchLoading(false);
    }
  };

  // Load frames for specific file using lightweight page summary first
  const loadFileFrames = async (fileInfo: { id: string; fileName: string; _chunks?: any[]; fileKey?: string | null }) => {
    try {
      setLoading(true);
      setError('');
      setViewMode('file');
      setSelectedFile(fileInfo);
      setSelectedIndex(fileInfo.id);
      setFrames([]);
      setFilePages([]);
      setSelectedFilePageId(null);
      setSelectedFilePageFrameCount(0);
      setFilePageLoading(false);
      setFileModeSearchActive(false);

      const user = getCurrentUser();
      const summaryUrl = `/api/file-index-view?mode=summary&indexIds=${encodeURIComponent(getFileIndexIds(fileInfo).join(','))}${fileInfo.fileKey ? `&fileKey=${encodeURIComponent(fileInfo.fileKey)}` : ''}`;
      const response = await fetch(summaryUrl, {
        headers: user?.api_key ? { Authorization: `Bearer ${user.api_key}` } : undefined,
      });
      const data = await parseJsonResponse(response, 'Failed to load file summary');
      if (!data?.success) {
        setError(data?.error || 'Failed to load file summary');
        setFrames([]);
        return;
      }

      const pagesSummary = Array.isArray(data?.data?.pages) ? data.data.pages : [];
      setFilePages(pagesSummary);

      if (pagesSummary.length === 0) {
        setFrames([]);
        return;
      }

      const firstDisplayPage = buildDisplayFilePages(pagesSummary).find((pageInfo: DisplayFilePage) =>
        pageInfo.isFolder ? (pageInfo.childPageIds || []).length > 0 : pageInfo.isIndexed !== false
      ) || null;
      setPage(1);
      setSelectedFilePageId(firstDisplayPage ? String(firstDisplayPage.id) : null);
      setSelectedFilePageFrameCount(
        firstDisplayPage && typeof (firstDisplayPage.displayFrameCount ?? firstDisplayPage.frameCount) === 'number'
          ? Number(firstDisplayPage.displayFrameCount ?? firstDisplayPage.frameCount)
          : 0
      );
    } catch (err: any) {
      console.error('Error loading file summary:', err);
      setError(err.message || 'An error occurred while loading file summary');
      setFrames([]);
      setFilePages([]);
    } finally {
      setLoading(false);
    }
  };

  const activateFilePage = (pageInfo: DisplayFilePage) => {
    if (filePageLoading) return;
    const isFolder = !!pageInfo.isFolder;
    const isIndexedPage = isFolder ? (pageInfo.childPageIds || []).length > 0 : pageInfo.isIndexed !== false;
    if (!isIndexedPage) return;
    setSearch('');
    setPage(1);
    setFileModeSearchActive(false);
    setSelectedFilePageId(pageInfo.id);
    setSelectedFilePageFrameCount(
      typeof pageInfo.displayFrameCount === 'number'
        ? pageInfo.displayFrameCount
        : (typeof pageInfo.frameCount === 'number' ? pageInfo.frameCount : 0)
    );
  };

  const clearSuccessFileQuery = () => {
    if (!router.isReady || typeof window === 'undefined') return;
    const nextQuery = { ...router.query } as Record<string, any>;
    delete nextQuery.fileKey;
    delete nextQuery._t;
    router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
  };

  const dismissFirstIndexSuccess = () => {
    const rawFileKey = router.query.fileKey;
    const queryFileKey = typeof rawFileKey === 'string' ? rawFileKey.trim() : Array.isArray(rawFileKey) ? rawFileKey[0]?.trim() || '' : '';
    if (queryFileKey) setDismissedSuccessFileKey(queryFileKey);
    clearSuccessFileQuery();
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

  useEffect(() => {
    if (viewMode !== 'file' || !selectedFile) return;

    const trimmedQuery = search.trim();
    const timeoutId = window.setTimeout(() => {
      if (trimmedQuery) {
        searchSelectedFile(selectedFile, trimmedQuery);
      } else if (selectedFilePageId) {
        const selectedDisplayPage = displayFilePages.find((pageInfo) => pageInfo.id === selectedFilePageId) || null;
        const requestedPageIds = selectedDisplayPage?.isFolder ? (selectedDisplayPage.childPageIds || []) : undefined;
        loadSelectedFilePage(selectedFile, selectedFilePageId, page, pageSize, requestedPageIds);
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [search, viewMode, selectedFile, selectedFilePageId, fileModeSearchActive, page, pageSize, displayFilePages]);
  
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

  const buildShareName = (shareType: 'all_indices' | 'search_results', searchParams?: any) => {
    if (shareType === 'all_indices') {
      return 'Full gallery';
    }

    const parts: string[] = [];
    const textSearch = typeof searchParams?.textSearch === 'string' ? searchParams.textSearch.trim() : '';
    const sizeTags = Array.isArray(searchParams?.sizeTags) ? searchParams.sizeTags : [];
    const customTags = Array.isArray(searchParams?.customTags) ? searchParams.customTags : [];

    if (textSearch) {
      parts.push(`Search: ${textSearch}`);
    }
    if (sizeTags.length > 0) {
      parts.push(`Size: ${sizeTags.slice(0, 2).join(', ')}`);
    }
    if (customTags.length > 0) {
      parts.push(`Tags: ${customTags.slice(0, 2).join(', ')}`);
    }

    if (parts.length === 0) {
      return 'Filtered results';
    }

    return parts.join(' | ').slice(0, 120);
  };

  const hasSharableResultContext =
    search.trim().length > 0 ||
    selectedSizeTags.length > 0 ||
    selectedCustomTags.length > 0;

  const currentResultsShareName = buildShareName('search_results', {
    textSearch: search,
    sizeTags: selectedSizeTags,
    customTags: selectedCustomTags,
  });

  useEffect(() => {
    if (!shareDialogOpen) return;
    if (selectedShareType === 'search_results' && !hasSharableResultContext) {
      setSelectedShareType('all_indices');
    }
  }, [hasSharableResultContext, selectedShareType, shareDialogOpen]);

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
          searchParams: shareType === 'search_results' ? searchParams : undefined,
          shareName: buildShareName(shareType, searchParams)
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
          frameCount,
          uploadedAt: file.uploaded_at,
          projectId: file.project_id,
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
      const queryTokens = q.split(/\s+/).filter(Boolean);
      const matchesLooseQuery = (values: unknown[]) => {
        const haystack = values
          .filter((value) => typeof value === 'string' && String(value).trim())
          .map((value: any) => String(value).toLowerCase())
          .join(' ');
        if (!haystack) return false;
        if (queryTokens.length <= 1) return haystack.includes(q);
        const regex = new RegExp(queryTokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*'), 'i');
        return regex.test(haystack);
      };
      const matchingFrames = allFramesGalleryThumbs.filter(({ frame, thumb }) => {
        return matchesLooseQuery([
          frame.name,
          thumb.label,
          (frame as any).pageName,
          (frame as any).textContent,
          thumb.texts,
          ...(Array.isArray((frame as any).searchTokens) ? (frame as any).searchTokens : []),
          ...(Array.isArray(frame.customTags) ? frame.customTags : []),
          ...(Array.isArray(frame.frameTags) ? frame.frameTags : []),
        ]);
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
    const queryTokens = q.split(/\s+/).filter(Boolean);
    const sourceThumbs = viewMode === 'lobby' ? allFramesGalleryThumbs : allGalleryThumbs;
    const matchesLooseQuery = (values: unknown[]) => {
      const haystack = values
        .filter((value) => typeof value === 'string' && String(value).trim())
        .map((value: any) => String(value).toLowerCase())
        .join(' ');
      if (!haystack) return false;
      if (queryTokens.length <= 1) return haystack.includes(q);
      const regex = new RegExp(queryTokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*'), 'i');
      return regex.test(haystack);
    };
    return sourceThumbs.filter(({ frame, thumb }) => {
      return matchesLooseQuery([
        frame.name,
        thumb.label,
        (frame as any).pageName,
        (frame as any).textContent,
        thumb.texts,
        ...(Array.isArray((frame as any).searchTokens) ? (frame as any).searchTokens : []),
        ...(Array.isArray(frame.customTags) ? frame.customTags : []),
        ...(Array.isArray(frame.frameTags) ? frame.frameTags : []),
      ]);
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
  const totalPages = Math.max(
    1,
    Math.ceil(
      viewMode === 'file' && !fileModeSearchActive
        ? selectedFilePageFrameCount / pageSize
        : visibleThumbs.length / pageSize
    )
  );

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
    if (viewMode === 'file' && !fileModeSearchActive) {
      return visibleThumbs;
    }
    const start = (page - 1) * pageSize;
    return visibleThumbs.slice(start, start + pageSize);
  }, [visibleThumbs, page, pageSize, viewMode, fileModeSearchActive]);

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
            onClick={() => router.push('/gallery')}
          >
            Back to Gallery
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

  const gallerySectionTitle =
    viewMode === 'file'
      ? (selectedFile?.fileName || 'File View')
      : viewMode === 'allFrames'
        ? 'All Frames'
        : 'Gallery';

  const gallerySectionSubtitle =
    viewMode === 'file'
      ? (fileModeSearchActive
          ? `Searching across ${filePages.length} pages in this file`
          : `${displayFilePages.length || 0} items available in this file`)
      : viewMode === 'allFrames'
        ? `${allGalleryThumbs.length.toLocaleString()} frames across your indexed files`
        : `${indexFiles.length.toLocaleString()} indexed files ready to browse`;

  const searchPlaceholder =
    viewMode === 'file'
      ? 'Search this file'
      : viewMode === 'allFrames'
        ? 'Search all frames'
        : 'Search across your gallery';

  const resultsSummary =
    viewMode === 'lobby'
      ? `${visibleThumbs.length.toLocaleString()} files shown`
      : viewMode === 'allFrames'
        ? `${visibleThumbs.length.toLocaleString()} frames shown`
        : fileModeSearchActive
          ? `${visibleThumbs.length.toLocaleString()} search results`
          : `${selectedFilePageFrameCount.toLocaleString()} frames in selected item`;

  const selectedPageInfo = displayFilePages.find((pageInfo) => pageInfo.id === selectedFilePageId) || null;
  const activeAdvancedFiltersCount = selectedSizeTags.length + selectedCustomTags.length;
  const rawSuccessFileKey = router.query.fileKey;
  const successFileKey =
    typeof rawSuccessFileKey === 'string'
      ? rawSuccessFileKey.trim()
      : Array.isArray(rawSuccessFileKey)
        ? (rawSuccessFileKey[0] || '').trim()
        : '';
  const firstIndexedFile = successFileKey
    ? indexFiles.find((file: any) => {
        const figmaFileKey = typeof file?.figma_file_key === 'string' ? file.figma_file_key.trim() : '';
        const stableFileKey = getStableLogicalFileId(file);
        return figmaFileKey === successFileKey || stableFileKey === successFileKey;
      }) || null
    : null;
  const showFirstUseEmptyState =
    !loading &&
    !error &&
    viewMode === 'lobby' &&
    indexFiles.length === 0 &&
    allGalleryThumbs.length === 0 &&
    !search.trim();
  const showFirstIndexSuccess =
    !showFirstUseEmptyState &&
    !loading &&
    !error &&
    viewMode === 'lobby' &&
    !!successFileKey &&
    !!firstIndexedFile &&
    dismissedSuccessFileKey !== successFileKey;
  const showGenericNoResults =
    !showFirstUseEmptyState &&
    !showFirstIndexSuccess &&
    !loading &&
    visibleThumbs.length === 0;

  return (
    <Box sx={{ direction: 'ltr', ...PUBLIC_SITE_BACKGROUND_SX }}>
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
          bgcolor: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(14px)',
          borderRight: '1px solid #dbe3f0',
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
          <Box sx={{ ...GALLERY_SURFACE_SX, mb: 3, p: 2, maxHeight: 400, overflowY: 'auto' }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#111827' }}>
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
                    bgcolor: '#111827',
                    color: 'white',
                    '&:hover': {
                      bgcolor: '#1f2937',
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
                    bgcolor: '#111827',
                    color: 'white',
                    '&:hover': {
                      bgcolor: '#1f2937',
                    }
                  }
                }}
              >
                <GridViewIcon sx={{ mr: 1, fontSize: 18 }} />
                <ListItemText primary="All Frames" primaryTypographyProps={{ variant: 'body2' }} />
              </ListItemButton>
              
              {/* Files with page tree for the selected file */}
              {indexFiles.map((file) => {
                const isSelectedFile = selectedIndex === file.id || (selectedFile?.id === file.id && viewMode === 'file');
                return (
                  <Box key={file.id}>
                    <ListItemButton
                      selected={isSelectedFile}
                      onClick={() => {
                        setSelectedIndex(file.id);
                        loadFileFrames({ id: file.id, fileName: file.file_name || `Index ${file.id}`, _chunks: file._chunks, fileKey: file.figma_file_key || null });
                      }}
                      sx={{
                        borderRadius: 1,
                        mb: 0.5,
                        pl: 4,
                        '&.Mui-selected': {
                          bgcolor: '#111827',
                          color: 'white',
                          '&:hover': {
                            bgcolor: '#1f2937',
                          }
                        }
                      }}
                    >
                      <FolderOpenIcon sx={{ mr: 1, fontSize: 18 }} />
                      <ListItemText
                        primary={file.file_name || `Index ${file.id}`}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: isSelectedFile ? 700 : 500 }}
                      />
                      {isSelectedFile && filePages.length > 0 && <ExpandMoreIcon sx={{ fontSize: 18 }} />}
                    </ListItemButton>

                    {isSelectedFile && displayFilePages.length > 0 && (
                      <List
                        dense
                        disablePadding
                        sx={{
                          mt: 0.75,
                          mb: 1.25,
                          ml: 3.5,
                          pl: 2,
                          pr: 0.5,
                          borderLeft: '1px solid #e5e7eb',
                        }}
                      >
                        {displayFilePages.map((pageInfo) => {
                          const isSelectedPage = !fileModeSearchActive && selectedFilePageId === pageInfo.id;
                          const isFolderPage = !!pageInfo.isFolder;
                          const isIndexedPage = isFolderPage ? (pageInfo.childPageIds || []).length > 0 : pageInfo.isIndexed !== false;
                          return (
                            <ListItemButton
                              key={pageInfo.id}
                              selected={isSelectedPage}
                              onClick={() => {
                                activateFilePage(pageInfo);
                              }}
                              sx={{
                                borderRadius: 1,
                                py: 0.7,
                                px: 1.25,
                                mb: 0.45,
                                ml: isFolderPage ? 0 : 1.25,
                                alignItems: 'flex-start',
                                '&.Mui-selected': {
                                  bgcolor: '#eef4ff',
                                  color: '#3538cd',
                                  '&:hover': {
                                    bgcolor: '#e0ecff',
                                  }
                                },
                                '&:hover': {
                                  bgcolor: '#f8fafc',
                                },
                              }}
                            >
                              <Box sx={{ pt: 0.1, mr: 1, color: isFolderPage ? '#175cd3' : (isIndexedPage ? '#667085' : '#98a2b3') }}>
                                {isFolderPage ? <FolderOpenIcon sx={{ fontSize: 15 }} /> : null}
                              </Box>
                              <ListItemText
                                primary={pageInfo.name}
                                secondary={
                                  isFolderPage
                                    ? `${(pageInfo.displayFrameCount || 0).toLocaleString()} frames across ${(pageInfo.childPageIds || []).length} pages`
                                    : isIndexedPage
                                      ? `${(pageInfo.displayFrameCount || pageInfo.frameCount || 0).toLocaleString()} frames`
                                      : 'Not indexed'
                                }
                                primaryTypographyProps={{
                                  variant: 'body2',
                                  fontWeight: isSelectedPage ? 700 : 500,
                                  sx: { lineHeight: 1.25, fontSize: '0.82rem' }
                                }}
                                secondaryTypographyProps={{
                                  variant: 'caption',
                                  sx: {
                                    lineHeight: 1.25,
                                    color: isFolderPage ? '#175cd3' : (isIndexedPage ? 'inherit' : '#98a2b3'),
                                    fontSize: '0.72rem'
                                  }
                                }}
                              />
                            </ListItemButton>
                          );
                        })}
                      </List>
                    )}
                  </Box>
                );
              })}
            </List>
          </Box>

          {/* Results Count - SECOND */}
          <Box sx={{ ...GALLERY_SURFACE_SX, mb: 3, p: 2 }}>
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
          <Box sx={{ ...GALLERY_SURFACE_SX, mb: 3, p: 2 }}>
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
          <Box sx={{ ...GALLERY_SURFACE_SX, mb: 3, p: 2 }}>
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

          <Box sx={{ ...GALLERY_SURFACE_SX, mb: 3, p: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                  More filters
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Refine by size and custom tags when needed
                </Typography>
              </Box>
              <Button
                size="small"
                onClick={() => setMoreFiltersOpen((prev) => !prev)}
                endIcon={moreFiltersOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ textTransform: 'none' }}
              >
                {activeAdvancedFiltersCount > 0 ? `${activeAdvancedFiltersCount} active` : 'Show'}
              </Button>
            </Box>

            <Collapse in={moreFiltersOpen}>
              <Stack spacing={2} sx={{ mt: 1.5 }}>
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
              </Stack>
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
          backgroundColor: 'transparent',
          ml: filterDrawerOpen ? '300px' : 0,
          transition: 'margin-left 0.3s ease',
          width: filterDrawerOpen ? 'calc(100% - 300px)' : '100%'
        }}
      >
        {/* Top Header with Logo and User Menu */}
        <Box sx={{ px: 4, pt: 2, pb: 1.5 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton
                onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
                sx={{
                  ...(filterDrawerOpen ? PUBLIC_SITE_PRIMARY_BUTTON_SX : PUBLIC_SITE_SECONDARY_BUTTON_SX),
                  bgcolor: filterDrawerOpen ? '#111827' : '#fff',
                  color: filterDrawerOpen ? '#fff' : '#111827',
                  boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
                  '&:hover': {
                    bgcolor: filterDrawerOpen ? '#1f2937' : 'rgba(17,24,39,0.04)',
                  }
                }}
              >
                <FilterListIcon />
              </IconButton>
              <Box>
                <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.04em', lineHeight: 1, color: '#111827' }}>
                  FigDex
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75, flexWrap: 'wrap' }}>
                  <Chip
                    label={viewMode === 'file' ? 'File View' : viewMode === 'allFrames' ? 'All Frames' : 'Gallery'}
                    size="small"
                    sx={{ fontSize: '0.7rem', height: '22px', bgcolor: '#eef4ff', color: '#3538cd', fontWeight: 700 }}
                  />
                  {currentIndexFile === 'guest' && (
                    <Chip 
                      label={(guestPlan || 'guest').charAt(0).toUpperCase() + (guestPlan || 'guest').slice(1)} 
                      size="small"
                      sx={{ fontSize: '0.65rem', height: '20px', bgcolor: '#e3f2fd', color: '#1565c0' }}
                    />
                  )}
                </Stack>
              </Box>
            </Box>
            
            <Box display="flex" alignItems="center" gap={2}>
              <Button
                variant="outlined"
                startIcon={<ShareIcon />}
                onClick={handleShareGallery}
                sx={{
                  ...PUBLIC_SITE_SECONDARY_BUTTON_SX,
                  bgcolor: 'white',
                  display: { xs: 'none', md: 'inline-flex' }
                }}
              >
                Share
              </Button>
              <IconButton
                onClick={handleUserMenuOpen}
                sx={{
                  bgcolor: '#111827',
                  color: '#fff',
                  boxShadow: '0 10px 24px rgba(15,23,42,0.14)',
                  '&:hover': { bgcolor: '#1f2937' }
                }}
              >
                <Avatar sx={{ bgcolor: 'transparent', color: '#fff', width: 32, height: 32 }}>
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
                <Divider />
                <MenuItem onClick={() => { router.push('/account'); handleUserMenuClose(); }}>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Account Settings</ListItemText>
                </MenuItem>
                <MenuItem
                  disabled
                  sx={{
                    opacity: 1,
                    '&.Mui-disabled': {
                      opacity: 1,
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: '#98A2B3' }}>
                    <ApiIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Figma API Integration"
                    primaryTypographyProps={{ sx: { color: '#667085' } }}
                  />
                  <Chip
                    label="Soon"
                    size="small"
                    sx={{
                      height: 22,
                      fontWeight: 700,
                      bgcolor: 'rgba(59,130,246,0.1)',
                      color: '#2563eb',
                    }}
                  />
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

            <Box
              sx={{
              mt: 2,
              px: 2,
              py: 1.5,
              ...GALLERY_SURFACE_SX
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#18212f', lineHeight: 1.2 }}>
              {gallerySectionTitle}
            </Typography>
            <Typography variant="body2" sx={{ color: '#667085', mt: 0.5 }}>
              {gallerySectionSubtitle}
            </Typography>
          </Box>
        </Box>
      
        {/* Search and Filter Bar */}
        <Box sx={{ px: 4, pb: 1.5 }}>
          <Box
            sx={{
              px: 2,
              py: 1.5,
              ...GALLERY_SURFACE_SX
            }}
          >
            <Box display="flex" alignItems="flex-end" gap={2} sx={{ width: '100%', flexWrap: 'nowrap', overflowX: 'auto' }}>
              <Box sx={{ flex: '1 1 260px', minWidth: 180, maxWidth: 720 }}>
                <TextField
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  size="medium"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
                    ),
                    endAdornment: viewMode === 'file' && fileSearchLoading ? (
                      <CircularProgress size={16} />
                    ) : undefined,
                  }}
                />
              </Box>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.25, flexWrap: 'wrap' }}>
              {viewMode === 'file' && selectedFile && (
                <Chip size="small" label={`Gallery / ${selectedFile.fileName}`} variant="outlined" />
              )}
              <Chip size="small" label={resultsSummary} sx={{ bgcolor: '#f8fafc', color: '#475467' }} />
              {search.trim() && (
                <Chip size="small" label={`Searching: ${search}`} sx={{ bgcolor: '#eef5ff', color: '#1d4ed8' }} />
              )}
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ 
        ml: filterDrawerOpen ? '300px' : 0,
        transition: 'margin-left 0.3s ease',
        px: 4
      }}>
        {viewMode === 'file' && selectedFile && filePages.length > 0 && (
          <Box sx={{ ...GALLERY_SURFACE_SX, mb: 3, p: 2.5 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: 'minmax(280px, 360px) 1fr' },
                gap: 3,
                alignItems: 'start'
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                <Box>
                  <Typography variant="overline" sx={{ color: '#667085', letterSpacing: '0.08em', fontWeight: 700 }}>
                    File View
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.15, color: '#111827' }}>
                    {selectedFile.fileName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#667085', mt: 0.5 }}>
                    {fileModeSearchActive
                      ? `Showing search results across ${filePages.length} pages`
                      : `Browse pages inside this file and load only what you need`}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip size="small" label={`${filePages.length} pages`} sx={{ bgcolor: '#f8fafc', color: '#344054', fontWeight: 700 }} />
                  {!fileModeSearchActive && selectedPageInfo && (
                    <Chip
                      size="small"
                      label={`${(selectedPageInfo.displayFrameCount || selectedPageInfo.frameCount || 0).toLocaleString()} frames in ${selectedPageInfo.name}`}
                      sx={{ bgcolor: '#eef4ff', color: '#3538cd', fontWeight: 700 }}
                    />
                  )}
                  {fileModeSearchActive && (
                    <Chip
                      size="small"
                      label={`${visibleThumbs.length.toLocaleString()} search results`}
                      sx={{ bgcolor: '#eff8ff', color: '#175cd3', fontWeight: 700 }}
                    />
                  )}
                </Stack>

                {filePageLoading && !fileModeSearchActive && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="caption" color="text.secondary">
                      Loading page...
                    </Typography>
                  </Box>
                )}
                {fileSearchLoading && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="caption" color="text.secondary">
                      Searching file...
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box
                sx={{
                  borderRadius: 3,
                  border: '1px solid #e4e7ec',
                  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                  p: 2.25,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.75, color: '#111827' }}>
                  Current selection
                </Typography>
                {selectedPageInfo ? (
                  <Stack spacing={1.1}>
                    <Typography sx={{ fontSize: '0.96rem', fontWeight: 700, color: '#101828' }}>
                      {selectedPageInfo.name}
                    </Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: '#667085', lineHeight: 1.5 }}>
                      {selectedPageInfo.isFolder
                        ? `Showing the combined frames from ${(selectedPageInfo.childPageIds || []).length} pages grouped under this folder.`
                        : selectedPageInfo.isIndexed === false
                          ? 'This page exists in Figma but has not been indexed yet.'
                          : 'Showing frames from the selected page.'}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        label={`${(selectedPageInfo.displayFrameCount || selectedPageInfo.frameCount || 0).toLocaleString()} frames`}
                        sx={{ bgcolor: '#eef4ff', color: '#3538cd', fontWeight: 700 }}
                      />
                      {selectedPageInfo.isFolder && (
                        <Chip
                          size="small"
                          icon={<FolderOpenIcon sx={{ fontSize: '0.95rem !important' }} />}
                          label={`${(selectedPageInfo.childPageIds || []).length} child pages`}
                          sx={{ bgcolor: '#eff8ff', color: '#175cd3', fontWeight: 700 }}
                        />
                      )}
                    </Stack>
                  </Stack>
                ) : (
                  <Typography sx={{ fontSize: '0.82rem', color: '#667085' }}>
                    Choose a page from the left sidebar to browse its frames.
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        )}
        {/* Categorized Tags Display (per frame) */}
        <Grid container spacing={4}>
        {/* Main gallery: lobby/file use Grid, allFrames uses Masonry */}
        {viewMode !== 'allFrames' ? (
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
                    cursor: 'pointer',
                    width: 260,
                    position: 'relative',
                    ...GALLERY_CARD_SX,
                  }}
                  onClick={() => loadFileFrames({ ...file, fileKey: file.figma_file_key || null })}
                >
                  {thumb.image ? (
                    <img
                      src={thumb.image}
                      alt={thumb.label}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '156px',
                        display: 'block',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        const imgElement = e.target as HTMLImageElement;
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
                  ) : (
                    <Box
                      sx={{
                        background: '#f5f5f5',
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
                  <Box sx={{ p: 1.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                      <Chip
                        size="small"
                        label="Indexed file"
                        sx={{ bgcolor: '#eef4ff', color: '#3538cd', fontWeight: 700 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {file.uploadedAt ? formatDate(file.uploadedAt) : 'Recently updated'}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        mb: 0.75,
                        minHeight: 40,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {file.fileName}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                      <Chip size="small" label={`${file.frameCount} frames`} variant="outlined" sx={{ fontWeight: 600 }} />
                      {file.projectId && (
                        <Chip size="small" label="Connected" variant="outlined" sx={{ color: '#027a48', borderColor: '#a6f4c5', fontWeight: 700 }} />
                      )}
                    </Stack>
                    <Typography variant="caption" sx={{ color: '#667085', fontWeight: 600 }}>
                      Open file gallery
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
                  cursor: 'pointer',
                  width: 260,
                  position: 'relative',
                  ...GALLERY_CARD_SX,
                  p: 1.25
                }}
              >
                <img
                  src={thumb.thumbnail || thumb.image}
                  alt={thumb.label}
                  loading="lazy"
                  style={{
                    borderRadius: 14,
                    border: (modalIndex === originalIndex) ? '3px solid #111827' : '1.5px solid #dbe3f0',
                    background: '#f8fafc',
                    marginBottom: 8,
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
                />
                <IconButton
                  onClick={() => toggleFavorite(thumb.thumbName)}
                  color="error"
                  sx={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.92)', zIndex: 1 }}
                  aria-label="Add to favorites"
                >
                  {favorites.includes(thumb.thumbName) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                </IconButton>
                
                {/* Frame name and file/page */}
                <Box sx={{ px: 0.5, mt: 0.5, textAlign: 'left' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#111827' }}>
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
                          bgcolor: '#f8fafc',
                          border: '1px solid #e4e7ec',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: '#344054',
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
                <Box
                  key={thumb.thumbName + idx}
                  sx={{
                    cursor: 'pointer',
                    width: 260,
                    position: 'relative',
                    ...GALLERY_CARD_SX,
                  }}
                  onClick={() => loadFileFrames({ ...file, fileKey: file.figma_file_key || null })}
                >
                  {thumb.image ? (
                    <img src={thumb.image} alt={thumb.label} loading="lazy" style={{ width: '100%', height: 156, display: 'block', objectFit: 'cover' }} onError={(e) => { const el = e.target as HTMLImageElement; el.style.display = 'none'; const box = el.parentElement; if (box && !box.querySelector('.placeholder')) { const p = document.createElement('div'); p.className = 'placeholder'; p.style.cssText = 'padding:40px;text-align:center;color:#999;background:#f5f5f5;'; p.textContent = 'No thumbnail'; box.appendChild(p); } }} />
                  ) : (
                    <Box sx={{ background: '#f5f5f5', width: '100%', height: 156, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}><Typography variant="body2">No thumbnail</Typography></Box>
                  )}
                  <Box sx={{ p: 1.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                      <Chip size="small" label="Indexed file" sx={{ bgcolor: '#eef4ff', color: '#3538cd', fontWeight: 700 }} />
                      <Typography variant="caption" color="text.secondary">
                        {file.uploadedAt ? formatDate(file.uploadedAt) : 'Recently updated'}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75, minHeight: 40, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{file.fileName}</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                      <Chip size="small" label={`${file.frameCount} frames`} variant="outlined" sx={{ fontWeight: 600 }} />
                      {file.projectId && <Chip size="small" label="Connected" variant="outlined" sx={{ color: '#027a48', borderColor: '#a6f4c5', fontWeight: 700 }} />}
                    </Stack>
                    <Typography variant="caption" sx={{ color: '#667085', fontWeight: 600 }}>Open file gallery</Typography>
                  </Box>
                </Box>
              );
            }
            if (!item.frame || !item.thumb) return null;
            const { frame, thumb, index } = item;
            const allTagsFrame = [...(frame.frameTags || []), ...(frame.sizeTags || []), ...(frame.customTags || [])].filter(Boolean);
            const originalIndexFrame = index;
            return (
              <Box key={thumb.thumbName + idx} sx={{ mb: 2, cursor: 'pointer', width: 260, position: 'relative', ...GALLERY_CARD_SX, p: 1.25 }}>
                <img src={thumb.thumbnail || thumb.image} alt={thumb.label} loading="lazy" style={{ borderRadius: 14, border: (modalIndex === originalIndexFrame) ? '3px solid #111827' : '1.5px solid #dbe3f0', background: '#f8fafc', marginBottom: 8, width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }} onClick={() => { const fi = frameThumbsForModal.findIndex((it: any) => it.index === originalIndexFrame); if (fi !== -1) handleOpenModal(fi); }} />
                <IconButton onClick={() => toggleFavorite(thumb.thumbName)} color="error" sx={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.92)', zIndex: 1 }} aria-label="Add to favorites">{favorites.includes(thumb.thumbName) ? <FavoriteIcon /> : <FavoriteBorderIcon />}</IconButton>
                <Box sx={{ px: 0.5, mt: 0.5, textAlign: 'left' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#111827' }}>{thumb.label}</Typography>
                  {(thumb as any).filePageSubtitle && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{(thumb as any).filePageSubtitle}</Typography>
                  )}
                </Box>
                {allTagsFrame.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'flex-start', mt: 1, px: 0.5 }}>
                    {allTagsFrame.map((tag: string, tagIdx: number) => (
                      <Box key={tagIdx} sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: '16px', bgcolor: '#f8fafc', border: '1px solid #e4e7ec', fontSize: '0.75rem', fontWeight: 500, color: '#344054', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{tag}</Box>
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
        {showFirstIndexSuccess && firstIndexedFile && (
          <Box
            sx={{
              mt: 4,
              mb: 1,
              mx: 'auto',
              maxWidth: 760,
              bgcolor: '#ffffff',
              border: '1px solid #d9f2e6',
              borderRadius: 4,
              boxShadow: '0 12px 32px rgba(15,23,42,0.05)',
              p: { xs: 2.5, md: 3 },
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              <Box sx={{ minWidth: 0 }}>
                <Chip
                  label="First index ready"
                  sx={{ mb: 1.25, bgcolor: '#ecfdf3', color: '#027a48', fontWeight: 700 }}
                />
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#111827', mb: 0.75 }}>
                  Your first indexed file is ready
                </Typography>
                <Typography variant="body2" sx={{ color: '#667085', lineHeight: 1.7 }}>
                  <Box component="span" sx={{ fontWeight: 700, color: '#111827' }}>
                    {firstIndexedFile.file_name || 'This file'}
                  </Box>{' '}
                  was added to your gallery. Open it now to review pages, search screens, and make sure your first library feels right.
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ width: { xs: '100%', md: 'auto' } }}>
                <Button
                  variant="contained"
                  onClick={() => {
                    dismissFirstIndexSuccess();
                    loadFileFrames({ ...firstIndexedFile, fileKey: firstIndexedFile.figma_file_key || null });
                  }}
                  sx={{
                    bgcolor: '#111827',
                    color: '#fff',
                    textTransform: 'none',
                    borderRadius: 999,
                    px: 2.5,
                    py: 1.1,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    '&:hover': { bgcolor: '#1f2937' },
                  }}
                >
                  Open file
                </Button>
                <Button
                  variant="text"
                  onClick={dismissFirstIndexSuccess}
                  sx={{
                    color: '#475467',
                    textTransform: 'none',
                    fontWeight: 600,
                    alignSelf: { xs: 'flex-start', md: 'center' },
                  }}
                >
                  Dismiss
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}
        {showFirstUseEmptyState && (
          <Box
            sx={{
              mt: 5,
              mx: 'auto',
              maxWidth: 720,
              bgcolor: '#ffffff',
              border: '1px solid #e4e7ec',
              borderRadius: 4,
              boxShadow: '0 12px 34px rgba(15,23,42,0.06)',
              p: { xs: 3, md: 4 },
              textAlign: 'center',
            }}
          >
            <Chip
              label="First index"
              sx={{ mb: 2, bgcolor: '#eef4ff', color: '#3538cd', fontWeight: 700 }}
            />
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827', mb: 1.25 }}>
              Your gallery is ready for its first indexed file
            </Typography>
            <Typography variant="body1" sx={{ color: '#667085', lineHeight: 1.75, maxWidth: 560, mx: 'auto', mb: 3 }}>
              Install the FigDex plugin, link a Figma file, and create your first index. As soon as it finishes, this library becomes the place your team can browse, search, and share.
            </Typography>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              justifyContent="center"
              sx={{ mb: 3 }}
            >
              <Button
                variant="contained"
                startIcon={<StorageIcon />}
                onClick={() => router.push('/download-plugin')}
                sx={{
                  bgcolor: '#111827',
                  color: '#fff',
                  textTransform: 'none',
                  borderRadius: 999,
                  px: 3,
                  py: 1.2,
                  fontWeight: 700,
                  '&:hover': { bgcolor: '#1f2937' },
                }}
              >
                Download Plugin
              </Button>
              <Button
                variant="outlined"
                startIcon={<FolderOpenIcon />}
                onClick={() => router.push(hasStoredUser ? '/help' : '/register')}
                sx={{
                  color: '#111827',
                  borderColor: '#cbd5e1',
                  textTransform: 'none',
                  borderRadius: 999,
                  px: 3,
                  py: 1.2,
                  fontWeight: 600,
                  '&:hover': { borderColor: '#111827', bgcolor: 'rgba(17,24,39,0.04)' },
                }}
              >
                {hasStoredUser ? 'See Setup Steps' : 'Create Free Account'}
              </Button>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: 1.5,
                textAlign: 'left',
              }}
            >
              {[
                ['1', 'Install the plugin', 'Download the public package and add it to Figma once.'],
                ['2', 'Link a file', 'Open the plugin, paste your Figma file link, and load the pages you want.'],
                ['3', 'Create your first index', 'Choose the pages to include and open the result in FigDex Web.'],
              ].map(([step, title, text]) => (
                <Box
                  key={step}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: '#f8fafc',
                    border: '1px solid #eaecf0',
                  }}
                >
                  <Chip
                    label={step}
                    size="small"
                    sx={{ mb: 1.25, bgcolor: '#111827', color: '#fff', fontWeight: 700 }}
                  />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75, color: '#111827' }}>
                    {title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#667085', lineHeight: 1.65 }}>
                    {text}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        {showGenericNoResults && (
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
                  {modalThumb?.frame.url ? 'Open frame in Figma' : 'Open in Figma file'}
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
            <Typography variant="h6" sx={{ mb: 0.75 }}>
              Create Share Link
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Choose whether people should see your whole gallery or only the result set you prepared right now.
            </Typography>

            <Stack spacing={1.5} sx={{ mb: 3 }}>
              <Box
                onClick={() => setSelectedShareType('all_indices')}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: selectedShareType === 'all_indices' ? '2px solid #667eea' : '1px solid #d0d5dd',
                  bgcolor: selectedShareType === 'all_indices' ? '#eef4ff' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  '&:hover': {
                    borderColor: '#98a2ff',
                    boxShadow: '0 6px 18px rgba(16,24,40,0.06)'
                  }
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Everything in this gallery
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      People can browse your indexed files, then keep searching and filtering on their own.
                    </Typography>
                  </Box>
                  <Chip size="small" label="Recommended" sx={{ bgcolor: '#eef4ff', color: '#3538cd' }} />
                </Stack>
              </Box>

              <Box
                onClick={() => {
                  if (hasSharableResultContext) {
                    setSelectedShareType('search_results');
                  }
                }}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: selectedShareType === 'search_results' ? '2px solid #667eea' : '1px solid #d0d5dd',
                  bgcolor: selectedShareType === 'search_results' ? '#eef4ff' : '#fff',
                  cursor: hasSharableResultContext ? 'pointer' : 'not-allowed',
                  opacity: hasSharableResultContext ? 1 : 0.65,
                  transition: 'all 0.18s ease',
                  '&:hover': hasSharableResultContext ? {
                    borderColor: '#98a2ff',
                    boxShadow: '0 6px 18px rgba(16,24,40,0.06)'
                  } : undefined
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Just these results
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Share only the search or filters you prepared right now, without exposing the rest of the gallery.
                </Typography>
                <Typography variant="body2" sx={{ color: hasSharableResultContext ? '#344054' : '#98a2b3', fontWeight: 500 }}>
                  {hasSharableResultContext ? currentResultsShareName : 'Run a search or apply filters first to share a focused result set.'}
                </Typography>
              </Box>
            </Stack>

            {selectedShareType && (
              <Box sx={{ mb: 4, p: 2, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid #eaecf0' }}>
                <Typography variant="overline" sx={{ color: '#667085', letterSpacing: '0.08em', fontWeight: 700 }}>
                  Share preview
                </Typography>
                <Typography variant="subtitle1" sx={{ mt: 0.5, mb: 0.75, fontWeight: 700, color: '#111827' }}>
                  {selectedShareType === 'all_indices' ? 'Full gallery' : currentResultsShareName}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1.75, color: '#475467', lineHeight: 1.7 }}>
                  {selectedShareType === 'all_indices'
                    ? 'People will open a browsable version of your gallery and keep searching from there.'
                    : 'People will open only this prepared result set. This is best when you want to share one focused slice of the library.'}
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => handleCreateShare(selectedShareType)}
                  disabled={creatingShare}
                  sx={{ borderRadius: 999, px: 2.5, textTransform: 'none', fontWeight: 700 }}
                >
                  {creatingShare ? 'Creating...' : selectedShareType === 'all_indices' ? 'Create full gallery link' : 'Create focused results link'}
                </Button>
              </Box>
            )}

            <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
              Existing Share Links
            </Typography>
            {sharedViews.length === 0 ? (
              <Box sx={{ p: 2.5, borderRadius: 3, border: '1px dashed #d0d5dd', bgcolor: '#fcfcfd' }}>
                <Typography variant="body2" color="text.secondary">
                  No share links created yet.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {sharedViews.map((view) => (
                  <Box
                    key={view.id}
                    sx={{
                      p: 2,
                      border: '1px solid #e4e7ec',
                      borderRadius: 3,
                      bgcolor: '#fff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.25
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
                          {view.share_name || (view.share_type === 'all_indices' ? 'Full gallery' : 'Focused results')}
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
                    {!editingName && (
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip
                          size="small"
                          label={view.share_type === 'all_indices' ? 'Full gallery' : 'Filtered results'}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={view.created_at ? `Created ${formatDate(view.created_at)}` : 'Created recently'}
                          sx={{ bgcolor: '#f8fafc', color: '#667085' }}
                        />
                      </Stack>
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
