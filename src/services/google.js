export async function syncItemToDrive(item, accessToken) {
  if (!accessToken) return false;
  
  const metadata = {
    name: `Blitz_${item.category}_${new Date(item.created_at).toISOString().split('T')[0]}.txt`,
    mimeType: 'text/plain',
  };

  const fileContent = `Blitz Auto-Triage Sync\n\nCategory: ${item.category}\nCaptured At: ${new Date(item.created_at).toLocaleString()}\n\nRaw Input:\n${item.raw_text}\n\nExtracted Metadata:\n${item.metadata_json}`;
  
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileContent], { type: 'text/plain' }));

  try {
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: form
    });
    
    if (!res.ok) {
      console.error('Failed to sync to Drive', await res.text());
      return false;
    }
    
    console.log(`Successfully synced ${item.category} to Google Drive.`);
    return true;
  } catch (e) {
    console.error('Google Drive Sync error:', e);
    return false;
  }
}
