import React from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  Typography,
} from '@mui/material';

const ProductDemosPage: React.FC = () => {
  const router = useRouter();

  const handlePrimaryHeroClick = () => {
    // Direct users to the main onboarding / home flow
    router.push('/');
  };

  const handleSecondaryHeroClick = () => {
    router.push('/gallery');
  };

  const DemoCard = ({
    label,
    title,
    description,
    align,
    src,
    alt,
  }: {
    label?: string;
    title: string;
    description: string;
    align: 'left' | 'right';
    src: string;
    alt: string;
  }) => (
    <Box
      sx={{
        py: { xs: 4, md: 6 },
        borderTop: '1px solid #f1f1f1',
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', md: align === 'left' ? 'row' : 'row-reverse' }}
          spacing={{ xs: 4, md: 6 }}
          alignItems="center"
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {label && (
              <Typography
                variant="overline"
                sx={{ color: 'text.secondary', letterSpacing: 1, mb: 1, display: 'block' }}
              >
                {label}
              </Typography>
            )}
            <Typography
              variant="h5"
              sx={{
                fontWeight: 500,
                mb: 1.5,
                color: '#111827',
              }}
            >
              {title}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {description}
            </Typography>
          </Box>

          <Box sx={{ flex: 1, width: '100%' }}>
            <Card
              elevation={1}
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                bgcolor: '#f9fafb',
              }}
            >
              <CardContent
                sx={{
                  p: 0,
                  minHeight: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#f3f4f6',
                }}
              >
                <Box
                  component="img"
                  src={src}
                  alt={alt}
                  sx={{
                    width: '100%',
                    maxWidth: 520,
                    aspectRatio: '16 / 9',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Container>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: '#ffffff', minHeight: '100vh' }}>
      {/* Simple top brand header, aligned with marketing pages */}
      <Container maxWidth="lg">
        <Box
          sx={{
            py: 4,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 300,
                letterSpacing: 3,
                color: '#111827',
                fontSize: '1.5rem',
              }}
            >
              FIGDEX
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              Product demos
            </Typography>
          </Box>
        </Box>
      </Container>

      {/* 1️⃣ Hero with main demo GIF */}
      <Box
        sx={{
          borderBottom: '1px solid #f1f1f1',
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 4, md: 6 }}
            sx={{ py: { xs: 4, md: 6 } }}
            alignItems="center"
          >
            <Box sx={{ flex: 1, maxWidth: 520 }}>
              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: '1.9rem', md: '2.4rem' },
                  fontWeight: 600,
                  color: '#111827',
                  mb: 1.5,
                }}
              >
                Turn complex Figma files into a searchable index
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: 3, maxWidth: 460 }}
              >
                From quick local indexing to cloud-powered search and tags.
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handlePrimaryHeroClick}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 3,
                  }}
                >
                  Get started with the Figma plugin
                </Button>
                <Button
                  variant="text"
                  color="primary"
                  onClick={handleSecondaryHeroClick}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 400,
                  }}
                >
                  Explore FigDex Web
                </Button>
              </Stack>
            </Box>

            <Box sx={{ flex: 1, width: '100%' }}>
              <Card
                elevation={2}
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  bgcolor: '#f9fafb',
                }}
              >
                <CardContent
                  sx={{
                    p: 0,
                    minHeight: 260,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#f3f4f6',
                  }}
                >
                  <Box
                    component="img"
                    src="/demos/demo-01.png"
                    alt="Demo 1 – Create index"
                    sx={{
                      width: '100%',
                      maxWidth: 640,
                      aspectRatio: '16 / 9',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </CardContent>
              </Card>
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* 2️⃣ Getting started */}
      <DemoCard
        title="Create an index in seconds"
        description="Paste your Figma file link and instantly generate a structured index of all your pages — no setup required."
        align="left"
        src="/demos/demo-01.png"
        alt="Demo 1 – Create index"
      />

      {/* 3️⃣ Everyday control */}
      <DemoCard
        title="Stay in control as your file grows"
        description="Track indexed, updated, and excluded pages as your project evolves — all directly from the plugin."
        align="right"
        src="/demos/demo-02.png"
        alt="Demo 2 – Page control"
      />

      {/* 4️⃣ FigDex Web upgrade section */}
      <Box
        sx={{
          py: { xs: 5, md: 7 },
          bgcolor: '#f9fafb',
          borderTop: '1px solid #e5e7eb',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={4}>
            <Box>
              <Typography
                variant="overline"
                sx={{
                  color: '#6b7280',
                  letterSpacing: 1,
                  mb: 1,
                  display: 'block',
                }}
              >
                FIGDEX WEB
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontSize: { xs: '1.7rem', md: '2rem' },
                  fontWeight: 600,
                  color: '#111827',
                  mb: 1.5,
                }}
              >
                Unlock tags and cloud-powered search
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ maxWidth: 540 }}
              >
                Connect your plugin to FigDex Web to tag frames, sync your index to
                the cloud, and search across files and teams.
              </Typography>
            </Box>

            <Card
              elevation={1}
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                bgcolor: '#ffffff',
              }}
            >
              <CardContent
                sx={{
                  p: 0,
                  minHeight: 260,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#f3f4f6',
                }}
              >
                <Box
                  component="img"
                  src="/demos/demo-03.png"
                  alt="Demo 3 – Connect & tags"
                  sx={{
                    width: '100%',
                    maxWidth: 720,
                    aspectRatio: '16 / 9',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </CardContent>
            </Card>
          </Stack>
        </Container>
      </Box>

      {/* 5️⃣ Setup reassurance */}
      <DemoCard
        title="Connect to FigDex Web in minutes"
        description="Create an account, generate your API key, and unlock advanced features — no complex setup."
        align="left"
        src="/demos/demo-04.png"
        alt="Demo 4 – Signup & API key"
      />

      {/* 6️⃣ Tags in action */}
      <DemoCard
        title="Organize frames with tags that actually scale"
        description="Use tags to group related frames, improve search accuracy, and keep large design systems easy to navigate."
        align="right"
        src="/demos/demo-05.png"
        alt="Demo 5 – Tags usage"
      />

      {/* 7️⃣ Final CTA */}
      <Box
        sx={{
          py: { xs: 5, md: 7 },
          borderTop: '1px solid #f3f4f6',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              maxWidth: 640,
              textAlign: { xs: 'left', md: 'center' },
              mx: { xs: 0, md: 'auto' },
            }}
          >
            <Typography
              variant="h4"
              sx={{
                fontSize: { xs: '1.7rem', md: '2rem' },
                fontWeight: 600,
                color: '#111827',
                mb: 1.5,
              }}
            >
              Start organizing your Figma files today
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              Use FigDex locally for quick indexing, or connect to FigDex Web when you’re
              ready to scale.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handlePrimaryHeroClick}
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                px: 3,
              }}
            >
              Install the Figma Plugin
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default ProductDemosPage;

