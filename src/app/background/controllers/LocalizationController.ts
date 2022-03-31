import { BaseConfig, BaseController, BaseState } from './BaseController'

const DEFAULT_LOCALE: string = 'en'

export interface LocalizationControllerConfig extends BaseConfig {}

export interface LocalizationControllerState extends BaseState {
    defaultLocale: string
    selectedLocale?: string | undefined
}

function makeDefaultState(): LocalizationControllerState {
    return {
        defaultLocale: DEFAULT_LOCALE,
        selectedLocale: undefined,
    }
}

export class LocalizationController extends BaseController<
    LocalizationControllerConfig,
    LocalizationControllerState
> {
    constructor(config: LocalizationControllerConfig, state?: LocalizationControllerState) {
        super(config, state || makeDefaultState())

        this.initialize()
    }

    public async initialSync() {
        const selectedLocale = await LocalizationController._loadSelectedLocale()
        this.update({ defaultLocale: DEFAULT_LOCALE, selectedLocale })
    }

    public async setLocale(locale: string) {
        // TODO: validate locale

        await LocalizationController._saveSelectedLocale(locale)
        this.update({ selectedLocale: locale })
    }

    private static async _loadSelectedLocale(): Promise<string | undefined> {
        const { selectedLocale } = await window.browser.storage.local.get(['selectedLocale'])
        if (typeof selectedLocale === 'string') {
            return selectedLocale
        } else {
            return undefined
        }
    }

    private static async _saveSelectedLocale(locale: string): Promise<void> {
        await window.browser.storage.local.set({ selectedLocale: locale })
    }
}
