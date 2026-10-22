const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld(
  'easyappyNative',
  Object.freeze({
    status: () => ipcRenderer.invoke('connections:status'),
    setupGoogle: () => ipcRenderer.invoke('connections:setup-google'),
    configureGoogle: (value) => ipcRenderer.invoke('connections:configure-google', value),
    connectGoogle: () => ipcRenderer.invoke('connections:connect-google'),
    disconnect: (provider) => ipcRenderer.invoke('connections:disconnect', provider),
    syncGmail: (seen) => ipcRenderer.invoke('connections:sync-gmail', seen),
    readGmailMessages: (ids) => ipcRenderer.invoke('connections:read-gmail-messages', ids),
    startGitHub: (clientId) => ipcRenderer.invoke('connections:start-github', clientId),
    pollGitHub: () => ipcRenderer.invoke('connections:poll-github'),
    importEmails: () => ipcRenderer.invoke('connections:import-emails'),
  }),
);
