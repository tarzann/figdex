import type { AppProps } from 'next/app';
import Head from 'next/head';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import '../styles/globals.css';

// Create emotion cache
const cache = createCache({
  key: 'css',
  prepend: true,
});

// Create theme
const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <CacheProvider value={cache}>
      <Head>
        <title>FigDex - Your Figma Designs, Indexed &amp; Searchable</title>
        <meta name="description" content="Transform your Figma workflow with intelligent frame indexing. Create searchable galleries of your designs." />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="alternate icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <meta name="theme-color" content="#1a1a1a" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Component {...pageProps} />
      </ThemeProvider>
    </CacheProvider>
  );
}
