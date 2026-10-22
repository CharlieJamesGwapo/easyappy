const {
  app,
  BrowserWindow,
  protocol,
  net,
  ipcMain,
  shell,
  dialog,
  Menu,
  safeStorage,
} = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const {
  validateGoogleCredentials,
  authorizeGoogle,
  googleToken,
  jsonFetch,
} = require('./oauth.cjs');
const { simpleParser } = require('mailparser');
const { createGmailReader, readGmailMessages } = require('./gmail.cjs');
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'easyappy',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
]);
let win,
  vault = {},
  device = null;
const vaultPath = () => path.join(app.getPath('userData'), 'connections.encrypted');
async function saveVault() {
  if (!(await safeStorage.isAsyncEncryptionAvailable()))
    throw new Error('macOS credential encryption is unavailable. Connection was not saved.');
  const encoded = await safeStorage.encryptStringAsync(JSON.stringify(vault));
  await fs.writeFile(vaultPath() + '.tmp', encoded, { mode: 0o600 });
  await fs.rename(vaultPath() + '.tmp', vaultPath());
}
async function loadVault() {
  try {
    const decrypted = await safeStorage.decryptStringAsync(await fs.readFile(vaultPath()));
    vault = JSON.parse(decrypted.result);
  } catch (error) {
    if (error.code !== 'ENOENT')
      console.error(
        'Saved connection credentials could not be opened. Reconnect from Connections.',
      );
    vault = {};
  }
}
function status() {
  return {
    desktop: true,
    googleConfigured: Boolean(vault.googleClient),
    gmailConnected: Boolean(vault.gmail?.access_token),
    gmailEmail: vault.gmailEmail || '',
    githubConnected: Boolean(vault.github?.access_token),
    githubLogin: vault.githubProfile?.login || '',
    githubURL: vault.githubProfile?.html_url || '',
  };
}
async function gmailToken() {
  if (!vault.gmail || !vault.googleClient) throw new Error('Connect Gmail first.');
  if (vault.gmail.expiresAt < Date.now() + 60000) {
    if (!vault.gmail.refresh_token)
      throw new Error('Gmail authorization expired. Reconnect your account.');
    const token = await googleToken(vault.googleClient, {
      grant_type: 'refresh_token',
      refresh_token: vault.gmail.refresh_token,
    });
    vault.gmail = { ...vault.gmail, ...token, expiresAt: Date.now() + token.expires_in * 1000 };
    await saveVault();
  }
  return vault.gmail.access_token;
}
const gmailAPI = createGmailReader(async (endpoint) => {
  return jsonFetch('https://gmail.googleapis.com/gmail/v1/users/me/' + endpoint, {
    headers: { Authorization: 'Bearer ' + (await gmailToken()) },
  });
});
function handle(name, fn) {
  ipcMain.handle(name, async (event, ...args) => {
    if (
      event.sender !== win?.webContents ||
      event.senderFrame !== win.webContents.mainFrame ||
      !event.senderFrame.url.startsWith('easyappy://app/')
    )
      throw new Error('Untrusted application window.');
    return fn(...args);
  });
}
handle('connections:status', status);
handle('connections:configure-google', async (value) => {
  if (
    !value ||
    typeof value.clientId !== 'string' ||
    typeof value.clientSecret !== 'string' ||
    value.clientSecret.length > 1000
  )
    throw new Error('Enter valid Google Desktop OAuth credentials.');
  vault.googleClient = validateGoogleCredentials({
    installed: { client_id: value.clientId.trim(), client_secret: value.clientSecret.trim() },
  });
  await saveVault();
  return status();
});
handle('connections:setup-google', async () => {
  const selected = await dialog.showOpenDialog(win, {
    title: 'Import Google Desktop OAuth credentials',
    properties: ['openFile'],
    filters: [{ name: 'Google Desktop credentials', extensions: ['json'] }],
  });
  if (selected.canceled) return status();
  const stat = await fs.stat(selected.filePaths[0]);
  if (stat.size > 100000) throw new Error('Credentials file is too large.');
  vault.googleClient = validateGoogleCredentials(
    JSON.parse(await fs.readFile(selected.filePaths[0], 'utf8')),
  );
  await saveVault();
  return status();
});
handle('connections:connect-google', async () => {
  if (!vault.googleClient)
    throw new Error(
      'Import your Google Desktop OAuth client JSON first. See setup instructions in Connections.',
    );
  vault.gmail = await authorizeGoogle(vault.googleClient, (url) => shell.openExternal(url));
  await saveVault();
  const profile = await gmailAPI('profile');
  vault.gmailEmail = profile.emailAddress;
  await saveVault();
  return status();
});
handle('connections:disconnect', async (provider) => {
  if (!['gmail', 'github'].includes(provider)) throw new Error('Unknown connection.');
  const token = vault[provider];
  if (provider === 'gmail' && token?.access_token) {
    try {
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: token.refresh_token || token.access_token }),
        signal: AbortSignal.timeout(15000),
      });
    } catch {}
  }
  delete vault[provider];
  delete vault[provider === 'gmail' ? 'gmailEmail' : 'githubProfile'];
  if (provider === 'github') device = null;
  await saveVault();
  return status();
});
handle('connections:sync-gmail', async (seen) => {
  if (!Array.isArray(seen) || seen.length > 50000 || seen.some((id) => typeof id !== 'string'))
    throw new Error('Invalid sync checkpoint.');
  const known = new Set(seen),
    messages = [];
  let page = '',
    scanned = 0;
  const q =
    'newer_than:30d -in:spam -in:trash -in:sent {subject:application subject:applied subject:interview subject:assessment subject:offer}';
  do {
    const list = await gmailAPI(
      'messages?' +
        new URLSearchParams({ q, maxResults: '100', ...(page ? { pageToken: page } : {}) }),
    );
    for (const item of list.messages || []) {
      scanned++;
      if (!known.has(item.id))
        messages.push(await gmailAPI(`messages/${encodeURIComponent(item.id)}?format=full`));
    }
    page = list.nextPageToken || '';
  } while (page && scanned < 500);
  return { messages, scanned, limited: Boolean(page), checkedAt: new Date().toISOString() };
});
handle('connections:read-gmail-messages', (ids) => readGmailMessages(ids, gmailAPI));
handle('connections:start-github', async (clientId) => {
  if (typeof clientId !== 'string' || !/^\w{10,100}$/.test(clientId))
    throw new Error('Enter your GitHub OAuth App client ID with Device Flow enabled.');
  const result = await jsonFetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, scope: 'read:user' }),
  });
  if (result.error) throw new Error(result.error_description || result.error);
  device = {
    ...result,
    clientId,
    expiresAt: Date.now() + result.expires_in * 1000,
    nextPollAt: Date.now() + result.interval * 1000,
  };
  await shell.openExternal('https://github.com/login/device');
  return { userCode: result.user_code, interval: result.interval, expiresAt: device.expiresAt };
});
handle('connections:poll-github', async () => {
  if (!device || Date.now() > device.expiresAt) {
    device = null;
    throw new Error('GitHub connection expired. Start again.');
  }
  if (Date.now() < device.nextPollAt) return { pending: true };
  device.nextPollAt = Date.now() + device.interval * 1000;
  const token = await jsonFetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: device.clientId,
      device_code: device.device_code,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  });
  if (token.error === 'authorization_pending') return { pending: true };
  if (token.error === 'slow_down') {
    device.interval += 5;
    device.nextPollAt = Date.now() + device.interval * 1000;
    return { pending: true };
  }
  if (token.error) throw new Error(token.error_description || token.error);
  vault.github = token;
  vault.githubProfile = await jsonFetch('https://api.github.com/user', {
    headers: {
      Authorization: 'Bearer ' + token.access_token,
      Accept: 'application/vnd.github+json',
    },
  });
  await saveVault();
  device = null;
  return { pending: false, status: status() };
});
handle('connections:import-emails', async () => {
  const selected = await dialog.showOpenDialog(win, {
    title: 'Import saved application emails (.eml)',
    properties: ['openFile', 'multiSelections'],
  });
  if (selected.canceled) return [];
  const rows = [];
  for (const file of selected.filePaths.slice(0, 100)) {
    if (path.extname(file).toLowerCase() !== '.eml')
      throw new Error('Choose saved email files with the .eml extension.');
    const stat = await fs.stat(file);
    if (stat.size > 10000000) throw new Error('Use email files smaller than 10 MB.');
    const raw = await fs.readFile(file),
      mail = await simpleParser(raw, {
        skipHtmlToText: false,
        skipTextToHtml: true,
        skipImageLinks: true,
      });
    rows.push({
      id: mail.messageId || crypto.createHash('sha256').update(raw).digest('hex'),
      subject: mail.subject || '',
      from: mail.from?.text || '',
      date: mail.date?.toISOString() || '',
      text: mail.text || '',
    });
  }
  return rows;
});
function external(url) {
  try {
    const u = new URL(url);
    if (['http:', 'https:'].includes(u.protocol) && !u.username && !u.password)
      shell.openExternal(u.href);
  } catch {}
}
async function createWindow() {
  win = new BrowserWindow({
    width: 1370,
    height: 940,
    minWidth: 800,
    minHeight: 600,
    title: 'EasyAppy',
    backgroundColor: '#f6f7f3',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  win.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) =>
    callback(false),
  );
  win.webContents.setWindowOpenHandler(({ url }) => {
    external(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('easyappy://app/')) {
      event.preventDefault();
      external(url);
    }
  });
  await win.loadURL('easyappy://app/index.html');
  win.on('closed', () => (win = null));
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    win?.show();
    win?.focus();
  });
  app.whenReady().then(async () => {
    protocol.handle('easyappy', async (request) => {
      const u = new URL(request.url),
        name = u.pathname === '/' ? 'index.html' : u.pathname.slice(1);
      if (u.hostname !== 'app' || !/^[-a-z0-9]+\.(html|js|json|css|svg)$/.test(name))
        return new Response('Not found', { status: 404 });
      const result = await net.fetch(pathToFileURL(path.join(__dirname, '../renderer', name)).href);
      const headers = new Headers(result.headers);
      headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; object-src 'none'; frame-src 'none'; base-uri 'none'",
      );
      return new Response(result.body, { status: result.status, headers });
    });
    await loadVault();
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        { role: 'appMenu' },
        { role: 'editMenu' },
        { role: 'viewMenu' },
        { role: 'windowMenu' },
      ]),
    );
    await createWindow();
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('activate', () => {
    if (!win) createWindow();
  });
}
