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

const PrivacyPolicy = () => {
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
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2
            }}
          >
            At FigDex, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
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
            1. Information We Collect
          </Typography>
          
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 400, 
              color: '#1a1a1a', 
              mb: 2,
              fontSize: '1.2rem',
              mt: 3
            }}
          >
            1.1 Account Information
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
            When you create an account, we collect your email address, name (if provided), and authentication information through OAuth providers (e.g., Google).
          </Typography>

          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 400, 
              color: '#1a1a1a', 
              mb: 2,
              fontSize: '1.2rem',
              mt: 3
            }}
          >
            1.2 Design Content
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
            We store the Figma frames, images, and metadata that you choose to index through our Service. This includes frame names, images, text content, and design metadata.
          </Typography>

          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 400, 
              color: '#1a1a1a', 
              mb: 2,
              fontSize: '1.2rem',
              mt: 3
            }}
          >
            1.3 Usage Data
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
            We collect information about how you use the Service, including pages visited, features used, and interactions with the Service. This helps us improve the Service and provide better user experience.
          </Typography>

          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 400, 
              color: '#1a1a1a', 
              mb: 2,
              fontSize: '1.2rem',
              mt: 3
            }}
          >
            1.4 Technical Data
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
            We automatically collect certain technical information, including IP addresses, browser type, device information, and cookies to ensure the Service functions properly and securely.
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
            2. How We Use Your Information
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
            We use the information we collect to:
          </Typography>
          <Box component="ul" sx={{ pl: 4, mb: 2 }}>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              Provide, maintain, and improve the Service
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              Process your requests and transactions
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              Send you service-related communications
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              Detect, prevent, and address technical issues and security threats
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              Comply with legal obligations
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
            3. Data Storage and Security
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
            Your data is stored securely using industry-standard encryption and security measures. We use Supabase for data storage, which provides enterprise-grade security and compliance. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
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
            4. Data Sharing and Disclosure
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
            We do not sell your personal information. We may share your information only in the following circumstances:
          </Typography>
          <Box component="ul" sx={{ pl: 4, mb: 2 }}>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              With your explicit consent
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              With service providers who assist us in operating the Service (e.g., hosting, analytics)
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              To comply with legal obligations or respond to lawful requests
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              To protect our rights, privacy, safety, or property
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
            5. Your Rights and Choices
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
            You have the right to:
          </Typography>
          <Box component="ul" sx={{ pl: 4, mb: 2 }}>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              Access and receive a copy of your personal data
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              Correct inaccurate or incomplete data
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              Delete your account and associated data
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              Object to processing of your personal data
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#666', lineHeight: 1.8, fontWeight: 300, mb: 1 }}>
              Withdraw consent at any time
            </Typography>
          </Box>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontWeight: 300,
              mb: 2,
              mt: 2
            }}
          >
            To exercise these rights, please contact us through{' '}
            <Box component="a" href="/contact" sx={{ color: '#667eea', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
              our contact page
            </Box>
            .
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
            6. Cookies and Tracking Technologies
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
            We use cookies and similar tracking technologies to track activity on our Service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.
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
            7. Data Retention
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
            We retain your personal data for as long as your account is active or as needed to provide you services. If you delete your account, we will delete or anonymize your personal data within 30 days, except where we are required to retain it for legal or regulatory purposes.
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
            8. Children&apos;s Privacy
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
            Our Service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us immediately.
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
            9. International Data Transfers
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
            Your information may be transferred to and maintained on computers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ. By using the Service, you consent to the transfer of your information to these facilities.
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
            10. Changes to This Privacy Policy
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
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. You are advised to review this Privacy Policy periodically for any changes.
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
            11. Contact Us
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
            If you have any questions about this Privacy Policy, please contact us at{' '}
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
            onClick={() => router.push('/terms')}
          >
            Terms of Service
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

export default PrivacyPolicy;

