// Offline Support & Sync
let isOnline = navigator.onLine;

window.addEventListener('online', () => {
  isOnline = true;
  showToast('Back online! Syncing data...');
  syncPendingData();
});

window.addEventListener('offline', () => {
  isOnline = false;
  showToast('You are offline. Sales will be saved locally.');
});

async function syncPendingData() {
  if (!isOnline) return;
  
  const pending = await getPendingSync();
  if (pending.length === 0) return;
  
  showToast(`Syncing ${pending.length} items...`);
  
  for (const item of pending) {
    try {
      // Here you would sync to Supabase
      // For now, just mark as synced
      await markSynced(item.id);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
  
  showToast('Sync complete!');
}

function getPendingSync() {
  return new Promise((resolve) => {
    const transaction = db.transaction(['pending_sync'], 'readonly');
    const store = transaction.objectStore('pending_sync');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
}

function markSynced(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending_sync'], 'readwrite');
    const store = transaction.objectStore('pending_sync');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Cache API for offline
async function cacheData(key, data) {
  if ('caches' in window) {
    const cache = await caches.open('hellobuyer-data');
    const response = new Response(JSON.stringify(data));
    await cache.put(key, response);
  }
}

async function getCachedData(key) {
  if ('caches' in window) {
    const cache = await caches.open('hellobuyer-data');
    const response = await cache.match(key);
    if (response) {
      return await response.json();
    }
  }
  return null;
}
