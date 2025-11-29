/**
 * Example client-side usage of ChunkUploadService
 */

import { ChunkUploadService } from '../ChunkUploadService';

// Example 1: Basic upload with progress tracking
export async function basicUpload(file: File) {
  const uploadService = new ChunkUploadService({
    chunkSize: 1024 * 1024, // 1MB chunks
    maxRetries: 3,
    onProgress: (progress) => {
      console.log(`Upload progress: ${progress.percentage.toFixed(2)}%`);
      console.log(`Chunk ${progress.currentChunk}/${progress.totalChunks}`);
      console.log(`Uploaded: ${progress.uploadedBytes}/${progress.totalBytes} bytes`);
    },
    onChunkComplete: (chunkIndex, totalChunks) => {
      console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`);
    },
    onError: (error, chunkIndex) => {
      console.error(`Error uploading chunk ${chunkIndex}:`, error.message);
    },
  });

  const result = await uploadService.uploadFile(file, 'http://localhost:3000/upload');

  if (result.success) {
    console.log('Upload completed!', result);
  } else {
    console.error('Upload failed:', result.message);
  }

  return result;
}

// Example 2: Upload with custom UI updates
export async function uploadWithUI(file: File, progressBar: HTMLProgressElement, statusDiv: HTMLDivElement) {
  const uploadService = new ChunkUploadService({
    chunkSize: 2 * 1024 * 1024, // 2MB chunks
    onProgress: (progress) => {
      progressBar.value = progress.percentage;
      statusDiv.textContent = `Uploading: ${progress.percentage.toFixed(1)}% - Chunk ${progress.currentChunk}/${progress.totalChunks}`;
    },
  });

  const result = await uploadService.uploadFile(file, 'http://localhost:3000/upload');

  if (result.success) {
    statusDiv.textContent = 'Upload completed successfully!';
    statusDiv.style.color = 'green';
  } else {
    statusDiv.textContent = `Upload failed: ${result.message}`;
    statusDiv.style.color = 'red';
  }

  return result;
}

// Example 3: Resume interrupted upload
export async function resumeUpload(file: File, uploadId: string, completedChunks: number[]) {
  const uploadService = new ChunkUploadService({
    chunkSize: 1024 * 1024,
    onProgress: (progress) => {
      console.log(`Resuming upload: ${progress.percentage.toFixed(2)}%`);
    },
  });

  const result = await uploadService.resumeUpload(
    file,
    'http://localhost:3000/upload',
    uploadId,
    completedChunks
  );

  return result;
}

// Example 4: HTML form integration
export function setupFileUploadForm() {
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  const uploadButton = document.getElementById('uploadButton') as HTMLButtonElement;
  const progressBar = document.getElementById('progressBar') as HTMLProgressElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;

  uploadButton.addEventListener('click', async () => {
    const file = fileInput.files?.[0];
    if (!file) {
      alert('Please select a file');
      return;
    }

    uploadButton.disabled = true;
    progressBar.value = 0;
    statusDiv.textContent = 'Starting upload...';

    const uploadService = new ChunkUploadService({
      chunkSize: 1024 * 1024, // 1MB
      onProgress: (progress) => {
        progressBar.value = progress.percentage;
        statusDiv.textContent = `Uploading: ${progress.percentage.toFixed(1)}%`;
      },
    });

    try {
      const result = await uploadService.uploadFile(file, 'http://localhost:3000/upload');

      if (result.success) {
        statusDiv.textContent = '✓ Upload completed!';
        statusDiv.style.color = 'green';
        // Save uploadId for potential resume
        localStorage.setItem('lastUploadId', result.uploadId);
      } else {
        statusDiv.textContent = `✗ Upload failed: ${result.message}`;
        statusDiv.style.color = 'red';
      }
    } catch (error) {
      statusDiv.textContent = `✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      statusDiv.style.color = 'red';
    } finally {
      uploadButton.disabled = false;
    }
  });
}

// Example 5: Calculate chunks before upload
export function showUploadDetails(file: File) {
  const uploadService = new ChunkUploadService({
    chunkSize: 1024 * 1024, // 1MB
  });

  const totalChunks = uploadService.calculateTotalChunks(file.size);

  console.log(`File: ${file.name}`);
  console.log(`Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Total chunks: ${totalChunks}`);
  console.log(`Chunk size: 1 MB`);

  return totalChunks;
}
