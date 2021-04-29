import Decimal from 'decimal.js'
import { memoize } from 'lodash'
import {
    Environment,
    ENVIRONMENT_TYPE_BACKGROUND,
    ENVIRONMENT_TYPE_NOTIFICATION,
    ENVIRONMENT_TYPE_POPUP,
} from '@shared/constants'

Decimal.set({ maxE: 500, minE: -500 })

export const ONE_TON = '1000000000'

export const formatSeed = (seed: string) => seed?.split(/[, ;\r\n\t]+/g).filter((el) => el !== '')

export const convertAddress = (address: string | undefined) =>
    address ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : ''

export const convertTons = (amount?: string) => new Decimal(amount || '0').div(ONE_TON).toString()

export const estimateUsd = (amount: string) => {
    return `${new Decimal(amount || '0').div(ONE_TON).mul('0.6').toFixed(2).toString()}`
}

export const parseTons = (amount: string) => {
    return new Decimal(amount).mul(ONE_TON).ceil().toFixed(0)
}

export const shuffleArray = <T>(array: T[]) => {
    let currentIndex = array.length
    let temporaryValue: T
    let randomIndex: number

    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex)
        currentIndex -= 1

        temporaryValue = array[currentIndex]
        array[currentIndex] = array[randomIndex]
        array[randomIndex] = temporaryValue
    }

    return array
}

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
