import React from 'react'
import { IntlProvider } from 'react-intl'
import { noop } from '@popup/utils/noop'
import en from '@popup/lang/en'
import ko from '@popup/lang/ko'
import { useRpcState } from '@popup/providers/RpcStateProvider'

type Props = {
    children: React.ReactNode | React.ReactNode[]
}

export function LocalizationProvider({ children }: Props): JSX.Element {
    const rpcState = useRpcState()

    const messages = React.useMemo(
        () => ({ en, ko }[rpcState.state.selectedLocale]),
        [rpcState.state.selectedLocale]
    )

    return (
        <IntlProvider
            key="intl"
            locale={rpcState.state.selectedLocale}
            defaultLocale="en"
            messages={messages}
            onError={noop}
        >
            {children}
        </IntlProvider>
    )
}
