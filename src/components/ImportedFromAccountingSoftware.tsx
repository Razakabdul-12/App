import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import useLocalize from '@hooks/useLocalize';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';
import {getIntegrationIcon} from '@libs/ReportUtils';
import * as Environment from '@libs/Environment/Environment';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import type {ConnectionName} from '@src/types/onyx/Policy';
import Icon from './Icon';
import Text from './Text';
import TextBlock from './TextBlock';
import TextLinkBlock from './TextLinkBlock';

type ImportedFromAccountingSoftwareProps = {
    /** The policy ID to link to */
    policyID: string;

    /** The name of the current connection */
    currentConnectionName: string;

    /** The connected integration */
    connectedIntegration: ConnectionName | undefined;

    /** The translated text for the "imported from" message */
    translatedText: string;
};

function ImportedFromAccountingSoftware({policyID, currentConnectionName, translatedText, connectedIntegration}: ImportedFromAccountingSoftwareProps) {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const {translate} = useLocalize();
    const [workspaceAccountingURL, setWorkspaceAccountingURL] = useState('');
    const icon = getIntegrationIcon(connectedIntegration);

    useEffect(() => {
        if (!policyID) {
            setWorkspaceAccountingURL('');
            return;
        }

        Environment.getOldDotEnvironmentURL().then((oldDotEnvironmentURL) => {
            const param = encodeURIComponent(`{"policyID": "${policyID}"}`);
            setWorkspaceAccountingURL(`${oldDotEnvironmentURL}/policy?param=${param}#connections`);
        });
    }, [policyID]);

    return (
        <View style={[styles.alignItemsCenter, styles.flexRow, styles.flexWrap]}>
            <TextBlock
                textStyles={[styles.textNormal, styles.colorMuted]}
                text={`${translatedText} `}
            />
            <TextLinkBlock
                style={[styles.textNormal, styles.link]}
                href={workspaceAccountingURL || undefined}
                text={`${currentConnectionName} ${translate('workspace.accounting.settings')}`}
                prefixIcon={
                    icon ? (
                        <Icon
                            src={icon}
                            height={variables.iconSizeMedium}
                            width={variables.iconSizeMedium}
                            additionalStyles={[StyleUtils.getAvatarBorderStyle(CONST.AVATAR_SIZE.SMALLER, ''), styles.appBG]}
                        />
                    ) : undefined
                }
            />
            <Text style={[styles.textNormal, styles.colorMuted]}>.</Text>
        </View>
    );
}

ImportedFromAccountingSoftware.displayName = 'ImportedFromAccountingSoftware';

export default ImportedFromAccountingSoftware;
