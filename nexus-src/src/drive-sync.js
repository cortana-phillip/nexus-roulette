// -- Google Drive Sync --
const DRIVE_CLIENT_ID = "951031370415-8r3icu8790rhoh9b7qq4vccjb7o7vtvg.apps.googleusercontent.com";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const BACKUP_FILENAME = "nexus-roulette-backup.json";

// Token storage
function getDriveToken() { try{ return localStorage.getItem("nexus_drive_token"); }catch(e){ return null; } }
function setDriveToken(t) { try{ if(t) localStorage.setItem("nexus_drive_token",t); else localStorage.removeItem("nexus_drive_token"); }catch(e){} }
function getDriveConnected() { return !!getDriveToken(); }

// OAuth2 PKCE flow
function driveSignIn() {
  return new Promise((resolve, reject) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: DRIVE_CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: (resp) => {
          if(resp.error) { reject(new Error(resp.error)); return; }
          setDriveToken(resp.access_token);
          resolve(resp.access_token);
        },
      });
      client.requestAccessToken();
    } catch(e) {
      reject(new Error("Google sign-in failed: "+e.message));
    }
  });
}

function driveSignOut() {
  const token = getDriveToken();
  if(token && window.google && window.google.accounts) {
    try { window.google.accounts.oauth2.revoke(token, ()=>{}); } catch(e){}
  }
  setDriveToken(null);
}

// Drive API helpers
async function driveRequest(method, url, body, token) {
  const t = token || getDriveToken();
  if(!t) throw new Error("Not signed in to Google Drive");
  const opts = {
    method,
    headers: { "Authorization": "Bearer "+t, "Content-Type": "application/json" },
  };
  if(body) opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  if(resp.status === 401) { setDriveToken(null); throw new Error("Drive token expired — please reconnect"); }
  if(!resp.ok) throw new Error("Drive API error: "+resp.status);
  if(resp.status === 204) return null;
  return resp.json();
}

async function driveMultipartUpload(filename, content, fileId, token) {
  const t = token || getDriveToken();
  if(!t) throw new Error("Not signed in to Google Drive");
  const metadata = { name: filename, parents: fileId ? undefined : ["appDataFolder"] };
  const boundary = "nexus_boundary_"+Date.now();
  const body = [
    "--"+boundary,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(fileId ? {name:filename} : metadata),
    "--"+boundary,
    "Content-Type: application/json",
    "",
    content,
    "--"+boundary+"--",
  ].join("\r\n");

  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

  const resp = await fetch(url, {
    method: fileId ? "PATCH" : "POST",
    headers: {
      "Authorization": "Bearer "+t,
      "Content-Type": "multipart/related; boundary="+boundary,
    },
    body,
  });
  if(resp.status === 401) { setDriveToken(null); throw new Error("Drive token expired"); }
  if(!resp.ok) throw new Error("Drive upload error: "+resp.status);
  return resp.json();
}

// Find backup file ID
async function driveFindBackup() {
  try {
    const data = await driveRequest("GET",
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name)&q=name='${BACKUP_FILENAME}'`
    );
    return data.files && data.files.length > 0 ? data.files[0].id : null;
  } catch(e) { return null; }
}

// Save to Drive
async function driveSave(appState) {
  try {
    const token = getDriveToken();
    if(!token) return false;
    const content = JSON.stringify({
      savedAt: new Date().toISOString(),
      appState,
    });
    const existingId = await driveFindBackup();
    await driveMultipartUpload(BACKUP_FILENAME, content, existingId, token);
    return true;
  } catch(e) {
    console.warn("Drive save failed:", e.message);
    if(e.message.includes("token expired")) setDriveToken(null);
    return false;
  }
}

// Restore from Drive
async function driveRestore() {
  try {
    const token = getDriveToken();
    if(!token) return null;
    const fileId = await driveFindBackup();
    if(!fileId) return null;
    const t = getDriveToken();
    const resp = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { "Authorization": "Bearer "+t } }
    );
    if(!resp.ok) return null;
    const data = await resp.json();
    return data.appState || null;
  } catch(e) {
    console.warn("Drive restore failed:", e.message);
    return null;
  }
}

// Delete backup from Drive
async function driveDeleteBackup() {
  try {
    const token = getDriveToken();
    if(!token) return;
    const fileId = await driveFindBackup();
    if(!fileId) return;
    await driveRequest("DELETE",
      `https://www.googleapis.com/drive/v3/files/${fileId}`
    );
  } catch(e) {
    console.warn("Drive delete failed:", e.message);
  }
}
