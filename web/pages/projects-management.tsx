import { useState, useEffect, useMemo } from 'react';
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Stack,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Autocomplete,
  InputAdornment
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  AccountCircle as AccountCircleIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Api as ApiIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
  Link as LinkIcon,
  ContentCopy as ContentCopyIcon,
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import UserAppLayout from '../components/UserAppLayout';

interface Project {
  id: string;
  serial_number: number;
  figma_link: string | null;
  jira_link: string | null;
  description: string | null;
  date: string;
  people: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export default function ProjectsManagement() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    figma_link: '',
    jira_link: '',
    description: '',
    date: new Date(),
    people: [] as string[],
    status: 'active'
  });
  const [peopleInput, setPeopleInput] = useState('');
  const [allPeople, setAllPeople] = useState<string[]>([]);

  useEffect(() => {
    loadProjects();
    checkLogin();
  }, []);

  const checkLogin = () => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('figma_web_user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          setIsLoggedIn(true);
          const adminEmails = ['ranmor01@gmail.com'];
          setIsAdmin(adminEmails.includes(user.email));
        } catch {
          setIsLoggedIn(false);
        }
      }
    }
  };

  const getCurrentUser = () => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('figma_web_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  };

  const getApiKey = () => {
    const user = getCurrentUser();
    return user?.api_key || null;
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const apiKey = getApiKey();
      if (!apiKey) {
        setError('No logged in user found');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to load projects');
        setProjects([]);
        setLoading(false);
        return;
      }

      setProjects(data.data || []);
      
      // Extract all unique people names for autocomplete
      const allPeopleSet = new Set<string>();
      (data.data || []).forEach((project: Project) => {
        if (project.people && Array.isArray(project.people)) {
          project.people.forEach((person: string) => allPeopleSet.add(person));
        }
      });
      setAllPeople(Array.from(allPeopleSet).sort());
    } catch (err: any) {
      console.error('Error loading projects:', err);
      setError(err.message || 'Failed to load projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('figma_web_user');
    setIsLoggedIn(false);
    setIsAdmin(false);
    handleUserMenuClose();
    router.push('/');
  };

  const handleCopyApiKey = async () => {
    if (typeof window === 'undefined') return;
    const userData = localStorage.getItem('figma_web_user');
    if (!userData) {
      alert('No user found');
      return;
    }
    try {
      const user = JSON.parse(userData);
      if (user && user.api_key) {
        try {
          await navigator.clipboard.writeText(user.api_key);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          alert('API Key copied to clipboard!');
        } catch (err) {
          console.error('Failed to copy API key:', err);
          const textArea = document.createElement('textarea');
          textArea.value = user.api_key;
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            alert('API Key copied to clipboard!');
          } catch (fallbackErr) {
            console.error('Fallback copy failed:', fallbackErr);
            alert('Failed to copy API key');
          }
          document.body.removeChild(textArea);
        }
      } else {
        alert('No API key found for this user');
      }
    } catch (err) {
      console.error('Failed to parse user data:', err);
      alert('Failed to copy API key');
    }
  };

  const handleAddProject = () => {
    setEditingProject(null);
    setFormData({
      figma_link: '',
      jira_link: '',
      description: '',
      date: new Date(),
      people: [],
      status: 'To Do'
    });
    setPeopleInput('');
    setDialogOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setFormData({
      figma_link: project.figma_link || '',
      jira_link: project.jira_link || '',
      description: project.description || '',
      date: new Date(project.date),
      people: project.people || [],
      status: project.status || 'To Do'
    });
    setPeopleInput('');
    setDialogOpen(true);
  };

  const handleDeleteProject = (projectId: string) => {
    setDeleteProjectId(projectId);
    setDeleteDialogOpen(true);
  };

  const handleSaveProject = async () => {
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        setError('No logged in user found');
        return;
      }

      // Validate description is required
      if (!formData.description || !formData.description.trim()) {
        setError('Description is required');
        return;
      }

      const projectData = {
        figma_link: formData.figma_link.trim() || null,
        jira_link: formData.jira_link.trim() || null,
        description: formData.description.trim(),
        date: formData.date.toISOString().split('T')[0],
        people: formData.people,
        status: formData.status
      };

      let response;
      if (editingProject) {
        // Update existing project
        response = await fetch('/api/projects', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            id: editingProject.id,
            ...projectData
          })
        });
      } else {
        // Create new project
        response = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(projectData)
        });
      }

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to save project');
        return;
      }

      setDialogOpen(false);
      setSnackbarMessage(editingProject ? 'Project updated successfully' : 'Project created successfully');
      setSnackbarOpen(true);
      loadProjects();
    } catch (err: any) {
      console.error('Error saving project:', err);
      setError(err.message || 'Failed to save project');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteProjectId) return;

    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        setError('No logged in user found');
        return;
      }

      const response = await fetch('/api/projects', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ id: deleteProjectId })
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to delete project');
        return;
      }

      setDeleteDialogOpen(false);
      setDeleteProjectId(null);
      setSnackbarMessage('Project deleted successfully');
      setSnackbarOpen(true);
      loadProjects();
    } catch (err: any) {
      console.error('Error deleting project:', err);
      setError(err.message || 'Failed to delete project');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    
    const query = searchQuery.toLowerCase();
    return projects.filter(project => {
      return (
        project.serial_number.toString().includes(query) ||
        (project.figma_link && project.figma_link.toLowerCase().includes(query)) ||
        (project.jira_link && project.jira_link.toLowerCase().includes(query)) ||
        (project.description && project.description.toLowerCase().includes(query)) ||
        (project.people && project.people.some(p => p.toLowerCase().includes(query))) ||
        project.status.toLowerCase().includes(query)
      );
    });
  }, [projects, searchQuery]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <UserAppLayout title="Projects Management" contentMaxWidth="lg" contentSx={{ py: { xs: 4, md: 6 } }}>
        {/* Search Bar */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search projects by serial number, links, description, people, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#999' }} />
                </InputAdornment>
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
              }
            }}
          />
        </Box>

        {/* Add Project Button */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddProject}
            sx={{
              bgcolor: '#667eea',
              '&:hover': { bgcolor: '#5568d3' }
            }}
          >
            Add Project
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Projects Table */}
        <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell><strong>#</strong></TableCell>
                <TableCell><strong>Description</strong></TableCell>
                <TableCell><strong>Figma Link</strong></TableCell>
                <TableCell><strong>Jira Link</strong></TableCell>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>People</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {searchQuery ? 'No projects found matching your search' : 'No projects yet. Click "Add Project" to create one.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects.map((project) => (
                  <TableRow key={project.id} hover>
                    <TableCell>{project.serial_number}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {project.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {project.figma_link ? (
                        <Button
                          size="small"
                          startIcon={<LinkIcon />}
                          href={project.figma_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ textTransform: 'none' }}
                        >
                          Open
                        </Button>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {project.jira_link ? (
                        <Button
                          size="small"
                          startIcon={<LinkIcon />}
                          href={project.jira_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ textTransform: 'none' }}
                        >
                          Open
                        </Button>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(project.date)}</TableCell>
                    <TableCell>
                      {project.people && project.people.length > 0 ? (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {project.people.map((person, idx) => (
                            <Chip key={idx} label={person} size="small" sx={{ fontSize: '0.7rem' }} />
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={project.status}
                        size="small"
                        color={
                          project.status === 'To Do' ? 'default' :
                          project.status === 'In Progress' ? 'primary' :
                          project.status === 'Waiting' ? 'warning' :
                          project.status === 'Completed' ? 'success' :
                          project.status === 'Canceled' ? 'error' :
                          project.status === 'Archived' ? 'default' : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleEditProject(project)}
                        sx={{ color: '#667eea' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteProject(project.id)}
                        sx={{ color: '#f44336' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </UserAppLayout>
      
      {/* Add/Edit Project Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        disablePortal={false}
        hideBackdrop={false}
      >
        <DialogTitle>
          {editingProject ? 'Edit Project' : 'Add New Project'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Project description..."
              required
              error={!formData.description || !formData.description.trim()}
              helperText={!formData.description || !formData.description.trim() ? 'Description is required' : ''}
            />
            <TextField
              label="Figma Link"
              fullWidth
              value={formData.figma_link}
              onChange={(e) => setFormData({ ...formData, figma_link: e.target.value })}
              placeholder="https://figma.com/file/..."
            />
            <TextField
              label="Jira Link"
              fullWidth
              value={formData.jira_link}
              onChange={(e) => setFormData({ ...formData, jira_link: e.target.value })}
              placeholder="https://jira.com/browse/..."
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Date"
                value={formData.date}
                onChange={(newValue) => {
                  if (newValue) {
                    setFormData({ ...formData, date: newValue });
                  }
                }}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
            </LocalizationProvider>
            <Autocomplete
              multiple
              freeSolo
              options={allPeople}
              value={formData.people}
              onChange={(event, newValue) => {
                // newValue can be array of strings or array with new inputValue objects
                const peopleArray = newValue.map((item: string | { inputValue?: string }) => {
                  if (typeof item === 'string') {
                    return item;
                  }
                  // Handle freeSolo new input
                  return (item as { inputValue?: string }).inputValue || String(item);
                }).filter(Boolean) as string[];
                
                setFormData({ ...formData, people: peopleArray });
                
                // Update allPeople list with new values
                const newPeopleToAdd = peopleArray.filter(p => !allPeople.includes(p));
                if (newPeopleToAdd.length > 0) {
                  setAllPeople([...allPeople, ...newPeopleToAdd].sort());
                }
              }}
              inputValue={peopleInput}
              onInputChange={(event, newInputValue, reason) => {
                setPeopleInput(newInputValue);
              }}
              getOptionLabel={(option: string | { inputValue?: string }) => {
                if (typeof option === 'string') {
                  return option;
                }
                return (option as { inputValue?: string }).inputValue || String(option);
              }}
              renderOption={(props, option) => {
                const label = typeof option === 'string' ? option : (option as { inputValue?: string }).inputValue || String(option);
                return (
                  <li {...props} key={label}>
                    {label}
                  </li>
                );
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const label = typeof option === 'string' ? option : String(option);
                  return (
                    <Chip
                      label={label}
                      {...getTagProps({ index })}
                      key={`${label}-${index}`}
                      size="small"
                    />
                  );
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="People"
                  placeholder="Type and press Enter to add people..."
                  onKeyDown={(e) => {
                    // Add person when Enter is pressed
                    if (e.key === 'Enter' && peopleInput.trim()) {
                      const trimmedInput = peopleInput.trim();
                      if (!formData.people.includes(trimmedInput)) {
                        e.preventDefault();
                        e.stopPropagation();
                        const newPeople = [...formData.people, trimmedInput];
                        setFormData({ ...formData, people: newPeople });
                        setPeopleInput('');
                        // Update allPeople list for autocomplete
                        if (!allPeople.includes(trimmedInput)) {
                          setAllPeople([...allPeople, trimmedInput].sort());
                        }
                      } else {
                        // If already exists, just clear input
                        e.preventDefault();
                        setPeopleInput('');
                      }
                    }
                  }}
                />
              )}
            />
            <TextField
              select
              label="Status"
              fullWidth
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              SelectProps={{
                native: true
              }}
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting">Waiting</option>
              <option value="Completed">Completed</option>
              <option value="Canceled">Canceled</option>
              <option value="Archived">Archived</option>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveProject} variant="contained" color="primary">
            {editingProject ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        disablePortal={false}
        hideBackdrop={false}
      >
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this project? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </>
  );
}
