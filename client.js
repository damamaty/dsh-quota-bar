window.__ModuleLoader__.load({
  id: 'dsh-quota-bar',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'quotaBar';
    const POLL_MS = 60_000;
    const TICK_MS = 30_000;

    const en = {
      barLabel: 'Provider quota left',
      quotaLeft: 'Quota left',
      refresh: 'Refresh quota',
      refreshing: 'Refreshing quota',
      loading: 'Reading quotas...',
      loadError: 'Could not read quotas',
      notSet: 'not set',
      errorShort: 'error',
      left: 'left',
      available: 'available',
      notAvailable: 'insufficient balance',
      granted: 'Granted',
      toppedUp: 'Topped up',
      resetsIn: 'resets in',
      resetting: 'resetting now',
      noReset: 'no reset',
      rateLimited: 'rate limited',
      close: 'Close',
      unconfigured: 'Not configured',
      unconfiguredHint: 'Add this key to your credentials:',
      error: 'Could not read this provider.',
      errorHint: 'Check the network and the provider key, then refresh.',
      stale: 'Showing the last reading',
      footnote: 'Refreshes once a minute. Percentages show quota left.',
      openDetails: 'Open details',
    };

    const zh = {
      barLabel: '服务商剩余额度',
      quotaLeft: '额度剩余',
      refresh: '刷新额度',
      refreshing: '正在刷新额度',
      loading: '正在读取额度...',
      loadError: '无法读取额度',
      notSet: '未设置',
      errorShort: '错误',
      left: '可用',
      available: '可用',
      notAvailable: '余额不足',
      granted: '赠送',
      toppedUp: '充值',
      resetsIn: '剩余',
      resetting: '即将重置',
      noReset: '无重置时间',
      rateLimited: '已限流',
      close: '关闭',
      unconfigured: '尚未配置',
      unconfiguredHint: '将此密钥添加到凭据：',
      error: '无法读取该服务商。',
      errorHint: '检查网络和服务商密钥，然后刷新。',
      stale: '显示上次读数',
      footnote: '每分钟刷新一次。百分比表示剩余额度。',
      openDetails: '打开详情',
    };

    const CSS = `
.qp-bar {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px 8px;
  min-height: 34px;
  padding: 3px 12px;
  border-top: 0.5px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
}
.qp-bar-title {
  padding-right: 4px;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
}
.qp-groups { display: flex; align-items: center; flex-wrap: wrap; gap: 2px; min-width: 0; }
.qp-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 4px 8px;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.qp-group:hover, .qp-group[aria-expanded="true"] { background: var(--dsw-alias-interactive-bg-hover); }
.qp-group:focus-visible { outline-offset: 2px; }
.qp-name { font-size: 12px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.qp-values { display: inline-flex; align-items: center; gap: 10px; }
.qp-metric { position: relative; display: inline-flex; align-items: baseline; gap: 3px; padding-bottom: 4px; }
.qp-metric-label { font-size: 10px; color: var(--dsw-alias-label-tertiary); }
.qp-metric-value {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
}
.qp-metric-value.qp-warn { color: var(--dsw-alias-state-warn-primary); }
.qp-metric-value.qp-error { color: var(--dsw-alias-state-error-primary); }
.qp-metric-track {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  border-radius: 1px;
  background: var(--dsw-alias-bg-layer-2);
  overflow: hidden;
}
.qp-metric-fill {
  display: block;
  height: 100%;
  border-radius: 1px;
  background: var(--dsw-alias-state-business-primary);
}
.qp-metric-fill.qp-warn { background: var(--dsw-alias-state-warn-primary); }
.qp-metric-fill.qp-error { background: var(--dsw-alias-state-error-primary); }
.qp-balance { font-size: 13px; font-weight: 500; font-variant-numeric: tabular-nums; }
.qp-balance.qp-error { color: var(--dsw-alias-state-error-primary); }
.qp-muted { color: var(--dsw-alias-label-tertiary); }
.qp-error-text { color: var(--dsw-alias-state-error-primary); }
.qp-status { padding: 0 8px; color: var(--dsw-alias-label-tertiary); }
.qp-tail { display: flex; align-items: center; gap: 6px; margin-left: auto; min-width: 0; }
.qp-updated {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.qp-updated-stale { color: var(--dsw-alias-state-warn-label, var(--dsw-alias-label-secondary)); }
.qp-refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
.qp-refresh:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.qp-refresh:disabled { cursor: default; opacity: 0.55; }
.qp-refresh svg { display: block; width: 14px; height: 14px; }
.qp-pop {
  position: fixed;
  z-index: 40;
  box-sizing: border-box;
  padding: 14px 16px 12px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: var(--dsw-elevation-panel);
  color: var(--dsw-alias-label-primary);
  overflow: auto;
}
.qp-pop-head { display: flex; align-items: flex-start; gap: 8px; }
.qp-pop-headtext { flex: 1; min-width: 0; }
.qp-pop-title { margin: 0; font-size: 14px; font-weight: 600; line-height: 1.4; }
.qp-pop-detail { margin: 2px 0 0; font-size: 12px; color: var(--dsw-alias-label-tertiary); }
.qp-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
.qp-close:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.qp-close svg { display: block; width: 12px; height: 12px; }
.qp-pop-body { margin-top: 12px; }
.qp-row {
  display: grid;
  grid-template-columns: 74px minmax(60px, 1fr) 58px 92px;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  font-size: 12px;
}
.qp-row-label { color: var(--dsw-alias-label-secondary); white-space: nowrap; }
.qp-row-track {
  height: 5px;
  border-radius: 3px;
  background: var(--dsw-alias-bg-layer-2);
  overflow: hidden;
}
.qp-row-fill { display: block; height: 100%; border-radius: 3px; background: var(--dsw-alias-state-business-primary); }
.qp-row-fill.qp-warn { background: var(--dsw-alias-state-warn-primary); }
.qp-row-fill.qp-error { background: var(--dsw-alias-state-error-primary); }
.qp-row-pct {
  color: var(--dsw-alias-label-secondary);
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.qp-row-pct.qp-warn { color: var(--dsw-alias-state-warn-primary); }
.qp-row-pct.qp-error { color: var(--dsw-alias-state-error-primary); }
.qp-row-reset {
  color: var(--dsw-alias-label-tertiary);
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.qp-row-reset.qp-error { color: var(--dsw-alias-state-error-primary); }
.qp-amount {
  margin: 0;
  font-size: 26px;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
}
.qp-amount-note { margin: 4px 0 0; font-size: 12px; color: var(--dsw-alias-label-tertiary); }
.qp-split { margin: 6px 0 0; font-size: 12px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.qp-note { margin: 0; font-size: 13px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }
.qp-hint { margin: 4px 0 0; font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-tertiary); }
.qp-hint code {
  font-family: var(--dsh-font-family-code, monospace);
  font-size: 11px;
  padding: 1px 4px;
  border-radius: 3px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
}
.qp-pop-error { margin: 0; font-size: 13px; line-height: 1.6; color: var(--dsw-alias-state-error-primary); }
.qp-pop-foot {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 0.5px solid var(--dsw-alias-border-l3);
  font-size: 11px;
  line-height: 1.5;
  color: var(--dsw-alias-label-tertiary);
}
@media (max-width: 720px) {
  .qp-bar { padding: 5px 10px; }
  .qp-tail { margin-left: 0; }
}
@media (max-width: 520px) {
  .qp-bar { position: relative; padding: 4px 36px 4px 8px; }
  .qp-bar-title { display: none; }
  .qp-tail { position: absolute; top: 5px; right: 6px; margin-left: 0; }
  .qp-updated { display: none; }
}
@media (max-width: 380px) {
  .qp-row { grid-template-columns: 64px minmax(40px, 1fr) 58px; }
  .qp-row-reset { grid-column: 2 / -1; text-align: left; }
}
`;

    function RefreshIcon() {
      return h(
        'svg',
        { viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true, focusable: false },
        h('path', {
          d: 'M13 8a5 5 0 1 1-1.46-3.54M13 3.2v3.2h-3.2',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      );
    }

    function CloseIcon() {
      return h(
        'svg',
        { viewBox: '0 0 12 12', fill: 'none', 'aria-hidden': true, focusable: false },
        h('path', {
          d: 'M2.5 2.5l7 7M9.5 2.5l-7 7',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinecap: 'round',
        }),
      );
    }

    function remainingOf(window) {
      if (window.limited) return 0;
      const used = Number(window.usedPercent);
      return Number.isFinite(used) ? Math.min(100, Math.max(0, 100 - used)) : 0;
    }

    function percentText(window) {
      return `${Math.round(remainingOf(window))}%`;
    }

    function toneOf(window) {
      if (window.limited) return 'qp-error';
      const remaining = remainingOf(window);
      if (remaining <= 5) return 'qp-error';
      if (remaining <= 15) return 'qp-warn';
      return '';
    }

    function formatClock(iso) {
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return '';
      const now = new Date();
      const sameDay =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();
      return sameDay
        ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
    }

    function formatWhen(iso) {
      const date = new Date(iso);
      return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
    }

    function formatReset(iso, now, t) {
      if (iso === null || iso === undefined) return t('noReset');
      const target = Date.parse(iso);
      if (!Number.isFinite(target)) return t('noReset');
      const minutes = Math.max(0, Math.round((target - now) / 60_000));
      if (minutes === 0) return t('resetting');
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      const mins = minutes % 60;
      const span =
        days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      return `${t('resetsIn')} ${span}`;
    }

    function money(value, currency) {
      const number = Number(value);
      if (Number.isFinite(number) && currency !== '') {
        try {
          return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
          }).format(number);
        } catch {
          /* unsupported currency code: fall through to plain text */
        }
      }
      return `${value ?? ''} ${currency ?? ''}`.trim();
    }

    function providerAria(provider, t) {
      if (provider.status === 'unconfigured') return `${provider.name}: ${t('notSet')}`;
      if (provider.status === 'error') return `${provider.name}: ${t('errorShort')}`;
      if (provider.balance) {
        const state = provider.balance.available ? t('available') : t('notAvailable');
        return `${provider.name}: ${money(provider.balance.total, provider.balance.currency)}, ${state}`;
      }
      return `${provider.name}: ${(provider.windows ?? [])
        .map((window) => `${window.label} ${percentText(window)} ${t('left')}`)
        .join(', ')}`;
    }

    function useQuota() {
      const [data, setData] = React.useState(null);
      const [error, setError] = React.useState(null);
      const [phase, setPhase] = React.useState('loading');
      const [refreshing, setRefreshing] = React.useState(false);
      const inFlight = React.useRef(false);

      const load = React.useCallback(async (force) => {
        if (inFlight.current) return;
        inFlight.current = true;
        setRefreshing(true);
        try {
          const response = await fetch(`/api/quota-bar${force ? '?refresh=1' : ''}`, {
            cache: 'no-store',
            headers: { accept: 'application/json' },
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const next = await response.json();
          if (next === null || typeof next !== 'object' || !Array.isArray(next.providers)) {
            throw new Error('The quota bar received a malformed response.');
          }
          setData(next);
          setError(null);
          setPhase('ready');
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause));
          setPhase((current) => (current === 'ready' ? 'ready' : 'error'));
        } finally {
          inFlight.current = false;
          setRefreshing(false);
        }
      }, []);

      React.useEffect(() => {
        load(false);
        const timer = setInterval(() => {
          if (document.visibilityState !== 'hidden') load(false);
        }, POLL_MS);
        const onVisibility = () => {
          if (document.visibilityState === 'visible') load(false);
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
          clearInterval(timer);
          document.removeEventListener('visibilitychange', onVisibility);
        };
      }, [load]);

      return { data, error, phase, refreshing, load };
    }

    function ProviderGroup({ provider, now, open, onToggle, setTrigger, t }) {
      const windows = provider.windows ?? [];
      let values;
      if (provider.status === 'unconfigured') {
        values = h('span', { className: 'qp-muted' }, t('notSet'));
      } else if (provider.status === 'error') {
        values = h('span', { className: 'qp-error-text' }, t('errorShort'));
      } else if (provider.balance) {
        const balance = provider.balance;
        values = h(
          'span',
          { className: `qp-balance${balance.available ? '' : ' qp-error'}` },
          money(balance.total, balance.currency),
        );
      } else if (windows.length > 0) {
        values = h(
          'span',
          { className: 'qp-values' },
          windows.map((window) => {
            const tone = toneOf(window);
            const percent = remainingOf(window);
            const reset = window.limited
              ? t('rateLimited')
              : formatReset(window.resetsAt, now, t);
            return h(
              'span',
              {
                key: window.id,
                className: 'qp-metric',
                title: `${window.label}: ${percentText(window)} ${t('left')}, ${reset}`,
              },
              h('span', { className: 'qp-metric-label' }, window.short ?? window.label),
              h(
                'span',
                { className: `qp-metric-value${tone ? ` ${tone}` : ''}` },
                percentText(window),
              ),
              h(
                'span',
                { className: 'qp-metric-track', 'aria-hidden': true },
                h('span', {
                  className: `qp-metric-fill${tone ? ` ${tone}` : ''}`,
                  style: { width: `${percent}%` },
                }),
              ),
            );
          }),
        );
      } else {
        values = h('span', { className: 'qp-muted' }, t('notSet'));
      }

      return h(
        'button',
        {
          type: 'button',
          className: 'qp-group',
          'aria-haspopup': 'dialog',
          'aria-expanded': open,
          'aria-label': `${providerAria(provider, t)}. ${t('openDetails')}`,
          title: t('openDetails'),
          'data-quota-provider': provider.id,
          ref: (element) => setTrigger(provider.id, element),
          onClick: (event) => onToggle(provider, event.currentTarget),
        },
        h('span', { className: 'qp-name' }, provider.name),
        values,
      );
    }

    function WindowRows({ provider, now, t }) {
      return h(
        'div',
        null,
        (provider.windows ?? []).map((window) => {
          const tone = toneOf(window);
          const percent = remainingOf(window);
          const reset = window.limited
            ? t('rateLimited')
            : formatReset(window.resetsAt, now, t);
          return h(
            'div',
            { className: 'qp-row', key: window.id },
            h('span', { className: 'qp-row-label' }, window.label),
            h(
              'span',
              {
                className: 'qp-row-track',
                role: 'meter',
                'aria-valuemin': 0,
                'aria-valuemax': 100,
                'aria-valuenow': Math.round(percent),
                'aria-valuetext': `${percentText(window)} ${t('left')}`,
                'aria-label': window.label,
              },
              h('span', {
                className: `qp-row-fill${tone ? ` ${tone}` : ''}`,
                style: { width: `${percent}%` },
              }),
            ),
            h(
              'span',
              { className: `qp-row-pct${tone ? ` ${tone}` : ''}` },
              `${percentText(window)} ${t('left')}`,
            ),
            h(
              'span',
              {
                className: `qp-row-reset${window.limited ? ' qp-error' : ''}`,
                title: window.resetsAt ? formatWhen(window.resetsAt) : undefined,
              },
              reset,
            ),
          );
        }),
      );
    }

    function QuotaPopover({
      provider,
      now,
      anchor,
      onClose,
      t,
      closeRef,
      popoverRef,
      updatedAt,
      stale,
    }) {
      const width = Math.min(360, window.innerWidth - 16);
      const style = {
        left: `${Math.min(
          Math.max(anchor.left, 8),
          Math.max(8, window.innerWidth - width - 8),
        )}px`,
        bottom: `${Math.max(8, window.innerHeight - anchor.top + 8)}px`,
        width: `${width}px`,
        maxHeight: `${Math.max(160, Math.min(440, anchor.top - 16))}px`,
      };

      let body;
      if (provider.status === 'unconfigured') {
        body = h(
          'div',
          null,
          h('p', { className: 'qp-note' }, t('unconfigured')),
          h(
            'p',
            { className: 'qp-hint' },
            `${t('unconfiguredHint')} `,
            h('code', null, provider.keyName),
          ),
        );
      } else if (provider.status === 'error') {
        body = h(
          'div',
          null,
          h('p', { className: 'qp-pop-error' }, t('error')),
          h('p', { className: 'qp-hint' }, `${provider.error}. ${t('errorHint')}`),
        );
      } else if (provider.balance) {
        const balance = provider.balance;
        body = h(
          'div',
          null,
          h('p', { className: 'qp-amount' }, money(balance.total, balance.currency)),
          h(
            'p',
            { className: 'qp-amount-note' },
            balance.available ? t('available') : t('notAvailable'),
          ),
          h(
            'p',
            { className: 'qp-split' },
            `${t('granted')} ${money(balance.granted, balance.currency)} · ${t('toppedUp')} ${money(
              balance.toppedUp,
              balance.currency,
            )}`,
          ),
        );
      } else if ((provider.windows ?? []).length > 0) {
        body = h(WindowRows, { provider, now, t });
      } else {
        body = h('p', { className: 'qp-note' }, t('error'));
      }

      return h(
        'div',
        {
          className: 'qp-pop',
          role: 'dialog',
          'aria-modal': false,
          'aria-labelledby': `qp-pop-title-${provider.id}`,
          style,
          ref: popoverRef,
        },
        h(
          'div',
          { className: 'qp-pop-head' },
          h(
            'div',
            { className: 'qp-pop-headtext' },
            h(
              'h2',
              { className: 'qp-pop-title', id: `qp-pop-title-${provider.id}` },
              provider.name,
            ),
            h('p', { className: 'qp-pop-detail' }, provider.detail),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'qp-close',
              'aria-label': t('close'),
              onClick: onClose,
              ref: closeRef,
            },
            h(CloseIcon),
          ),
        ),
        h('div', { className: 'qp-pop-body' }, body),
        h(
          'p',
          { className: 'qp-pop-foot' },
          updatedAt ? `${formatClock(updatedAt)} · ${t('footnote')}` : t('footnote'),
          stale ? ` · ${t('stale')}` : '',
        ),
      );
    }

    function QuotaBar(props) {
      const t = props.t;
      const { data, error, phase, refreshing, load } = useQuota();
      const [open, setOpen] = React.useState(null);
      const [now, setNow] = React.useState(() => Date.now());
      const triggers = React.useRef(new Map());
      const closeRef = React.useRef(null);
      const popoverRef = React.useRef(null);

      React.useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), TICK_MS);
        return () => clearInterval(timer);
      }, []);

      const setTrigger = React.useCallback((id, element) => {
        if (element === null) triggers.current.delete(id);
        else triggers.current.set(id, element);
      }, []);

      const close = React.useCallback(() => {
        const current = open;
        setOpen(null);
        if (current !== null) {
          const trigger = triggers.current.get(current.id);
          if (trigger !== undefined) trigger.focus();
        }
      }, [open]);

      React.useEffect(() => {
        if (open === null) return undefined;
        if (closeRef.current !== null) closeRef.current.focus();

        const onKey = (event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          close();
        };
        const onPointer = (event) => {
          const target = event.target;
          if (popoverRef.current !== null && popoverRef.current.contains(target)) return;
          for (const trigger of triggers.current.values()) {
            if (trigger.contains(target)) return;
          }
          setOpen(null);
        };
        const onLayout = (event) => {
          if (event?.type === 'scroll' && popoverRef.current?.contains(event.target)) return;
          setOpen(null);
        };

        document.addEventListener('keydown', onKey, true);
        document.addEventListener('pointerdown', onPointer, true);
        window.addEventListener('resize', onLayout);
        window.addEventListener('scroll', onLayout, true);
        return () => {
          document.removeEventListener('keydown', onKey, true);
          document.removeEventListener('pointerdown', onPointer, true);
          window.removeEventListener('resize', onLayout);
          window.removeEventListener('scroll', onLayout, true);
        };
      }, [open, close]);

      const toggle = (provider, element) => {
        const rect = element.getBoundingClientRect();
        setOpen((current) =>
          current !== null && current.id === provider.id
            ? null
            : { id: provider.id, anchor: { left: rect.left, top: rect.top } },
        );
      };

      const providers = data?.providers ?? [];
      const selected =
        open === null ? undefined : providers.find((provider) => provider.id === open.id);

      let content;
      if (data === null) {
        content = h(
          'span',
          { className: 'qp-status', role: 'status' },
          phase === 'error' ? `${t('loadError')}: ${error}` : t('loading'),
        );
      } else {
        content = h(
          'div',
          { className: 'qp-groups' },
          providers.map((provider) =>
            h(ProviderGroup, {
              key: provider.id,
              provider,
              now,
              open: open !== null && open.id === provider.id,
              onToggle: toggle,
              setTrigger,
              t,
            }),
          ),
        );
      }

      return h(
        React.Fragment,
        null,
        h('style', null, CSS),
        h(
          'div',
          { className: 'qp-bar', role: 'region', 'aria-label': t('barLabel') },
          h('span', { className: 'qp-bar-title' }, t('quotaLeft')),
          content,
          h(
            'div',
            { className: 'qp-tail' },
            h(
              'span',
              {
                className: `qp-updated${error !== null && data !== null ? ' qp-updated-stale' : ''}`,
                title: error ?? (data?.updatedAt ? formatWhen(data.updatedAt) : ''),
              },
              data?.updatedAt ? formatClock(data.updatedAt) : '',
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'qp-refresh',
                disabled: refreshing,
                'aria-busy': refreshing,
                'aria-label': refreshing ? t('refreshing') : t('refresh'),
                title: refreshing ? t('refreshing') : t('refresh'),
                onClick: () => load(true),
              },
              h(RefreshIcon),
            ),
          ),
        ),
        selected !== undefined && open !== null
          ? h(QuotaPopover, {
              provider: selected,
              now,
              anchor: open.anchor,
              onClose: close,
              t,
              closeRef,
              popoverRef,
              updatedAt: data?.updatedAt,
              stale: error !== null,
            })
          : null,
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const t = ctx.locale.bind(NS);
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'quota-bar: dictionaries');
        ctx.effect(
          () =>
            ctx.slots.inject('shell.bottom', () =>
              ctx.slots.register({ name: 'shell.bottom', locale: NS }, QuotaBar),
            ),
          'quota-bar: footer bar',
        );
      },
    };
  },
});
