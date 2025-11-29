export interface ChunkUploadOptions {
  chunkSize?: number; // Size of each chunk in bytes (default: 1MB)
  maxRetries?: number; // Maximum number of retries per chunk (default: 3)
  onProgress?: (progress: UploadProgress) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  onError?: (error: Error, chunkIndex: number) => void;
}

export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  currentChunk: number;
  totalChunks: number;
}

export interface ChunkMetadata {
  chunkIndex: number;
  totalChunks: number;
  fileName: string;
  fileSize: number;
  chunkSize: number;
  uploadId?: string;
}

export class ChunkUploadService {
  private readonly chunkSize: number;
  private readonly maxRetries: number;
  private readonly onProgress?: (progress: UploadProgress) => void;
  private readonly onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  private readonly onError?: (error: Error, chunkIndex: number) => void;

  constructor(options: ChunkUploadOptions = {}) {
    this.chunkSize = options.chunkSize || 1024 * 1024; // Default 1MB
    this.maxRetries = options.maxRetries || 3;
    this.onProgress = options.onProgress;
    this.onChunkComplete = options.onChunkComplete;
    this.onError = options.onError;
  }

  /**
   * Upload a file in chunks
   * @param file - The file to upload
   * @param uploadUrl - The URL endpoint to upload chunks to
   * @param uploadId - Optional upload ID for resuming uploads
   * @returns Promise resolving to the upload result
   */
  async uploadFile(
    file: File,
    uploadUrl: string,
    uploadId?: string
  ): Promise<{ success: boolean; uploadId: string; message?: string }> {
    const totalChunks = Math.ceil(file.size / this.chunkSize);
    let uploadedBytes = 0;

    // Generate or use provided uploadId
    const currentUploadId = uploadId || this.generateUploadId();

    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * this.chunkSize;
        const end = Math.min(start + this.chunkSize, file.size);
        const chunk = file.slice(start, end);

        const metadata: ChunkMetadata = {
          chunkIndex,
          totalChunks,
          fileName: file.name,
          fileSize: file.size,
          chunkSize: chunk.size,
          uploadId: currentUploadId,
        };

        await this.uploadChunkWithRetry(chunk, uploadUrl, metadata);

        uploadedBytes += chunk.size;

        // Emit progress
        if (this.onProgress) {
          this.onProgress({
            uploadedBytes,
            totalBytes: file.size,
            percentage: (uploadedBytes / file.size) * 100,
            currentChunk: chunkIndex + 1,
            totalChunks,
          });
        }

        // Emit chunk complete
        if (this.onChunkComplete) {
          this.onChunkComplete(chunkIndex, totalChunks);
        }
      }

      return {
        success: true,
        uploadId: currentUploadId,
        message: 'File uploaded successfully',
      };
    } catch (error) {
      return {
        success: false,
        uploadId: currentUploadId,
        message: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Upload a single chunk with retry logic
   */
  private async uploadChunkWithRetry(
    chunk: Blob,
    uploadUrl: string,
    metadata: ChunkMetadata
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        await this.uploadChunk(chunk, uploadUrl, metadata);
        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < this.maxRetries - 1) {
          // Wait before retrying (exponential backoff)
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    // All retries failed
    if (this.onError && lastError) {
      this.onError(lastError, metadata.chunkIndex);
    }
    throw lastError || new Error('Upload failed after retries');
  }

  /**
   * Upload a single chunk
   */
  private async uploadChunk(
    chunk: Blob,
    uploadUrl: string,
    metadata: ChunkMetadata
  ): Promise<void> {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }
  }

  /**
   * Resume an incomplete upload
   * @param file - The file to resume uploading
   * @param uploadUrl - The URL endpoint
   * @param uploadId - The upload ID to resume
   * @param completedChunks - Array of completed chunk indices
   */
  async resumeUpload(
    file: File,
    uploadUrl: string,
    uploadId: string,
    completedChunks: number[]
  ): Promise<{ success: boolean; uploadId: string; message?: string }> {
    const totalChunks = Math.ceil(file.size / this.chunkSize);
    let uploadedBytes = completedChunks.length * this.chunkSize;

    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        // Skip already uploaded chunks
        if (completedChunks.includes(chunkIndex)) {
          continue;
        }

        const start = chunkIndex * this.chunkSize;
        const end = Math.min(start + this.chunkSize, file.size);
        const chunk = file.slice(start, end);

        const metadata: ChunkMetadata = {
          chunkIndex,
          totalChunks,
          fileName: file.name,
          fileSize: file.size,
          chunkSize: chunk.size,
          uploadId,
        };

        await this.uploadChunkWithRetry(chunk, uploadUrl, metadata);

        uploadedBytes += chunk.size;

        // Emit progress
        if (this.onProgress) {
          this.onProgress({
            uploadedBytes,
            totalBytes: file.size,
            percentage: (uploadedBytes / file.size) * 100,
            currentChunk: chunkIndex + 1,
            totalChunks,
          });
        }

        // Emit chunk complete
        if (this.onChunkComplete) {
          this.onChunkComplete(chunkIndex, totalChunks);
        }
      }

      return {
        success: true,
        uploadId,
        message: 'File upload resumed and completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        uploadId,
        message: error instanceof Error ? error.message : 'Resume upload failed',
      };
    }
  }

  /**
   * Generate a unique upload ID
   */
  private generateUploadId(): string {
    return `upload-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate the number of chunks for a given file size
   */
  calculateTotalChunks(fileSize: number): number {
    return Math.ceil(fileSize / this.chunkSize);
  }
}
