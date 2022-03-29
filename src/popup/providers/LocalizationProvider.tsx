import React from 'react'
import { IntlProvider } from 'react-intl'
import { noop } from '@popup/utils/noop'
import en from '@popup/lang/en'
import ko from '@popup/lang/ko'

export type Locale = 'en' | 'ko'

export type LocalizationContextConsumerProps = {
    defaultLocale: Locale
    locale: Locale
    messages: Record<Locale, Record<string, string>>
    setLocale(locale: Locale): void
}

export const LocalizationContext = React.createContext<LocalizationContextConsumerProps>({
    defaultLocale: 'en',
    locale: 'en',
    messages: {
        en: {},
        ko: {},
    },
    setLocale() {},
})

type Props = {
    children: React.ReactNode | React.ReactNode[]
}

export function LocalizationProvider({ children }: Props): JSX.Element {
    const context = React.useContext(LocalizationContext)

    // todo: retrieve from rpc state
    const [locale, setInternalLocale] = React.useState(() => 'en')

    const setLocale = (locale: Locale) => {
        setInternalLocale(locale)
        // todo: set to rpc state
    }

    const messages = React.useMemo(() => ({ en, ko }[locale]), [locale])

    return (
        <LocalizationContext.Provider value={{ ...context, setLocale }}>
            <IntlProvider
                key="intl"
                locale={locale}
                defaultLocale="en"
                messages={messages}
                onError={noop}
            >
                {children}
            </IntlProvider>
        </LocalizationContext.Provider>
    )
}
