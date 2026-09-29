import { API_CONFIG } from '../api/config';

export async function uploadSingleFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const res = await fetch(`${API_CONFIG.BASE_URL}/upload/single`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload file');
  }

  const data = await res.json();
  return data.url;
}

export async function uploadMultipleFiles(files: FileList | File[]): Promise<string[]> {
  const formData = new FormData();
  Array.from(files).forEach((file) => {
    formData.append('files', file);
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const res = await fetch(`${API_CONFIG.BASE_URL}/upload/multiple`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload files');
  }

  const data = await res.json();
  return data.urls || (data.files ? data.files.map((f: any) => f.url) : []);
}
