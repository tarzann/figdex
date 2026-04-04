import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PublicSiteLayout from '../components/PublicSiteLayout';
import {
  PUBLIC_SITE_PRIMARY_BUTTON_SX,
  PUBLIC_SITE_SECONDARY_BUTTON_SX,
  PUBLIC_SITE_SURFACE_SX,
} from '../lib/public-site-styles';

const FIGMA_FILE_OPTIONS = [
  '1-10 files',
  '11-50 files',
  '51-200 files',
  '201-500 files',
  '500+ files',
];

const TEAM_SIZE_OPTIONS = [
  'Just me',
  '2-5 people',
  '6-20 people',
  '21-100 people',
  '100+ people',
];

const USE_CASE_OPTIONS = [
  'Design review',
  'Search across old files',
  'Handoff / product collaboration',
  'Design ops / governance',
  'Stakeholder sharing',
  'Other',
];

export default function BetaPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    company: '',
    figmaFileCount: '',
    teamSize: '',
    primaryUseCase: '',
    biggestPainPoint: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/beta-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit beta request');
      }

      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        role: '',
        company: '',
        figmaFileCount: '',
        teamSize: '',
        primaryUseCase: '',
        biggestPainPoint: '',
        notes: '',
      });
    } catch (submitError) {
      setError('Failed to send your beta request. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicSiteLayout>
      <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 }, pb: 12 }}>
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <AutoAwesomeIcon sx={{ fontSize: 52, color: '#667eea', mb: 2 }} />
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              color: '#1a1a1a',
              letterSpacing: '-0.03em',
              fontSize: { xs: '2rem', md: '3rem' },
              mb: 2,
            }}
          >
            Join the FigDex beta
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: '#667085',
              maxWidth: 700,
              mx: 'auto',
              lineHeight: 1.7,
              fontWeight: 400,
            }}
          >
            Tell us a bit about your team, your Figma workflow, and where large files slow you down. We&apos;ll use this to prioritize early access.
          </Typography>
        </Box>

        <Box sx={{ ...PUBLIC_SITE_SURFACE_SX, p: { xs: 3, md: 4 } }}>
          <Stack spacing={1} sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827' }}>
              Beta request form
            </Typography>
            <Typography variant="body1" sx={{ color: '#667085', lineHeight: 1.7 }}>
              We&apos;re especially interested in teams working with large multi-page libraries, repeated review cycles, and cross-functional sharing.
            </Typography>
          </Stack>

          <form onSubmit={handleSubmit}>
            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                Thanks. We received your beta request and will be in touch soon.
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
              <TextField label="Full name" name="name" value={formData.name} onChange={handleChange} required disabled={loading} />
              <TextField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required disabled={loading} />
              <TextField label="Role" name="role" placeholder="Product Designer, Design Ops, PM..." value={formData.role} onChange={handleChange} required disabled={loading} />
              <TextField label="Company or team" name="company" value={formData.company} onChange={handleChange} disabled={loading} />
              <TextField select label="How many Figma files do you work across?" name="figmaFileCount" value={formData.figmaFileCount} onChange={handleChange} required disabled={loading}>
                {FIGMA_FILE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
              <TextField select label="Team size" name="teamSize" value={formData.teamSize} onChange={handleChange} disabled={loading}>
                {TEAM_SIZE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
              <Box sx={{ gridColumn: { xs: 'auto', md: '1 / -1' } }}>
                <TextField select fullWidth label="Primary use case" name="primaryUseCase" value={formData.primaryUseCase} onChange={handleChange} required disabled={loading}>
                  {USE_CASE_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ gridColumn: { xs: 'auto', md: '1 / -1' } }}>
                <TextField
                  fullWidth
                  multiline
                  minRows={4}
                  label="What is the biggest pain point in your Figma workflow today?"
                  name="biggestPainPoint"
                  value={formData.biggestPainPoint}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </Box>
              <Box sx={{ gridColumn: { xs: 'auto', md: '1 / -1' } }}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Anything else we should know?"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  disabled={loading}
                />
              </Box>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
                sx={{ ...PUBLIC_SITE_PRIMARY_BUTTON_SX, px: 3, py: 1.4 }}
              >
                {loading ? 'Sending...' : 'Request beta access'}
              </Button>
              <Button
                variant="outlined"
                href="/download-plugin"
                sx={{ ...PUBLIC_SITE_SECONDARY_BUTTON_SX, px: 3, py: 1.4 }}
              >
                See plugin page
              </Button>
            </Stack>
          </form>
        </Box>
      </Container>
    </PublicSiteLayout>
  );
}
