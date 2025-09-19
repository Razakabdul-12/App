import {render} from '@testing-library/react-native';
import React from 'react';
import OnboardingHelpDropdownButton from '@components/OnboardingHelpDropdownButton';
import {openExternalLink} from '@libs/actions/Link';
import CONST from '@src/CONST';

type ButtonPropsCapture = {
    onPress: (event: unknown, value: string) => void;
    options: {value: string; onSelected?: () => void}[];
    customText: string;
};

const mockButtonWithDropdownMenu = jest.fn<void, [ButtonPropsCapture]>();

jest.mock('@libs/actions/Link', () => ({
    openExternalLink: jest.fn(),
}));

jest.mock('@components/ButtonWithDropdownMenu', () => {
    const MockButton = ({onPress, options, customText}: ButtonPropsCapture) => {
        mockButtonWithDropdownMenu({onPress, options, customText});
        return null;
    };
    MockButton.displayName = 'ButtonWithDropdownMenu';
    return MockButton;
});

jest.mock('@hooks/useLocalize', () => () => ({
    translate: (key: string) => key,
}));

jest.mock('@hooks/useThemeStyles', () => () => ({
    earlyDiscountButton: [],
}));

const mockedOpenExternalLink = jest.mocked(openExternalLink);

describe('OnboardingHelpDropdownButton', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should not render when webinar registration is hidden', () => {
        render(
            <OnboardingHelpDropdownButton
                shouldUseNarrowLayout={false}
                shouldShowRegisterForWebinar={false}
            />,
        );

        expect(mockButtonWithDropdownMenu).not.toHaveBeenCalled();
    });

    it('should open webinar registration link when option is selected', () => {
        render(
            <OnboardingHelpDropdownButton
                shouldUseNarrowLayout={false}
                shouldShowRegisterForWebinar
            />,
        );

        expect(mockButtonWithDropdownMenu).toHaveBeenCalledTimes(1);
        const [[buttonProps]] = mockButtonWithDropdownMenu.mock.calls;
        const {onPress, options} = buttonProps;
        expect(options).toHaveLength(1);
        expect(options[0].value).toBe(CONST.ONBOARDING_HELP.REGISTER_FOR_WEBINAR);

        onPress(undefined, options[0].value);

        expect(mockedOpenExternalLink).toHaveBeenCalledTimes(1);
        expect(mockedOpenExternalLink).toHaveBeenCalledWith(CONST.REGISTER_FOR_WEBINAR_URL);
    });
});
