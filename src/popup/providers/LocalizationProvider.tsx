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

    const locale = rpcState.state.selectedLocale || rpcState.state.defaultLocale

    const messages = React.useMemo(() => ({ en, ko }[locale]), [locale])

    return (
        <IntlProvider
            key="intl"
            locale={locale}
            defaultLocale={rpcState.state.defaultLocale}
            messages={messages}
            onError={noop}
        >
            {children}
        </IntlProvider>
    )
}
