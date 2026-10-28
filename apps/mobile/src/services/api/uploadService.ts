import { ENV_CONFIG } from '../../constants/config';
import { authStorage } from '../storage/authStorage';

/**
 * Universal Mobile File Upload Service
 * Bypasses Expo/fetch WinterCG strict FormDataPart errors by using React Native's native XMLHttpRequest bridge,
 * with automatic fallback to standard Web Blob upload.
 */
export const uploadMediaFile = async (localUri: string, overrideName?: string, overrideType?: string): Promise<string> => {
  if (!localUri) {
    throw new Error('No media URI provided for upload.');
  }

  // If already remote URL, return directly
  if (localUri.startsWith('http://') || localUri.startsWith('https://')) {
    return localUri;
  }

  const isVideo =
    localUri.toLowerCase().endsWith('.mp4') ||
    localUri.toLowerCase().endsWith('.mov') ||
    localUri.toLowerCase().endsWith('.webm');
  
  const defaultExt = isVideo ? 'mp4' : 'jpg';
  const filename = overrideName || localUri.split('/').pop() || `upload_${Date.now()}.${defaultExt}`;
  const mimeType = overrideType || (isVideo ? 'video/mp4' : 'image/jpeg');

  const token = await authStorage.getToken();
  const targetUrl = `${ENV_CONFIG.API_BASE_URL}/upload/single`;

  // 1. Try React Native native bridge XMLHttpRequest (bypasses expo/fetch WinterCG serializer)
  try {
    return await new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', targetUrl);
      xhr.timeout = 60000;

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            const resolvedUrl = data.url || data.file?.url || data.data?.url;
            if (resolvedUrl) {
              resolve(resolvedUrl);
            } else {
              reject(new Error('Upload response missing url property: ' + xhr.responseText));
            }
          } catch {
            resolve(xhr.responseText);
          }
        } else {
          reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network upload request failed via native bridge.'));
      xhr.ontimeout = () => reject(new Error('Upload timed out after 60 seconds.'));

      const formData = new FormData();
      formData.append('file', {
        uri: localUri,
        name: filename,
        type: mimeType,
      } as any);

      xhr.send(formData);
    });
  } catch (xhrError: any) {
    console.warn('Native XHR upload encountered error, trying Web Blob fallback:', xhrError?.message);

    // 2. Fallback: Fetch file as standard Blob and upload with modern fetch
    try {
      const fileResp = await fetch(localUri);
      const blob = await fileResp.blob();

      const formData = new FormData();
      formData.append('file', blob, filename);

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const fetchRes = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!fetchRes.ok) {
        const errorText = await fetchRes.text();
        throw new Error(`Blob upload failed (${fetchRes.status}): ${errorText}`);
      }

      const uploadData = await fetchRes.json();
      return uploadData.url || uploadData.file?.url || uploadData.data?.url || localUri;
    } catch (blobError: any) {
      console.error('All file upload mechanisms failed:', blobError);
      throw new Error(blobError?.message || xhrError?.message || 'Media upload failed.');
    }
  }
};
