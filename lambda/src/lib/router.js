// Minimal path matcher: "/api/menu/items/:id" style routes.
// Returns { handler, params } or null.
function matchRoute(method, path, routes) {
  const segments = path.split('/').filter(Boolean);

  for (const route of routes) {
    if (route.method !== method) continue;

    const routeSegments = route.path.split('/').filter(Boolean);
    if (routeSegments.length !== segments.length) continue;

    const params = {};
    let matches = true;
    for (let i = 0; i < routeSegments.length; i++) {
      if (routeSegments[i].startsWith(':')) {
        params[routeSegments[i].slice(1)] = decodeURIComponent(segments[i]);
      } else if (routeSegments[i] !== segments[i]) {
        matches = false;
        break;
      }
    }

    if (matches) return { handler: route.handler, params, auth: route.auth };
  }

  return null;
}

module.exports = { matchRoute };
