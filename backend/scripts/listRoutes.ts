import app from '../src/app';
import fs from 'fs';
import path from 'path';

interface RouteInfo {
  method: string;
  path: string;
}

const getRoutes = (): RouteInfo[] => {
  const routes: RouteInfo[] = [];

  const print = (pathPrefix: string, layer: any) => {
    if (layer.route) {
      const routePath = pathPrefix + (layer.route.path === '/' && pathPrefix ? '' : layer.route.path);
      const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
      methods.forEach((method) => {
        routes.push({ method, path: routePath });
      });
    } else if (layer.name === 'router' && layer.handle.stack) {
      let cleanPath = '';
      if (layer.regexp) {
        const match = layer.regexp.source
          .replace('\\/?(?=\\/|$)', '')
          .replace('^\\', '')
          .replace(/\\\//g, '/')
          .replace(/\(\?:\(\[\^\\\/]\+\?\)\)/g, ':id')
          .replace(/[\^\$\?]/g, '');
        cleanPath = match.replace(/\\\//g, '/');
      }
      layer.handle.stack.forEach((stackItem: any) => {
        print(pathPrefix + cleanPath, stackItem);
      });
    }
  };

  if ((app as any)._router && (app as any)._router.stack) {
    (app as any)._router.stack.forEach((layer: any) => {
      print('', layer);
    });
  }

  // Deduplicate and sort
  const uniqueRoutes = Array.from(
    new Set(routes.map((r) => `${r.method} ${r.path}`))
  ).map((item) => {
    const [method, ...rest] = item.split(' ');
    return { method, path: rest.join(' ') };
  });

  uniqueRoutes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
  return uniqueRoutes;
};

const routes = getRoutes();
console.table(routes);

const docsDir = path.join(__dirname, '../../docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const markdownContent = `# API Routes Audit

Generated at: ${new Date().toISOString()}

Total Routes: ${routes.length}

| Method | Path |
|---|---|
${routes.map((r) => `| ${r.method} | ${r.path} |`).join('\n')}
`;

fs.writeFileSync(path.join(docsDir, 'ROUTES.md'), markdownContent);
console.log(`Saved ${routes.length} routes to docs/ROUTES.md`);
