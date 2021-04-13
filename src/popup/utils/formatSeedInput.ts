export const formatSeed = (seed: string) => seed?.split(/[, ;\r\n\t]+/g).filter((el) => el !== '')
