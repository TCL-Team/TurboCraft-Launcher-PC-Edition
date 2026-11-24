import { TurboCraftLauncherCore } from './launcherCore.js';

export async function dispatchCoreRpc(
  core: TurboCraftLauncherCore,
  method: string,
  args: Record<string, any> = {}
): Promise<unknown> {
  switch (method) {
    case 'getBootstrapState':
      return core.getBootstrapState();
    case 'updateSettings':
      return core.updateSettings(args.patch || {});
    case 'exportSettingsJson':
      return core.exportSettingsJson();
    case 'importSettingsJson':
      return core.importSettingsJson(String(args.rawJson || '{}'));
    case 'saveCustomHomeMarkdown':
      await core.saveCustomHomeMarkdown(String(args.markdown || ''));
      return { ok: true };
    case 'toggleFavorite':
      return core.toggleFavorite(args.item);
    case 'cancelTask':
      core.cancelTask(String(args.taskId));
      return { ok: true };
    case 'clearFinishedTasks':
      core.clearFinishedTasks();
      return { ok: true };

    // Accounts
    case 'createOfflineAccount':
      return core.createOfflineAccount(args as any);
    case 'loginYggdrasilAccount':
      return core.loginYggdrasilAccount(args as any);
    case 'startMicrosoftDeviceLogin':
      return core.startMicrosoftDeviceLogin();
    case 'getMicrosoftDeviceFlowStatus':
      return core.getMicrosoftDeviceFlowStatus(String(args.flowId));
    case 'cancelMicrosoftDeviceFlow':
      core.cancelMicrosoftDeviceFlow(String(args.flowId));
      return { ok: true };
    case 'selectAccount':
      await core.selectAccount(String(args.accountId));
      return { ok: true };
    case 'updateAccountWardrobe':
      return core.updateAccountWardrobe(String(args.accountId), args.patch || {});
    case 'deleteAccount':
      await core.deleteAccount(String(args.accountId));
      return { ok: true };

    // Java
    case 'scanJavaRuntimes':
      return core.scanJavaRuntimes();
    case 'addCustomJavaPath':
      return core.addCustomJavaPath(String(args.javaPath));
    case 'installManagedJava':
      return core.installManagedJava(Number(args.major) as 8 | 17 | 21 | 25);

    // Instances & Game Launch
    case 'installInstance':
      return core.installInstance(args as any);
    case 'selectInstance':
      await core.selectInstance(String(args.instanceId));
      return { ok: true };
    case 'updateInstance':
      return core.updateInstance(String(args.instanceId), args.patch || {});
    case 'cloneInstance':
      return core.cloneInstance(String(args.instanceId), String(args.newName || ''));
    case 'deleteInstance':
      await core.deleteInstance(String(args.instanceId));
      return { ok: true };
    case 'repairInstance': {
      const inst = core.getBootstrapState().instances.find((i) => i.id === String(args.instanceId));
      if (!inst) throw new Error('Instance not found');
      void core.downloadMinecraftVersionFiles(inst);
      return { ok: true };
    }
    case 'listInstanceContent':
      return core.listInstanceContent(String(args.instanceId), args.category);
    case 'toggleInstanceItem':
      await core.toggleInstanceItem(String(args.instanceId), args.category, String(args.fileName));
      return { ok: true };
    case 'deleteInstanceItem':
      await core.deleteInstanceItem(String(args.instanceId), args.category, String(args.fileName));
      return { ok: true };
    case 'installAssetToInstance':
      return core.installAssetToInstance(args as any);
    case 'exportInstanceMrpack':
      return core.exportInstanceMrpack(String(args.instanceId), args.options);
    case 'importModpackBase64':
      return core.importModpackBase64(String(args.fileName), String(args.base64Data));
    case 'launchGame':
    case 'launchInstance':
      return core.launchGame(args.instanceId ? String(args.instanceId) : undefined);
    case 'stopGame':
      return { stopped: core.stopGame(String(args.instanceId)) };
    case 'getInstanceLog':
      return core.getInstanceLog(args.instanceId ? String(args.instanceId) : undefined);

    // File Manager & Code Editor
    case 'listFiles':
      return core.listFiles(String(args.relPath || ''));
    case 'readTextFile':
      return { content: await core.readTextFile(String(args.relPath)) };
    case 'writeTextFile':
      await core.writeTextFile(String(args.relPath), String(args.content ?? ''));
      return { ok: true };
    case 'createDirectory':
      await core.createDirectory(String(args.relPath));
      return { ok: true };
    case 'deleteFileOrDir':
      await core.deleteFileOrDir(String(args.relPath));
      return { ok: true };

    // Terracotta Multiplayer
    case 'startTerracottaHost':
      return core.startTerracottaHost(Number(args.mcLanPort) || 25565);
    case 'joinTerracottaRoom':
      return core.joinTerracottaRoom(
        String(args.roomCode || ''),
        String(args.remoteAddress || '127.0.0.1:25565')
      );
    case 'stopTerracotta':
      return core.stopTerracotta();

    default:
      throw new Error(`Unknown RPC method: ${method}`);
  }
}
