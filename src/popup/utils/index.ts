import Decimal from 'decimal.js'
import { memoize } from 'lodash'
import {
    Environment,
    ENVIRONMENT_TYPE_BACKGROUND,
    ENVIRONMENT_TYPE_NOTIFICATION,
    ENVIRONMENT_TYPE_POPUP,
} from '@shared/constants'

Decimal.set({ maxE: 500, minE: -500 })

export const formatSeed = (seed: string) => seed?.split(/[, ;\r\n\t]+/g).filter((el) => el !== '')

const getEnvironmentTypeCached = memoize(
    (url): Environment => {
        const parseUrl = new URL(url)
        if (parseUrl.pathname === '/popup.html') {
            return ENVIRONMENT_TYPE_POPUP
        } else if (parseUrl.pathname === '/notification.html') {
            return ENVIRONMENT_TYPE_NOTIFICATION
        }
        return ENVIRONMENT_TYPE_BACKGROUND
    }
)

export const getEnvironmentType = (url = window.location.href) => getEnvironmentTypeCached(url)

export const getHost = (url: string, defaultProtocol = 'https://') => {
    const hasProtocol = url && url.match(/^[a-z]*:\/\//)
    const urlObj = new URL(hasProtocol ? url : `${defaultProtocol}${url}`)
    const { hostname } = urlObj
    return hostname
}

export const getIconUrl = (url: string) => {
    return `https://api.faviconkit.com/${getHost(url)}/64`
}
