import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const mainURL = new URL('../src/main/index.cjs', import.meta.url);
const require = createRequire(mainURL);

test('saved connections reload using the Electron async decryption result', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'easyappy-vault-test-'));
  try {
    const electron = {
      app: {
        getPath: () => directory,
        requestSingleInstanceLock: () => false,
        quit() {},
      },
      protocol: { registerSchemesAsPrivileged() {} },
      ipcMain: { handle() {} },
      // Electron is a native boundary: match its pinned async API contract.
      safeStorage: {
        isAsyncEncryptionAvailable: async () => true,
        encryptStringAsync: async (value) => Buffer.from(value),
        decryptStringAsync: async (value) => ({
          result: value.toString(),
          shouldReEncrypt: false,
        }),
      },
    };
    const context = vm.createContext({
      require: (name) => (name === 'electron' ? electron : require(name)),
      console: { error() {} },
      Buffer,
      process,
    });
    vm.runInContext(await readFile(mainURL, 'utf8'), context);
    await vm.runInContext(
      `(async () => {
      vault = {googleClient: {clientId: 'test-client'}, gmail: {access_token: 'test-token'}, gmailEmail: 'test@example.com'};
      await saveVault();
      vault = {};
      await loadVault();
    })()`,
      context,
    );
    const status = vm.runInContext('status()', context);
    assert.equal(status.googleConfigured, true);
    assert.equal(status.gmailConnected, true);
    assert.equal(status.gmailEmail, 'test@example.com');
    assert.equal('access_token' in status, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
