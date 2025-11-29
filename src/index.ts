/**
 * Example Express server for handling chunk uploads
 * This is a basic implementation showing how to handle chunks on the server side
 */

import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const upload = multer({ dest: 'uploads/chunks/' });

// Store upload metadata
const uploads = new Map<string, {
  fileName: string;
  fileSize: number;
  totalChunks: number;
  receivedChunks: Set<number>;
}>();

app.use(cors({ origin: '*' }));

// Endpoint to receive chunks
app.post('/upload', upload.single('chunk'), (req: any, res: any) => {
  try {
    const metadata = JSON.parse(req.body.metadata);
    const { uploadId, chunkIndex, totalChunks, fileName, fileSize } = metadata;

    // Initialize upload tracking if needed
    if (!uploads.has(uploadId)) {
      uploads.set(uploadId, {
        fileName,
        fileSize,
        totalChunks,
        receivedChunks: new Set(),
      });
    }

    const uploadInfo = uploads.get(uploadId)!;

    // Save chunk with proper naming
    const chunkPath = path.join('uploads/chunks', `${uploadId}-chunk-${chunkIndex}`);
    fs.renameSync(req.file!.path, chunkPath);

    uploadInfo.receivedChunks.add(chunkIndex);

    // Check if all chunks received
    if (uploadInfo.receivedChunks.size === totalChunks) {
      // Merge chunks into final file
      mergeChunks(uploadId, uploadInfo);
      uploads.delete(uploadId);

      return res.json({
        success: true,
        message: 'File upload completed',
        uploadId,
      });
    }

    res.json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} received`,
      uploadId,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Chunk upload failed',
    });
  }
});

// Endpoint to check upload status (for resuming)
app.get('/upload-status/:uploadId', (req, res) => {
  const { uploadId } = req.params;
  const uploadInfo = uploads.get(uploadId);

  if (!uploadInfo) {
    return res.status(404).json({
      success: false,
      message: 'Upload not found',
    });
  }

  res.json({
    success: true,
    uploadId,
    totalChunks: uploadInfo.totalChunks,
    receivedChunks: Array.from(uploadInfo.receivedChunks),
    progress: (uploadInfo.receivedChunks.size / uploadInfo.totalChunks) * 100,
  });
  return
});

// Helper function to merge chunks
function mergeChunks(uploadId: string, uploadInfo: any) {
  // Generate hash from original filename + timestamp for uniqueness
  const hash = crypto
    .createHash('sha256')
    .update(uploadInfo.fileName + Date.now())
    .digest('hex')
    .substring(0, 16);

  // Get file extension
  const ext = path.extname(uploadInfo.fileName);
  const hashedFileName = `${hash}${ext}`;

  const finalPath = path.join('uploads/files', hashedFileName);

  // Create directory if it doesn't exist
  fs.mkdirSync(path.dirname(finalPath), { recursive: true });

  const writeStream = fs.createWriteStream(finalPath);

  for (let i = 0; i < uploadInfo.totalChunks; i++) {
    const chunkPath = path.join('uploads/chunks', `${uploadId}-chunk-${i}`);
    const chunkBuffer = fs.readFileSync(chunkPath);
    writeStream.write(chunkBuffer);
    fs.unlinkSync(chunkPath); // Clean up chunk
  }

  writeStream.end();
  console.log(`File merged successfully: ${finalPath}`);
  console.log(`Original: ${uploadInfo.fileName} -> Hashed: ${hashedFileName}`);
}

// Create necessary directories
fs.mkdirSync('uploads/chunks', { recursive: true });
fs.mkdirSync('uploads/files', { recursive: true });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Chunk upload server listening on port ${PORT}`);
});
