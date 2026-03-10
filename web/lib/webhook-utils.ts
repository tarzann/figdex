/**
 * Utilities for handling webhook requests with raw body
 */

import type { NextApiRequest } from 'next';

/**
 * Get raw body from Next.js API request
 * Required for webhook signature verification
 * 
 * Note: When bodyParser is disabled (bodyParser: false), Next.js doesn't parse the body,
 * so we need to read the stream ourselves. However, if the body was already read,
 * we need to handle that case as well.
 */
export async function getRawBody(req: NextApiRequest): Promise<Buffer | string> {
  // If body is already parsed as a string/buffer, return it
  if (typeof req.body === 'string') {
    return req.body;
  }
  
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  // Otherwise, read from stream
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    req.on('error', (error) => {
      reject(error);
    });
  });
}

