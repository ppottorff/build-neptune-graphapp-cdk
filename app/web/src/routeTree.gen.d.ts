import { Route as rootRoute } from './routes/__root';
import { Route as AuthenticatedImport } from './routes/_authenticated';
import { Route as AuthenticatedLayoutImport } from './routes/_authenticated/_layout';
import { Route as AuthSigninImport } from './routes/_auth/signin';
import { Route as AuthenticatedLayoutIndexImport } from './routes/_authenticated/_layout/index';
import { Route as AuthenticatedLayoutRegisterImport } from './routes/_authenticated/_layout/register';
import { Route as AuthenticatedLayoutGraphImport } from './routes/_authenticated/_layout/graph';
declare module '@tanstack/react-router' {
    interface FileRoutesByPath {
        '/_authenticated': {
            preLoaderRoute: typeof AuthenticatedImport;
            parentRoute: typeof rootRoute;
        };
        '/_auth/signin': {
            preLoaderRoute: typeof AuthSigninImport;
            parentRoute: typeof rootRoute;
        };
        '/_authenticated/_layout': {
            preLoaderRoute: typeof AuthenticatedLayoutImport;
            parentRoute: typeof AuthenticatedImport;
        };
        '/_authenticated/_layout/graph': {
            preLoaderRoute: typeof AuthenticatedLayoutGraphImport;
            parentRoute: typeof AuthenticatedLayoutImport;
        };
        '/_authenticated/_layout/register': {
            preLoaderRoute: typeof AuthenticatedLayoutRegisterImport;
            parentRoute: typeof AuthenticatedLayoutImport;
        };
        '/_authenticated/_layout/': {
            preLoaderRoute: typeof AuthenticatedLayoutIndexImport;
            parentRoute: typeof AuthenticatedLayoutImport;
        };
    }
}
export declare const routeTree: any;
