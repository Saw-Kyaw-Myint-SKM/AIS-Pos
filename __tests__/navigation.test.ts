import { getBackRoute, type Route } from '../src/navigation';

describe('getBackRoute', () => {
  test.each<Route>([
    { name: 'sell' },
    { name: 'clothes' },
    { name: 'history' },
    { name: 'settings' },
    { name: 'stockAlert' },
  ])('returns Home from %s.name', (route) => {
    expect(getBackRoute(route)).toEqual({ name: 'home' });
  });

  test.each<[Route, Route]>([
    [{ name: 'receipt', saleId: 42 }, { name: 'sell' }],
    [{ name: 'saleDetail', saleId: 42 }, { name: 'history' }],
    [{ name: 'saleEdit', saleId: 42 }, { name: 'saleDetail', saleId: 42 }],
    [{ name: 'itemForm' }, { name: 'clothes' }],
    [{ name: 'itemForm', itemId: 7 }, { name: 'clothes' }],
    [{ name: 'categoryForm' }, { name: 'clothes' }],
    [{ name: 'categoryForm', categoryId: 7 }, { name: 'clothes' }],
  ])('returns the immediate parent from $0.name', (route, expected) => {
    expect(getBackRoute(route)).toEqual(expected);
  });

  test.each<Route>([
    { name: 'printer' },
    { name: 'printer', returnTo: { name: 'home' } },
    { name: 'printer', returnTo: { name: 'receipt', saleId: 42 } },
    { name: 'printer', returnTo: { name: 'saleDetail', saleId: 42 } },
  ])('preserves the printer return route for %o', (route) => {
    const expected = route.name === 'printer' && route.returnTo
      ? route.returnTo
      : { name: 'home' };
    expect(getBackRoute(route)).toEqual(expected);
  });

  test.each<Route>([{ name: 'home' }, { name: 'register' }])(
    'lets Android handle Back from %s.name',
    (route) => {
      expect(getBackRoute(route)).toBeNull();
    },
  );
});
