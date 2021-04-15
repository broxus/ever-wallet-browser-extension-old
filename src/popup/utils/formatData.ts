import Decimal from 'decimal.js'

export const formatSeed = (seed: string) => seed?.split(/[, ;\r\n\t]+/g).filter((el) => el !== '')

export const convertAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`

export const convertTons = (amount: string) => new Decimal(amount).div(1000000000).toString()
