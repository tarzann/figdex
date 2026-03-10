import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Card,
  CardContent,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Extension as ExtensionIcon,
  Api as ApiIcon,
  Search as SearchIcon2,
  Share as ShareIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountCircleIcon,
  Storage as StorageIcon,
  Person as PersonIcon,
  ContentCopy as ContentCopyIcon,
  Logout as LogoutIcon,
  FolderOpen as FolderOpenIcon
} from '@mui/icons-material';

const HelpCenter = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
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
    checkLogin();
  }, []);

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

  const faqCategories = [
    {
      title: 'Getting Started',
      icon: <ExtensionIcon />,
      questions: [
        {
          question: 'How do I create my first index?',
          answer: 'You can create an index in two ways: 1) Use the Figma Plugin - Install the FigDex plugin from the Figma Community, select frames, and click "Create Index". 2) Use the Figma API - Go to the "Create Index from Figma API" page, enter your Figma file URL and API token, select pages, and create the index.'
        },
        {
          question: 'What is the difference between the Plugin and API methods?',
          answer: 'The Plugin method allows you to manually select frames directly in Figma. The API method automates the process and can index entire files automatically. Both methods create the same type of searchable index.'
        },
        {
          question: 'Do I need a Figma API token?',
          answer: 'You only need a Figma API token if you want to use the automated API indexing method. For the Plugin method, you don\'t need an API token. You can get a Figma API token from your Figma account settings.'
        }
      ]
    },
    {
      title: 'Using the Gallery',
      icon: <SearchIcon2 />,
      questions: [
        {
          question: 'How do I search for frames?',
          answer: 'Use the search bar at the top of the gallery to search by frame name, page name, or text content. You can also use advanced filters to search by device type, aspect ratio, colors, and more.'
        },
        {
          question: 'Can I filter frames by multiple criteria?',
          answer: 'Yes! Click on the filter icon to open the advanced filters panel. You can combine multiple filters like device type, aspect ratio, colors, frame types, and sections to refine your search.'
        },
        {
          question: 'How do I view a frame in full screen?',
          answer: 'Click on any frame thumbnail in the gallery to open it in a full-screen modal. You can navigate between frames using the arrow keys or the navigation buttons.'
        }
      ]
    },
    {
      title: 'Sharing & Collaboration',
      icon: <ShareIcon />,
      questions: [
        {
          question: 'How do I share my gallery with others?',
          answer: 'You can generate a public share link from the Index Management dialog. Click on the share icon next to any index to create a shareable link. Anyone with the link can view your gallery without needing to sign in.'
        },
        {
          question: 'Can I make my gallery private?',
          answer: 'By default, your galleries are private and only accessible to you. Share links are only accessible to people who have the specific link. You can revoke access by regenerating the share token.'
        },
        {
          question: 'What is a public user profile?',
          answer: 'A public user profile allows you to showcase your indices at a custom URL (e.g., /u/yourname). You can enable this in your account settings and choose which indices to display publicly.'
        }
      ]
    },
    {
      title: 'Account & Settings',
      icon: <SettingsIcon />,
      questions: [
        {
          question: 'How do I change my subscription plan?',
          answer: 'Go to the Pricing page and select the plan you want. You can upgrade or downgrade at any time. Changes take effect immediately for upgrades, and at the end of your billing period for downgrades.'
        },
        {
          question: 'Where can I find my API key?',
          answer: 'Your API key is available in your Account Settings page. You can copy it, regenerate it, or view it in full. Keep your API key secure and don\'t share it publicly.'
        },
        {
          question: 'How do I delete my account?',
          answer: 'Contact us through the contact page to request account deletion. We will delete your account and all associated data within 30 days of your request.'
        }
      ]
    },
    {
      title: 'Troubleshooting',
      icon: <QuestionAnswerIcon />,
      questions: [
        {
          question: 'My index creation is stuck or failed. What should I do?',
          answer: 'Large indices may take time to process. Check the job status in the Index History. If a job fails, try creating the index again with fewer pages or frames. For very large files, the system automatically splits the job into smaller chunks.'
        },
        {
          question: 'Why are some frames not appearing in my index?',
          answer: 'Hidden frames are automatically excluded from indexing. Make sure the frames you want to index are visible in Figma. Also, check that you selected the correct pages when creating the index.'
        },
        {
          question: 'I\'m getting a timeout error. What does this mean?',
          answer: 'Timeout errors usually occur with very large files. The system will automatically retry, or you can try indexing fewer pages at once. For files with over 500 frames, the system automatically splits the job.'
        },
        {
          question: 'How do I restore a previous version of my index?',
          answer: 'Go to Index Management, click on an index, and look for the "Archived Versions" section. You can view and restore any previous version of your index.'
        }
      ]
    }
  ];

  const filteredFAQs = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(q => 
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FFFFFF' }}>
      {/* Header */}
      <Container maxWidth="lg">
        <Box sx={{ py: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 300,
              letterSpacing: 3,
              color: '#1a1a1a',
              fontSize: '1.5rem',
              cursor: 'pointer'
            }}
            onClick={() => router.push('/')}
          >
            FIGDEX
          </Typography>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 300,
              color: '#1a1a1a',
              fontSize: '1.25rem',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          >
            Help Center
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="text"
              startIcon={<ArrowBackIcon />}
              sx={{ 
                color: '#1a1a1a',
                fontWeight: 400,
                textTransform: 'none',
                fontSize: '0.95rem',
                '&:hover': { 
                  bgcolor: '#f5f5f5'
                }
              }}
              onClick={() => router.back()}
            >
              Back
            </Button>
            {isLoggedIn && (
              <IconButton
                onClick={handleUserMenuOpen}
                sx={{ 
                  bgcolor: 'transparent',
                  '&:hover': { bgcolor: '#f5f5f5' }
                }}
              >
                <Avatar sx={{ bgcolor: '#667eea', width: 32, height: 32 }}>
                  <AccountCircleIcon />
                </Avatar>
              </IconButton>
            )}
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
              <MenuItem onClick={() => { router.push('/gallery'); handleUserMenuClose(); }}>
                <ListItemIcon>
                  <SearchIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>My FigDex</ListItemText>
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
              <MenuItem onClick={() => { handleCopyApiKey(); handleUserMenuClose(); }}>
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
          </Stack>
        </Box>
      </Container>

      {/* Content */}
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 }, pb: 12 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <QuestionAnswerIcon sx={{ fontSize: 64, color: '#667eea', mb: 2 }} />
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              mb: 4,
              fontWeight: 300
            }}
          >
            Find answers to common questions and learn how to get the most out of FigDex
          </Typography>
        </Box>

        {/* Search */}
        <Box sx={{ mb: 6 }}>
          <TextField
            fullWidth
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: '#999', mr: 1 }} />
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 0,
                '&:hover fieldset': {
                  borderColor: '#1a1a1a',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#1a1a1a',
                },
              },
            }}
          />
        </Box>

        {/* Quick Links */}
        <Box sx={{ mb: 6 }}>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 400, 
              color: '#1a1a1a', 
              mb: 3,
              fontSize: '1.5rem'
            }}
          >
            Quick Links
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
            <Card 
              elevation={0}
              sx={{ 
                border: '1px solid #eee',
                cursor: 'pointer',
                '&:hover': { borderColor: '#667eea', boxShadow: 1 }
              }}
              onClick={() => router.push('/contact')}
            >
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 400, mb: 1 }}>
                  Contact Support
                </Typography>
                <Typography variant="body2" sx={{ color: '#666', fontWeight: 300 }}>
                  Need more help? Get in touch with our support team.
                </Typography>
              </CardContent>
            </Card>
            <Card 
              elevation={0}
              sx={{ 
                border: '1px solid #eee',
                cursor: 'pointer',
                '&:hover': { borderColor: '#667eea', boxShadow: 1 }
              }}
              onClick={() => router.push('/api-index')}
            >
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 400, mb: 1 }}>
                  API Documentation
                </Typography>
                <Typography variant="body2" sx={{ color: '#666', fontWeight: 300 }}>
                  Learn how to use the Figma API integration.
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        <Divider sx={{ mb: 6 }} />

        {/* FAQ Sections */}
        {filteredFAQs.map((category, categoryIdx) => (
          <Box key={categoryIdx} sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Box sx={{ color: '#667eea', mr: 2 }}>
                {category.icon}
              </Box>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 400, 
                  color: '#1a1a1a',
                  fontSize: '1.5rem'
                }}
              >
                {category.title}
              </Typography>
            </Box>
            
            {category.questions.map((faq, faqIdx) => (
              <Accordion 
                key={faqIdx}
                elevation={0}
                sx={{ 
                  border: '1px solid #eee',
                  mb: 1,
                  '&:before': { display: 'none' }
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    '&:hover': { bgcolor: '#fafafa' }
                  }}
                >
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: 400,
                      color: '#1a1a1a'
                    }}
                  >
                    {faq.question}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#666', 
                      lineHeight: 1.8,
                      fontWeight: 300
                    }}
                  >
                    {faq.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        ))}

        {filteredFAQs.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" sx={{ color: '#999', mb: 2, fontWeight: 300 }}>
              No results found
            </Typography>
            <Typography variant="body2" sx={{ color: '#999', fontWeight: 300 }}>
              Try searching with different keywords or{' '}
              <Box 
                component="span" 
                onClick={() => router.push('/contact')}
                sx={{ 
                  color: '#667eea', 
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                contact support
              </Box>
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 6 }} />

        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 400, 
              color: '#1a1a1a', 
              mb: 2
            }}
          >
            Still need help?
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              mb: 4,
              fontWeight: 300
            }}
          >
            Our support team is here to assist you
          </Typography>
          <Button
            variant="contained"
            sx={{ 
              bgcolor: '#1a1a1a',
              color: '#fff',
              textTransform: 'none',
              borderRadius: 0,
              px: 4,
              py: 1.5,
              '&:hover': { 
                bgcolor: '#333'
              }
            }}
            onClick={() => router.push('/contact')}
          >
            Contact Support
          </Button>
        </Box>

        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 4 }}>
          <Button
            variant="outlined"
            sx={{ 
              color: '#1a1a1a', 
              borderColor: '#ddd',
              textTransform: 'none',
              borderRadius: 0,
              '&:hover': { 
                borderColor: '#1a1a1a',
                bgcolor: '#fafafa'
              }
            }}
            onClick={() => router.push('/')}
          >
            Back to Home
          </Button>
        </Stack>
      </Container>
    </Box>
  );
};

export default HelpCenter;



