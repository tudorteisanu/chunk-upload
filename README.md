# Chunk Upload Service

A robust, TypeScript-based chunk upload service that enables large file uploads by splitting them into smaller chunks. Perfect for handling large files with progress tracking, automatic retries, and resume capabilities.

## Features

- 🚀 **Chunked Upload**: Split large files into manageable chunks
- 📊 **Progress Tracking**: Real-time upload progress callbacks
- 🔄 **Auto Retry**: Automatic retry with exponential backoff
- ⏸️ **Resume Support**: Resume interrupted uploads
- 🎯 **TypeScript**: Full TypeScript support with type definitions
- ⚡ **Customizable**: Configurable chunk size and retry logic
- 🎨 **Framework Agnostic**: Works with any JavaScript framework

## Installation

```bash
npm install chunk-upload-service
```

Or with yarn:

```bash
yarn add chunk-upload-service
```

## Quick Start

### Basic Usage

```typescript
import { ChunkUploadService } from 'chunk-upload-service';

const uploadService = new ChunkUploadService({
  chunkSize: 1024 * 1024, // 1MB chunks
  maxRetries: 3,
  onProgress: (progress) => {
    console.log(`Upload progress: ${progress.percentage.toFixed(2)}%`);
  }
});

// Upload a file
const file = document.getElementById('fileInput').files[0];
const result = await uploadService.uploadFile(
  file, 
  'https://your-api.com/upload'
);

if (result.success) {
  console.log('Upload completed!', result.uploadId);
}
```

## API Reference

### ChunkUploadService

#### Constructor Options

```typescript
interface ChunkUploadOptions {
  chunkSize?: number;        // Size of each chunk in bytes (default: 1MB)
  maxRetries?: number;       // Maximum retries per chunk (default: 3)
  onProgress?: (progress: UploadProgress) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  onError?: (error: Error, chunkIndex: number) => void;
}
```

#### Methods

##### uploadFile(file, uploadUrl, uploadId?)

Upload a file in chunks.

```typescript
async uploadFile(
  file: File,
  uploadUrl: string,
  uploadId?: string
): Promise<{ success: boolean; uploadId: string; message?: string }>
```

**Parameters:**
- `file`: The File object to upload
- `uploadUrl`: The endpoint URL to send chunks to
- `uploadId`: Optional upload ID for resuming

**Returns:** Promise with upload result

##### resumeUpload(file, uploadUrl, uploadId, completedChunks)

Resume an interrupted upload.

```typescript
async resumeUpload(
  file: File,
  uploadUrl: string,
  uploadId: string,
  completedChunks: number[]
): Promise<{ success: boolean; uploadId: string; message?: string }>
```

##### calculateTotalChunks(fileSize)

Calculate the number of chunks for a given file size.

```typescript
calculateTotalChunks(fileSize: number): number
```

## Usage Examples

### Example 1: Upload with Progress Bar

```typescript
import { ChunkUploadService } from 'chunk-upload-service';

async function uploadWithProgressBar(file: File) {
  const progressBar = document.getElementById('progressBar') as HTMLProgressElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;

  const uploadService = new ChunkUploadService({
    chunkSize: 2 * 1024 * 1024, // 2MB chunks
    onProgress: (progress) => {
      progressBar.value = progress.percentage;
      statusDiv.textContent = `${progress.percentage.toFixed(1)}% - Chunk ${progress.currentChunk}/${progress.totalChunks}`;
    },
    onChunkComplete: (chunkIndex, totalChunks) => {
      console.log(`Chunk ${chunkIndex + 1}/${totalChunks} completed`);
    },
    onError: (error, chunkIndex) => {
      console.error(`Chunk ${chunkIndex} failed:`, error.message);
    }
  });

  const result = await uploadService.uploadFile(file, '/api/upload');
  
  if (result.success) {
    statusDiv.textContent = 'Upload completed!';
  } else {
    statusDiv.textContent = `Failed: ${result.message}`;
  }
}
```

### Example 2: Resume Interrupted Upload

```typescript
async function resumeInterruptedUpload(file: File) {
  const uploadId = localStorage.getItem('uploadId');
  const completedChunks = JSON.parse(localStorage.getItem('completedChunks') || '[]');

  const uploadService = new ChunkUploadService({
    onChunkComplete: (chunkIndex, totalChunks) => {
      // Save progress
      completedChunks.push(chunkIndex);
      localStorage.setItem('completedChunks', JSON.stringify(completedChunks));
    }
  });

  if (uploadId && completedChunks.length > 0) {
    // Resume upload
    const result = await uploadService.resumeUpload(
      file,
      '/api/upload',
      uploadId,
      completedChunks
    );
    console.log('Upload resumed:', result);
  } else {
    // New upload
    const result = await uploadService.uploadFile(file, '/api/upload');
    localStorage.setItem('uploadId', result.uploadId);
  }
}
```

### Example 3: React Integration

