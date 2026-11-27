const workspacePath =
  /^\/(?:home|explore|assistant|intelligence|documents|repayments|cashflow|loans|profile|(?:saved|simulate|documents)\/[A-Za-z0-9_-]{1,80})$/;

// Preserve only presentation modes. Never copy draft text, simulator handoffs,
// or other user data into /auth or OAuth callback URLs.
export function workspaceAuthReturn(pathname: string, params: Record<string, unknown>) {
  if (!workspacePath.test(pathname) || pathname !== pathname.trim()) return '/home';

  if (pathname === '/explore') {
    if (params.mode === 'sample') {
      return params.intent === 'compare'
        ? '/explore?mode=sample&intent=compare'
        : '/explore?mode=sample';
    }
    if (params.mode === 'public') return '/explore?mode=public';
  }

  if (pathname === '/loans' && (params.pane === 'schedule' || params.pane === 'simulations')) {
    return `/loans?pane=${params.pane}`;
  }

  return pathname;
}

const safeModeTargets = new Set([
  workspaceAuthReturn('/explore', { mode: 'public' }),
  workspaceAuthReturn('/explore', { mode: 'sample' }),
  workspaceAuthReturn('/explore', { mode: 'sample', intent: 'compare' }),
  workspaceAuthReturn('/loans', { pane: 'schedule' }),
  workspaceAuthReturn('/loans', { pane: 'simulations' }),
]);

// The incoming /auth param is untrusted. Accept only canonical per-route modes;
// unknown keys, duplicated keys, relative traversal, and remote URLs are rejected.
export function allowedAuthReturn(value: unknown): string {
  if (typeof value !== 'string' || value !== value.trim()) return '/home';
  return workspacePath.test(value) || safeModeTargets.has(value) ? value : '/home';
}
