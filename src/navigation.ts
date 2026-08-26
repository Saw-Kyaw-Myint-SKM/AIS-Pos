export type PrinterReturnRoute =
  | { name: 'home' }
  | { name: 'receipt'; saleId: number }
  | { name: 'saleDetail'; saleId: number };

export type Route =
  | { name: 'register' }
  | { name: 'home' }
  | { name: 'sell' }
  | { name: 'clothes' }
  | { name: 'history' }
  | { name: 'receipt'; saleId: number }
  | { name: 'saleDetail'; saleId: number }
  | { name: 'saleEdit'; saleId: number }
  | { name: 'itemForm'; itemId?: number }
  | { name: 'categoryForm'; categoryId?: number }
  | { name: 'settings' }
  | { name: 'printer'; returnTo?: PrinterReturnRoute }
  | { name: 'stockAlert' };

/**
 * Returns the manual-router destination for Android's hardware Back action.
 * A null result deliberately leaves the event to Android so it can exit from
 * the application's top-level routes.
 */
export function getBackRoute(route: Route): Route | null {
  switch (route.name) {
    case 'register':
    case 'home':
      return null;
    case 'sell':
    case 'clothes':
    case 'history':
    case 'settings':
    case 'stockAlert':
      return { name: 'home' };
    case 'receipt':
      return { name: 'sell' };
    case 'saleDetail':
      return { name: 'history' };
    case 'saleEdit':
      return { name: 'saleDetail', saleId: route.saleId };
    case 'itemForm':
    case 'categoryForm':
      return { name: 'clothes' };
    case 'printer':
      return route.returnTo ?? { name: 'home' };
  }
}
