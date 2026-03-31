import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Chip
} from '@mui/material';
import { useRouter } from 'next/router';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import HomeIcon from '@mui/icons-material/Home';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

export default function Header() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is admin
    const checkAdminStatus = () => {
      try {
        const userData = localStorage.getItem('figma_web_user');
        if (userData) {
          const user = JSON.parse(userData);
          const adminEmails = ['ranmor01@gmail.com'];
          setIsAdmin(adminEmails.includes(user.email));
        }
      } catch (error) {
        console.error('Failed to check admin status:', error);
      }
    };

    checkAdminStatus();
  }, []);

  return (
    <AppBar position="static" sx={{ mb: 3 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Indexo Gallery
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button 
            color="inherit" 
            startIcon={<HomeIcon />}
            onClick={() => router.push('/')}
            sx={{ 
              backgroundColor: router.pathname === '/' ? 'rgba(255,255,255,0.1)' : 'transparent'
            }}
          >
            דף ראשי
          </Button>
          
          <Button 
            color="inherit" 
            startIcon={<FolderOpenIcon />}
            onClick={() => router.push('/gallery')}
            sx={{ 
              backgroundColor: router.pathname === '/gallery' ? 'rgba(255,255,255,0.1)' : 'transparent'
            }}
          >
            My FigDex
          </Button>

          {isAdmin && (
            <Button 
              color="inherit" 
              startIcon={<AdminPanelSettingsIcon />}
              onClick={() => router.push('/admin')}
              sx={{ 
                backgroundColor: router.pathname.startsWith('/admin') ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: '1px solid rgba(255,255,255,0.3)',
                position: 'relative'
              }}
            >
              ניהול
              <Chip 
                label="Admin" 
                size="small" 
                sx={{ 
                  ml: 1, 
                  height: 20, 
                  fontSize: '0.7rem',
                  backgroundColor: 'rgba(255,200,0,0.9)',
                  color: '#000',
                  fontWeight: 'bold'
                }} 
              />
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
} 
