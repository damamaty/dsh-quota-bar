/**
 * Host half of the quota bar. It reads the three provider APIs with the
 * stored credentials and serves one JSON document to the browser half.
 *
 * Nothing here logs or returns a credential value. Errors carry the provider's
 * HTTP status and, at most, a short response snippet.
 */

const PROVIDERS = {
  zai: { name: 'Z.ai', detail: 'GLM Coding Plan', keyName: 'ZAI_API_KEY' },
  deepseek: { name: 'DeepSeek', detail: 'Pay-as-you-go', keyName: 'DEEPSEEK_API_KEY' },
  opencode: { name: 'OpenCode Go', detail: 'Go plan', keyName: 'OPENCODE_GO_API_KEY' },
};

const CACHE_MS = 30_000;
const ROUTE = '/api/quota-bar';

export const inject = ['credentials'];

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {Record<string, unknown>} config
 */
export function apply(ctx, config = {}) {
  const options = {
    zaiBaseUrl: stringOr(config.zaiBaseUrl, 'https://api.z.ai'),
    deepseekBaseUrl: stringOr(config.deepseekBaseUrl, 'https://api.deepseek.com'),
    opencodeBaseUrl: stringOr(config.opencodeBaseUrl, 'https://opencode.ai'),
    timeoutMs: Number.isFinite(config.timeoutMs) ? Number(config.timeoutMs) : 12_000,
  };
  const read = createReader(ctx, options);

  ctx.inject(['connection'], (ctx) => {
    ctx.effect(
      () =>
        ctx.connection.fetch.register({
          path: ROUTE,
          methods: ['GET'],
          requestBody: 'buffered',
          fetch: async (request) => {
            const force = new URL(request.url).searchParams.get('refresh') === '1';
            try {
              const data = await read(force);
              return Response.json(data, { headers: { 'cache-control': 'no-store' } });
            } catch (error) {
              return Response.json(
                { error: messageOf(error) },
                { status: 500, headers: { 'cache-control': 'no-store' } },
              );
            }
          },
        }),
      'quota-bar: usage route',
    );
  });
}

/**
 * Cache one aggregate reading so a page refresh and several browsers share a
 * single set of upstream requests.
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {{ zaiBaseUrl: string, deepseekBaseUrl: string, opencodeBaseUrl: string, timeoutMs: number }} options
 */
function createReader(ctx, options) {
  let cache;
  let pending;

  return async function read(force) {
    if (!force && cache !== undefined && Date.now() - cache.at < CACHE_MS) return cache.data;
    if (pending !== undefined) return pending;
    pending = collect(ctx, options)
      .then((data) => {
        cache = { at: Date.now(), data };
        return data;
      })
      .finally(() => {
        pending = undefined;
      });
    return pending;
  };
}

async function collect(ctx, options) {
  const [zai, deepseek, opencode] = await Promise.all([
    settle('zai', readZai(ctx, options)),
    settle('deepseek', readDeepSeek(ctx, options)),
    settle('opencode', readOpenCode(ctx, options)),
  ]);
  return {
    schema: 1,
    updatedAt: new Date().toISOString(),
    providers: [zai, deepseek, opencode],
  };
}

/**
 * Run one provider reader and keep a failure attached to that provider instead
 * of failing the whole reading.
 * @param {'zai' | 'deepseek' | 'opencode'} id
 * @param {Promise<Record<string, unknown>>} task
 */
async function settle(id, task) {
  const base = {
    id,
    name: PROVIDERS[id].name,
    detail: PROVIDERS[id].detail,
    keyName: PROVIDERS[id].keyName,
    status: 'ok',
    windows: [],
    balance: null,
    error: null,
  };
  try {
    return { ...base, ...(await task) };
  } catch (error) {
    return { ...base, status: 'error', error: messageOf(error) };
  }
}

async function readZai(ctx, options) {
  const key = await readKey(ctx, PROVIDERS.zai.keyName);
  if (key === undefined) return { status: 'unconfigured' };

  const body = await getJson(
    new URL('/api/monitor/usage/quota/limit', options.zaiBaseUrl),
    key,
    options.timeoutMs,
  );
  if (body?.success === false || (body?.code !== undefined && body.code !== 200)) {
    throw new Error(snippet(body?.msg ?? `API code ${body?.code}`));
  }

  const rows = Array.isArray(body?.data?.limits) ? body.data.limits : [];
  const byWindow = new Map();
  for (const row of rows) {
    if (row === null || typeof row !== 'object') continue;
    const minutes = windowMinutes(Number(row.unit), Number(row.number));
    if (minutes === undefined) continue;
    const usedPercent = usedPercentOf(row);
    if (usedPercent === undefined) continue;
    const candidate = {
      id: `zai-${minutes}`,
      label: windowLabel(minutes),
      short: windowShortLabel(minutes),
      windowMinutes: minutes,
      usedPercent,
      resetsAt: isoTime(row.nextResetTime),
    };
    const previous = byWindow.get(minutes);
    if (previous === undefined || Number(row.usage) > previous.cap) {
      byWindow.set(minutes, { ...candidate, cap: Number(row.usage) || 0 });
    }
  }

  const windows = [...byWindow.values()]
    .sort((left, right) => left.windowMinutes - right.windowMinutes)
    .map(({ cap, ...window }) => window);
  if (windows.length === 0) throw new Error('The quota response had no usable windows.');

  const level = body?.data?.planName ?? body?.data?.plan ?? body?.data?.plan_type ?? body?.data?.packageName ?? body?.data?.level;
  return {
    detail: typeof level === 'string' && level.trim() !== ''
      ? `${PROVIDERS.zai.detail} · ${titleCase(level)}`
      : PROVIDERS.zai.detail,
    windows,
  };
}

