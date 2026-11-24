import express, { Request, Response } from 'express';
import { TurboCraftLauncherCore } from './launcherCore.js';
import { dispatchCoreRpc } from './rpcDispatcher.js';
import { BuildKeys } from '../src/generated/buildConfig.js';

export { dispatchCoreRpc };

async function startDevApiServer() {
  const core = new TurboCraftLauncherCore();
  await core.init();

  const app = express();
  app.use(express.json({ limit: '50mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      name: BuildKeys.LAUNCHER_APP_NAME,
      version: BuildKeys.LAUNCHER_VERSION_NAME,
    });
  });

  app.post('/api/rpc', async (req: Request, res: Response) => {
    try {
      const { method, args } = req.body || {};
      const result = await dispatchCoreRpc(core, String(method), args || {});
      res.json({ ok: true, result });
    } catch (err) {
      res.status(400).json({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    send('connected', { ts: Date.now() });

    const onState = () => send('state:changed', { ts: Date.now() });
    const onTask = (task: unknown) => send('task:update', task);
    const onLog = (payload: unknown) => send('log:line', payload);
    const onExit = (payload: unknown) => send('game:exit', payload);

    core.on('state:changed', onState);
    core.on('task:update', onTask);
    core.on('log:line', onLog);
    core.on('game:exit', onExit);

    const keepAlive = setInterval(() => {
      res.write(': ping\n\n');
    }, 20_000);

    req.on('close', () => {
      clearInterval(keepAlive);
      core.off('state:changed', onState);
      core.off('task:update', onTask);
      core.off('log:line', onLog);
      core.off('game:exit', onExit);
    });
  });

  const port = Number(process.env.TCL_API_PORT || 3456);
  app.listen(port, '127.0.0.1', () => {
    console.log(`[${BuildKeys.LAUNCHER_SHORT_NAME} PC Core] Local API server listening on http://127.0.0.1:${port}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startDevApiServer().catch((err) => {
    console.error('[TurboCraft PC Core] Fatal startup error:', err);
    process.exit(1);
  });
}
