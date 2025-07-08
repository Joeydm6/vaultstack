// File API client for VaultStack central file server

export interface FileServerConfig {
  baseUrl: string;
  masterPassword: string;
}

export interface FileUploadResponse {
  success: boolean;
  fileId: string;
  name: string;
  size: number;
  type: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  description: string;
  category: string;
  uploadedAt: string;
}

export interface FileListResponse {
  files: FileMetadata[];
}

export interface VaultItemsResponse {
  items: any[];
}

export interface VaultItemUpdateResponse {
  success: boolean;
  itemId: string;
  updatedAt: string;
}

export interface VaultItemDeleteResponse {
  success: boolean;
  itemId: string;
  deletedAt: string;
}

export interface VaultItemsSaveResponse {
  success: boolean;
  itemCount: number;
  savedAt: string;
}

export class FileServerAPI {
  private config: FileServerConfig;

  constructor(config: FileServerConfig) {
    this.config = config;
  }

  private getHeaders(): HeadersInit {
    return {
      'x-master-password': this.config.masterPassword,
      'Content-Type': 'application/json'
    };
  }

  private getFormHeaders(): HeadersInit {
    return {
      'x-master-password': this.config.masterPassword
      // Don't set Content-Type for FormData, let browser set it
    };
  }

  async uploadFile(
    file: File, 
    description?: string, 
    category?: string
  ): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) formData.append('description', description);
    if (category) formData.append('category', category);

    const response = await fetch(`${this.config.baseUrl}/api/files/upload`, {
      method: 'POST',
      headers: this.getFormHeaders(),
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async downloadFile(fileId: string): Promise<Blob> {
    const response = await fetch(`${this.config.baseUrl}/api/files/download/${fileId}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(error.error || 'Download failed');
    }

    return response.blob();
  }

  async listFiles(): Promise<FileListResponse> {
    const response = await fetch(`${this.config.baseUrl}/api/files/list`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to list files' }));
      throw new Error(error.error || 'Failed to list files');
    }

    return response.json();
  }

  async deleteFile(fileId: string): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/api/files/delete/${fileId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Delete failed' }));
      throw new Error(error.error || 'Delete failed');
    }
  }

  async getFileMetadata(fileId: string): Promise<FileMetadata> {
    const response = await fetch(`${this.config.baseUrl}/api/files/${fileId}/metadata`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to get metadata' }));
      throw new Error(error.error || 'Failed to get metadata');
    }

    return response.json();
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${this.config.baseUrl}/api/files/health`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'include',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Health check failed');
    }

    return response.json();
  }

  /**
   * Check if the file server is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      console.log(`🏥 HealthCheck: Checking server at ${this.config.baseUrl}/api/health`);
      const response = await this.healthCheck();
      console.log('🏥 HealthCheck: Response received:', response);
      const isOk = response.status === 'ok';
      console.log(`🏥 HealthCheck: Server ${isOk ? 'AVAILABLE' : 'UNAVAILABLE'}`);
      return isOk;
    } catch (error) {
      console.warn('🏥 HealthCheck: Failed with error:', error);
      return false;
    }
  }

  // Helper method to download file and create download link
  async downloadFileAsUrl(fileId: string, filename: string): Promise<string> {
    const blob = await this.downloadFile(fileId);
    const url = URL.createObjectURL(blob);
    
    // Create temporary download link
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    return url;
  }

  // Helper method to convert file to FileData format for compatibility
  async fileToFileData(file: File): Promise<{
    name: string;
    type: string;
    size: number;
    data: ArrayBuffer;
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          name: file.name,
          type: file.type,
          size: file.size,
          data: reader.result as ArrayBuffer
        });
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Vault Items API methods

  async saveVaultItems(items: any[]): Promise<VaultItemsSaveResponse> {
    const response = await fetch(`${this.config.baseUrl}/api/vault-items`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ items })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to save vault items' }));
      throw new Error(error.error || 'Failed to save vault items');
    }

    return response.json();
  }

  async getVaultItems(): Promise<VaultItemsResponse> {
    const response = await fetch(`${this.config.baseUrl}/api/vault-items`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to get vault items' }));
      throw new Error(error.error || 'Failed to get vault items');
    }

    return response.json();
  }

  async updateVaultItem(itemId: string, item: any): Promise<VaultItemUpdateResponse> {
    const response = await fetch(`${this.config.baseUrl}/api/vault-items/${itemId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ item })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update vault item' }));
      throw new Error(error.error || 'Failed to update vault item');
    }

    return response.json();
  }

  async deleteVaultItem(itemId: string): Promise<VaultItemDeleteResponse> {
    const response = await fetch(`${this.config.baseUrl}/api/vault-items/${itemId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete vault item' }));
      throw new Error(error.error || 'Failed to delete vault item');
    }

    return response.json();
  }
}

// Singleton instance for easy access
let fileServerAPI: FileServerAPI | null = null;

export function getFileServerAPI(masterPassword: string): FileServerAPI {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://files.toolstack.nl' // Your production file server URL
    : 'http://localhost:3004'; // Development server

  if (!fileServerAPI || fileServerAPI['config'].masterPassword !== masterPassword) {
    fileServerAPI = new FileServerAPI({ baseUrl, masterPassword });
  }

  return fileServerAPI;
}

// Clear API instance (useful for logout)
export function clearFileServerAPI(): void {
  fileServerAPI = null;
}