async function readDeepSeek(ctx, options) {
  const key = await readKey(ctx, PROVIDERS.deepseek.keyName);
  if (key === undefined) return { status: 'unconfigured' };

  const body = await getJson(new URL('/user/balance', options.deepseekBaseUrl), key, options.timeoutMs);
  const infos = Array.isArray(body?.balance_infos) ? body.balance_infos : [];
  const info = infos.find((item) => item?.currency === 'USD') ?? infos[0];
  if (info === undefined || info === null) throw new Error('The balance response had no balance.');

  return {
    balance: {
      currency: String(info.currency ?? ''),
      total: String(info.total_balance ?? ''),
      granted: String(info.granted_balance ?? ''),
      toppedUp: String(info.topped_up_balance ?? ''),
      available: body?.is_available !== false,
    },
  };
}

async function readOpenCode(ctx, options) {
  const key = await readKey(ctx, PROVIDERS.opencode.keyName);
  if (key === undefined) return { status: 'unconfigured' };

  const body = await getJson(new URL('/zen/go/v1/usage', options.opencodeBaseUrl), key, options.timeoutMs);
  const usage = body?.usage;
  const windows = [];
  for (const [id, label, short] of [
    ['rolling', '5-hour', '5h'],
    ['weekly', 'Weekly', 'wk'],
    ['monthly', 'Monthly', 'mo'],
  ]) {
    const window = usage?.[id];
    if (window === null || typeof window !== 'object') continue;
    const percent = Number(window.percent);
    windows.push({
      id: `opencode-${id}`,
      label,
      short,
      usedPercent: Number.isFinite(percent) ? clampPercent(percent) : 0,
      resetsAt: isoTime(window.resetsAt),
      limited: window.status === 'rate-limited',
    });
  }
  if (windows.length === 0) throw new Error('The usage response had no windows.');
  return { windows };
}

async function readKey(ctx, name) {
  const hit = await ctx.credentials.resolve(name);
  if (hit === undefined || typeof hit.value !== 'string') return undefined;
  const value = hit.value.trim();
  return value === '' ? undefined : value;
}

async function getJson(url, key, timeoutMs) {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${key}`, accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  if (!response.ok) {
    // Provider error bodies can quote a credential fragment; report only the
    // status instead of echoing them into the panel.
    throw new Error(`HTTP ${response.status}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('The provider returned a response that is not JSON.');
  }
}

function windowMinutes(unit, number) {
  if (!Number.isFinite(number) || number <= 0) return undefined;
  switch (unit) {
    case 5:
      return number;
    case 3:
      return number * 60;
    case 1:
      return number * 1440;
    case 6:
      return number * 10080;
    default:
      return undefined;
  }
}

function windowLabel(minutes) {
  if (minutes === 10080) return 'Weekly';
  if (minutes % 10080 === 0) return `${minutes / 10080}-week`;
  if (minutes % 1440 === 0) return `${minutes / 1440}-day`;
  if (minutes === 300) return '5-hour';
  if (minutes % 60 === 0) return `${minutes / 60}-hour`;
  return `${minutes}-minute`;
}

function windowShortLabel(minutes) {
  if (minutes === 300) return '5h';
  if (minutes === 10080) return 'wk';
  if (minutes === 1440) return 'day';
  if (minutes % 1440 === 0) return `${minutes / 1440}d`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}m`;
}

function usedPercentOf(row) {
  const reported = Number(row.percentage);
  if (Number.isFinite(reported)) return clampPercent(reported);

  const limit = Number(row.usage);
  if (!Number.isFinite(limit) || limit <= 0) return undefined;
  const remaining = Number(row.remaining);
  const current = Number(row.currentValue);
  const used = Number.isFinite(remaining) ? limit - remaining : current;
  if (!Number.isFinite(used)) return undefined;
  return clampPercent((used / limit) * 100);
}

function clampPercent(value) {
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

function isoTime(value) {
  if (value === undefined || value === null || value === '') return null;
  const date = typeof value === 'number' || /^\d+$/.test(String(value))
    ? new Date(Number(value))
    : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function stringOr(value, fallback) {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}

function snippet(value) {
  return String(value).replace(/\s+/g, ' ').trim().slice(0, 200);
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}
