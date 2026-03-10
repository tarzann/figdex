import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb'
    }
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!serviceUrl || !serviceKey) {
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }
  const supabaseAdmin = createClient(serviceUrl, serviceKey);

  // Simple auth with same API key model
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'API key required' });
  }
  const apiKey = authHeader.replace('Bearer ', '');
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('api_key', apiKey)
    .single();
  if (userError || !user) {
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }

  const indexId = (req.query.id as string) || (req.body && (req.body as any).id);
  if (!indexId) {
    return res.status(400).json({ success: false, error: 'Missing id' });
  }

  try {
    // Load index row
    const { data: idx, error: idxErr } = await supabaseAdmin
      .from('index_files')
      .select('id, index_data, figma_file_key, file_name')
      .eq('id', indexId)
      .single();
    if (idxErr || !idx) {
      return res.status(404).json({ success: false, error: 'Index not found' });
    }

    const bucket = 'figdex-uploads';
    // Load JSON from storage (pointer expected)
    if (!idx.index_data || typeof idx.index_data !== 'object' || !idx.index_data.storageRef) {
      return res.status(200).json({ success: true, message: 'No storageRef JSON to process' });
    }
    const [bkt, ...pParts] = String(idx.index_data.storageRef).split(':');
    const jsonPath = pParts.join(':');
    const dl = await (supabaseAdmin as any).storage.from(bkt).download(jsonPath);
    if (dl?.error) {
      return res.status(500).json({ success: false, error: 'Failed to download JSON from storage' });
    }
    const txt = await dl.data.text();
    const pages = JSON.parse(txt || '[]');

    const decodeDataUri = (uri: string) => {
      const match = /^data:(.+?);base64,(.+)$/i.exec(uri || '');
      if (!match) return null;
      const mime = match[1];
      const b64 = match[2];
      try {
        return { mime, buffer: Buffer.from(b64, 'base64') };
      } catch {
        return null;
      }
    };

    let totalImageBytes = 0;
    const ensureUuid = () => (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));

    // Walk and offload images to storage with compression
    for (const page of pages) {
      if (!Array.isArray(page?.frames)) continue;
      for (const frame of page.frames) {
        if (!frame || !frame.image || typeof frame.image !== 'string') continue;
        const decoded = decodeDataUri(frame.image);
        if (!decoded) continue;
        if (!/^image\/(png|jpeg|jpg)$/i.test(decoded.mime)) continue;
        let buf = decoded.buffer as Buffer;
        try {
          const sharp = (await import('sharp')).default;
          if (decoded.mime.toLowerCase().includes('png')) {
            buf = await sharp(buf).png({ compressionLevel: 9 }).toBuffer();
          } else {
            buf = await sharp(buf).jpeg({ quality: 100 }).toBuffer();
          }
        } catch {}
        const ext = decoded.mime.toLowerCase().includes('png') ? 'png' : 'jpg';
        const imgPath = `indices/${indexId}/images/${ensureUuid()}.${ext}`;
        const upImg = await (supabaseAdmin as any).storage.from(bucket).upload(imgPath, new Blob([new Uint8Array(buf)]), {
          upsert: true,
          contentType: decoded.mime,
          cacheControl: '31536000'
        });
        if (upImg && !upImg.error) {
          totalImageBytes += buf.byteLength;
          frame.image = { storageRef: `${bucket}:${imgPath}` };
        }
      }
    }

    // Save optimized JSON back to storage (overwrite)
    const optimized = JSON.stringify(pages);
    await (supabaseAdmin as any).storage.from(bucket).upload(jsonPath, new Blob([optimized], { type: 'application/json' }), {
      upsert: true,
      contentType: 'application/json'
    });

    // Update file_size
    const newSize = Buffer.byteLength(optimized, 'utf8') + totalImageBytes;
    await supabaseAdmin.from('index_files').update({ file_size: newSize }).eq('id', indexId);

    return res.status(200).json({ success: true, processed: true, indexId });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Processing failed' });
  }
}


