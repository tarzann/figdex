/**
 * Paddle Checkout Hook
 * Handles Paddle checkout initialization and opening checkout
 */

import { useEffect, useRef, useState, useCallback } from 'react';

let paddleInstance: any = null;
let paddleInitializing = false;

/**
 * Initialize Paddle (call once on app load)
 */
export async function initializePaddle(): Promise<any> {
  if (paddleInstance) {
    return paddleInstance;
  }

  if (paddleInitializing) {
    // Wait for initialization to complete
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (paddleInstance) {
          clearInterval(checkInterval);
          resolve(paddleInstance);
        }
      }, 100);
    });
  }

  paddleInitializing = true;

  try {
    // Get Paddle config from API
    const response = await fetch('/api/payment/get-paddle-config');
    const data = await response.json();

    if (!data.success) {
      throw new Error('Failed to get Paddle configuration');
    }

    const { publicKey, environment } = data.config;

    // Dynamically import @paddle/paddle-js
    const paddle = await import('@paddle/paddle-js');

    // Initialize Paddle
    paddleInstance = await paddle.initializePaddle({
      environment: environment === 'production' ? 'production' : 'sandbox',
      token: publicKey,
    });

    paddleInitializing = false;
    return paddleInstance;
  } catch (error) {
    console.error('Error initializing Paddle:', error);
    paddleInitializing = false;
    throw error;
  }
}

/**
 * Hook for using Paddle checkout
 */
export function usePaddleCheckout() {
  const [isReady, setIsReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    // Initialize Paddle on mount
    const init = async () => {
      if (paddleInstance) {
        setIsReady(true);
        return;
      }

      setIsInitializing(true);
      try {
        await initializePaddle();
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize Paddle:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, []);

  const openCheckout = useCallback(async (
    priceId: string,
    options?: {
      userId?: string;
      userEmail?: string;
      onSuccess?: (data: any) => void;
      onError?: (error: any) => void;
    }
  ) => {
    try {
      // Ensure Paddle is initialized
      if (!paddleInstance) {
        await initializePaddle();
      }

      if (!paddleInstance) {
        throw new Error('Paddle not initialized');
      }

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const successUrl = `${baseUrl}/account?paddle_success=true`;

      const checkoutData: any = {
        items: [{ priceId, quantity: 1 }],
        settings: {
          displayMode: 'overlay',
          theme: 'light',
          locale: 'en',
          allowQuantity: false,
          successUrl: successUrl,
        },
        eventCallback: (data: any) => {
          if (data.name === 'checkout.completed') {
            console.log('Paddle checkout completed:', data);
            if (options?.onSuccess) {
              options.onSuccess(data.data);
            }
            // Redirect to success URL after a short delay
            setTimeout(() => {
              if (typeof window !== 'undefined') {
                window.location.href = successUrl;
              }
            }, 1000);
          }
        },
      };

      // Add custom data if user ID provided
      if (options?.userId) {
        checkoutData.customData = { user_id: options.userId };
      }

      // Add customer email if provided
      if (options?.userEmail) {
        checkoutData.customer = { email: options.userEmail };
      }

      paddleInstance.Checkout.open(checkoutData);
    } catch (error) {
      console.error('Error opening Paddle checkout:', error);
      if (options?.onError) {
        options.onError(error);
      } else {
        alert('Failed to open checkout. Please try again.');
      }
    }
  }, []);

  return { openCheckout, isReady, isInitializing };
}

