import { useEffect, useState } from 'react';
import { Box, Container, Typography, TextField, Switch, FormControlLabel, Button, Alert, Stack } from '@mui/material';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [slug, setSlug] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    // Load token and existing settings
    const userData = typeof window !== 'undefined' ? localStorage.getItem('figma_web_user') : null;
    const accessToken = userData ? (JSON.parse(userData)?.access_token || JSON.parse(userData)?.accessToken || '') : '';
    setToken(accessToken || '');
    if (accessToken) fetchSettings(accessToken);
    else setLoading(false);
  }, []);

  const fetchSettings = async (t: string) => {
    try {
      const res = await fetch('/api/user/public-link', { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      if (data.success) {
        setEnabled(!!data.settings?.public_enabled);
        setSlug(data.settings?.public_slug || '');
      } else {
        setError(data.error || 'Failed to load settings');
      }
    } catch {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/user/public-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ public_enabled: enabled, public_slug: slug || null })
      });
      const data = await res.json();
      if (data.success) {
        setEnabled(!!data.settings?.public_enabled);
        setSlug(data.settings?.public_slug || '');
        setSuccess('Saved');
      } else {
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Failed to save');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Settings</Typography>
      {loading ? (
        <Typography>Loading…</Typography>
      ) : (
        <Box>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Box sx={{ p: 3, border: '1px solid #eee', borderRadius: 2, bgcolor: '#fff' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Public profile link</Typography>
            <FormControlLabel control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />} label="Enable public link" />
            <TextField
              label="Slug"
              placeholder="your-name"
              fullWidth
              value={slug}
              onChange={(e) => setSlug(e.target.value.replace(/\s+/g, '-'))}
              helperText="3–32 chars. Letters, numbers, - and _"
              sx={{ mt: 2 }}
            />
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button variant="contained" onClick={save}>Save</Button>
              {enabled && slug && (
                <Button variant="outlined" href={`/u/${encodeURIComponent(slug)}`} target="_blank">Open public link</Button>
              )}
            </Stack>
          </Box>
        </Box>
      )}
    </Container>
  );
}