```typescript
import React, { useState } from 'react';
import { ChunkUploadService, UploadProgress } from 'chunk-upload-service';

function FileUploader() {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const uploadService = new ChunkUploadService({
      chunkSize: 1024 * 1024, // 1MB
      onProgress: setProgress,
    });

    try {
      const result = await uploadService.uploadFile(file, '/api/upload');
      if (result.success) {
        alert('Upload successful!');
      } else {
        alert(`Upload failed: ${result.message}`);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileUpload} disabled={uploading} />
      {progress && (
        <div>
          <progress value={progress.percentage} max={100} />
          <p>{progress.percentage.toFixed(1)}% - Chunk {progress.currentChunk}/{progress.totalChunks}</p>
        </div>
      )}
    </div>
  );
}
```

### Example 4: Vue Integration

```vue
<template>
  <div>
    <input type="file" @change="handleFileUpload" :disabled="uploading" />
    <div v-if="progress">
      <progress :value="progress.percentage" max="100"></progress>
      <p>{{ progress.percentage.toFixed(1) }}% - Chunk {{ progress.currentChunk }}/{{ progress.totalChunks }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ChunkUploadService, UploadProgress } from 'chunk-upload-service';

const progress = ref<UploadProgress | null>(null);
const uploading = ref(false);

const handleFileUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  uploading.value = true;

  const uploadService = new ChunkUploadService({
    chunkSize: 1024 * 1024,
    onProgress: (p) => { progress.value = p; },
  });

  try {
    const result = await uploadService.uploadFile(file, '/api/upload');
    if (result.success) {
      alert('Upload successful!');
    }
  } finally {
    uploading.value = false;
  }
};
</script>
```

## Server-Side Implementation

### Express.js Example

```typescript
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const app = express();
const upload = multer({ dest: 'uploads/chunks/' });

const uploads = new Map();

app.post('/upload', upload.single('chunk'), (req, res) => {
  const metadata = JSON.parse(req.body.metadata);
  const { uploadId, chunkIndex, totalChunks, fileName } = metadata;

  // Initialize upload tracking
  if (!uploads.has(uploadId)) {
    uploads.set(uploadId, {
      fileName,
      totalChunks,
      receivedChunks: new Set(),
    });
  }

  const uploadInfo = uploads.get(uploadId);
  
  // Save chunk
  const chunkPath = path.join('uploads/chunks', `${uploadId}-chunk-${chunkIndex}`);
  fs.renameSync(req.file.path, chunkPath);
  uploadInfo.receivedChunks.add(chunkIndex);

  // Check if complete
  if (uploadInfo.receivedChunks.size === totalChunks) {
    mergeChunks(uploadId, uploadInfo);
    uploads.delete(uploadId);
    return res.json({ success: true, message: 'Upload complete' });
  }

  res.json({ success: true, message: 'Chunk received' });
});

function mergeChunks(uploadId: string, uploadInfo: any) {
  const finalPath = path.join('uploads/files', uploadInfo.fileName);
  const writeStream = fs.createWriteStream(finalPath);

  for (let i = 0; i < uploadInfo.totalChunks; i++) {
    const chunkPath = path.join('uploads/chunks', `${uploadId}-chunk-${i}`);
    const chunkBuffer = fs.readFileSync(chunkPath);
    writeStream.write(chunkBuffer);
    fs.unlinkSync(chunkPath);
  }

  writeStream.end();
}

app.listen(3000, () => console.log('Server running on port 3000'));
```

## Types

```typescript
interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  currentChunk: number;
  totalChunks: number;
}

interface ChunkMetadata {
  chunkIndex: number;
  totalChunks: number;
  fileName: string;
  fileSize: number;
  chunkSize: number;
  uploadId?: string;
}
```

## Configuration

### Chunk Size

Choose chunk size based on your use case:
- **Small files (< 10MB)**: 512KB - 1MB
- **Medium files (10MB - 100MB)**: 1MB - 2MB
- **Large files (> 100MB)**: 2MB - 5MB

```typescript
const uploadService = new ChunkUploadService({
  chunkSize: 2 * 1024 * 1024 // 2MB
});
```

### Retry Strategy

Configure retry behavior:

```typescript
const uploadService = new ChunkUploadService({
  maxRetries: 5, // Retry up to 5 times
  onError: (error, chunkIndex) => {
    console.error(`Chunk ${chunkIndex} failed after retries:`, error);
  }
});
```

## Best Practices

1. **Save Upload State**: Store `uploadId` and completed chunks to enable resume functionality
2. **Handle Errors**: Implement proper error handling in callbacks
3. **Optimize Chunk Size**: Balance between network efficiency and memory usage
4. **Show Progress**: Provide visual feedback to users during upload
5. **Clean Up**: Clear saved state after successful upload

## Browser Support

- Chrome/Edge: Latest
- Firefox: Latest
- Safari: Latest
- Opera: Latest

Requires support for:
- File API
- Fetch API
- FormData

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on GitHub.
