import React from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Divider
} from '@mui/material';
import PublicSiteHeader from '../components/PublicSiteHeader';

const TermsOfService = () => {
  const router = useRouter();
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FFFFFF' }}>
      <PublicSiteHeader />

      {/* Content */}
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 }, pb: 12 }}>
        
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#999', 
            mb: 6,
            fontWeight: 300
          }}
        >
          Last updated: December 3, 2024
        </Typography>

        <Divider sx={{ mb: 6 }} />

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
            1. Acceptance of Terms
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            By accessing and using FigDex (&quot;the Service&quot;), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </Typography>
        </Box>

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
            2. Description of Service
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            FigDex is a design index management platform that enables users to organize, search, and share Figma design frames. The Service includes web-based gallery interfaces, Figma plugin integration, and REST API access.
          </Typography>
        </Box>

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
            3. User Accounts
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. We reserve the right to suspend or terminate accounts that violate these terms.
          </Typography>
        </Box>

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
            4. Acceptable Use
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            You agree not to use the Service to:
          </Typography>
          <Box component="ul" sx={{ pl: 4, mb: 2 }}>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              Upload, store, or share any content that is illegal, harmful, or violates intellectual property rights
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              Attempt to gain unauthorized access to the Service or its related systems
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              Use the Service in any way that could damage, disable, or impair the Service
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              Automate access to the Service in a manner that exceeds reasonable usage limits
            </Typography>
          </Box>
        </Box>

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
            5. Subscription Plans and Billing
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            FigDex offers free and paid subscription plans. Paid subscriptions are billed monthly or annually as selected. You may cancel your subscription at any time. Refunds are provided at our discretion and in accordance with applicable law.
          </Typography>
        </Box>

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
            6. Intellectual Property
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            You retain all rights to the content you upload to FigDex. By using the Service, you grant FigDex a limited license to store, process, and display your content solely for the purpose of providing the Service. FigDex and its original content, features, and functionality are owned by FigDex and are protected by international copyright, trademark, and other intellectual property laws.
          </Typography>
        </Box>

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
            7. Data Storage and Retention
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            We store your data securely and in accordance with our Privacy Policy. You may delete your account and associated data at any time. We reserve the right to delete inactive accounts and data after a reasonable period of inactivity.
          </Typography>
        </Box>

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
            8. Service Availability
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            We strive to maintain high availability of the Service but do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, updates, or unforeseen circumstances. We are not liable for any loss or damage resulting from Service unavailability.
          </Typography>
        </Box>

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
            9. Limitation of Liability
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            To the maximum extent permitted by law, FigDex shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
          </Typography>
        </Box>

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
            10. Changes to Terms
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            We reserve the right to modify these terms at any time. We will notify users of material changes via email or through the Service. Continued use of the Service after such modifications constitutes acceptance of the updated terms.
          </Typography>
        </Box>

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
            11. Contact Information
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            If you have any questions about these Terms of Service, please contact us at{' '}
            <Box component="a" href="/contact" sx={{ color: '#667eea', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
              our contact page
            </Box>
            {' '}or via email.
          </Typography>
        </Box>

        <Divider sx={{ my: 6 }} />

        <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
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
            onClick={() => router.push('/privacy')}
          >
            Privacy Policy
          </Button>
          <Button
            variant="contained"
            sx={{ 
              bgcolor: '#1a1a1a',
              color: '#fff',
              textTransform: 'none',
              borderRadius: 0,
              '&:hover': { 
                bgcolor: '#333'
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

export default TermsOfService;
