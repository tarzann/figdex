import { NextApiRequest, NextApiResponse } from 'next';
import { WebSocketServer } from 'ws';

// WebSocket server instance
let wss: WebSocketServer | null = null;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!wss) {
    // Create WebSocket server
    wss = new WebSocketServer({ noServer: true });
    
    wss.on('connection', (ws) => {
      console.log('WebSocket client connected');
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('WebSocket message received:', data);
          
          if (data.type === 'upload-index') {
            // Handle upload
            const { indexData, token, fileKey, fileName } = data;
            
            // Save to file system (same as HTTP endpoint)
            const fs = require('fs');
            const path = require('path');
            
            const dataDir = path.join(process.cwd(), 'data');
            if (!fs.existsSync(dataDir)) {
              fs.mkdirSync(dataDir, { recursive: true });
            }
            
            const projectId = fileKey + '-' + Date.now();
            const filePath = path.join(dataDir, `${projectId}.json`);
            
            const uploadData = {
              indexData: indexData,
              figmaFileKey: fileKey,
              fileName: fileName,
              timestamp: new Date().toISOString(),
              projectId: projectId
            };
            
            fs.writeFileSync(filePath, JSON.stringify(uploadData, null, 2));
            
            console.log('Upload saved to:', filePath);
            
            // Send success response
            ws.send(JSON.stringify({
              type: 'upload-success',
              projectId: projectId,
              message: 'Index uploaded successfully'
            }));
            
          } else {
            ws.send(JSON.stringify({
              type: 'upload-error',
              message: 'Unknown message type'
            }));
          }
          
        } catch (error) {
          console.error('WebSocket error:', error);
          ws.send(JSON.stringify({
            type: 'upload-error',
            message: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      });
      
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });
    });
  }
  
  // Handle upgrade to WebSocket
  if (req.headers.upgrade === 'websocket') {
    // @ts-ignore
    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
      wss!.emit('connection', ws, req);
    });
  } else {
    res.status(400).json({ error: 'Expected WebSocket upgrade' });
  }
}

// Cleanup on server shutdown
process.on('SIGTERM', () => {
  if (wss) {
    wss.close();
  }
}); 