import type {ConnectionName} from '@src/types/onyx/Policy';

const ROUTE_NAME_MAPPING: Record<string, ConnectionName> = {};

const NAME_ROUTE_MAPPING: Record<string, string> = {};

function getConnectionNameFromRouteParam(routeParam: string | undefined) {
    if (!routeParam) {
        return undefined;
    }

    return ROUTE_NAME_MAPPING[routeParam];
}

function getRouteParamForConnection(connectionName: ConnectionName) {
    return NAME_ROUTE_MAPPING[connectionName];
}

export {getConnectionNameFromRouteParam, getRouteParamForConnection};
