import CONST from '@src/CONST';
import type {Connections} from '@src/types/onyx/Policy';

// Provide minimal connection data for tests that rely on a workspace having accounting integrations enabled.
const connections = {
    [CONST.POLICY.CONNECTIONS.NAME.QBO]: {
        config: {
            autoSync: {
                enabled: false,
                jobID: '',
            },
        },
    },
    [CONST.POLICY.CONNECTIONS.NAME.QBD]: {
        config: {
            autoSync: {
                enabled: false,
            },
        },
    },
} as unknown as Connections;

export default connections;
