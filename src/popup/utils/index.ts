import Decimal from 'decimal.js'

Decimal.set({ maxE: 500, minE: -500 })

export const formatSeed = (seed: string) => seed?.split(/[, ;\r\n\t]+/g).filter((el) => el !== '')

export const getHost = (url: string, defaultProtocol = 'https://') => {
    const hasProtocol = url && url.match(/^[a-z]*:\/\//)
    const urlObj = new URL(hasProtocol ? url : `${defaultProtocol}${url}`)
    const { hostname } = urlObj
    return hostname
}

export const getIconUrl = (url: string) => {
    return `https://api.faviconkit.com/${getHost(url)}/64`
}
