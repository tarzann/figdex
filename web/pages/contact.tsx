import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Divider,
  TextField,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Email as EmailIcon,
  Send as SendIcon
} from '@mui/icons-material';
import PublicSiteHeader from '../components/PublicSiteHeader';

const ContactPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send message');
      }
      
      setSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setError('Failed to send message. Please try again or email us directly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FFFFFF' }}>
      <PublicSiteHeader />

      {/* Content */}
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 }, pb: 12 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <EmailIcon sx={{ fontSize: 64, color: '#667eea', mb: 2 }} />
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              mb: 4,
              fontWeight: 300
            }}
          >
            Have a question or need help? We&apos;re here to assist you.
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 6, mb: 6 }}>
          <Box>
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 400, 
                color: '#1a1a1a', 
                mb: 3,
                fontSize: '1.5rem'
              }}
            >
              Get in Touch
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#666', 
                lineHeight: 1.8,
                fontWeight: 300,
                mb: 4
              }}
            >
              Whether you have a question about features, need technical support, or want to provide feedback, we&apos;d love to hear from you.
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 400, 
                  color: '#1a1a1a', 
                  mb: 1
                }}
              >
                Email
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#666',
                  fontWeight: 300
                }}
              >
                {process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@figdex.com'}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 400, 
                  color: '#1a1a1a', 
                  mb: 1
                }}
              >
                Response Time
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#666',
                  fontWeight: 300
                }}
              >
                We typically respond within 24-48 hours
              </Typography>
            </Box>
          </Box>

          <Box>
            <form onSubmit={handleSubmit}>
              {success && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  Thank you for your message! We&apos;ll get back to you soon.
                </Alert>
              )}
              
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                sx={{ mb: 3 }}
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                sx={{ mb: 3 }}
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                sx={{ mb: 3 }}
                disabled={loading}
              />

              <TextField
                fullWidth
                label="Message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                multiline
                rows={6}
                sx={{ mb: 3 }}
                disabled={loading}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                disabled={loading}
                sx={{ 
                  bgcolor: '#1a1a1a',
                  color: '#fff',
                  textTransform: 'none',
                  borderRadius: 0,
                  py: 1.5,
                  '&:hover': { 
                    bgcolor: '#333'
                  }
                }}
              >
                {loading ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </Box>
        </Box>

        <Divider sx={{ my: 6 }} />

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
            Frequently Asked Questions
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 3
            }}
          >
            Before contacting us, you might find the answer in our{' '}
            <Box 
              component="span" 
              onClick={() => router.push('/help')}
              sx={{ 
                color: '#667eea', 
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Help Center
            </Box>
            .
          </Typography>
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
            onClick={() => router.push('/help')}
          >
            Visit Help Center
          </Button>
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

export default ContactPage;
