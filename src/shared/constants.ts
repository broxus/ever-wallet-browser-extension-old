export const ENVIRONMENT_TYPE_POPUP = 'popup'
export const ENVIRONMENT_TYPE_NOTIFICATION = 'notification'
export const ENVIRONMENT_TYPE_BACKGROUND = 'background'

export type Environment =
    | typeof ENVIRONMENT_TYPE_POPUP
    | typeof ENVIRONMENT_TYPE_NOTIFICATION
    | typeof ENVIRONMENT_TYPE_BACKGROUND

export const MESSAGE_TYPE = {
    TON_GET_PUBLIC_KEY: 'ton_getPublicKey',
    TON_SIGN: 'ton_sign',
    TON_SIGN_SEND: 'ton_sign_send',
}

export const CONTENT_SCRIPT = 'nekoton-contentscript'
export const INPAGE_SCRIPT = 'nekoton-inpage'
export const NEKOTON_PROVIDER = 'nekoton-provider'
