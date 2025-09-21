import type {LocaleContextProps} from '@components/LocaleContextProvider';
import type {Card, Policy} from '@src/types/onyx';
import type {PolicyConnectionName} from '@src/types/onyx/Policy';

function getExportMenuItem(
    _connectionName: PolicyConnectionName | undefined,
    _policyID: string,
    _translate: LocaleContextProps['translate'],
    _policy?: Policy,
    _companyCard?: Card,
    _backTo?: string | undefined,
) {
    return undefined;
}

// eslint-disable-next-line import/prefer-default-export
export {getExportMenuItem};
