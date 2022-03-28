import { BaseConfig, BaseController, BaseState } from './BaseController'

const DEFAULT_LOCALE: string = 'en'

export interface LocalizationControllerConfig extends BaseConfig {}

export interface LocalizationControllerState extends BaseState {
    selectedLocale: string
}

function makeDefaultState(): LocalizationControllerState {
    return {
        selectedLocale: DEFAULT_LOCALE,
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
        this.update({ selectedLocale })
    }

    public async setLocale(locale: string) {
        // TODO: validate locale

        await LocalizationController._saveSelectedLocale(locale)
        this.update({ selectedLocale: locale })
    }

    private static async _loadSelectedLocale(): Promise<string> {
        const { selectedLocale } = await window.browser.storage.local.get(['selectedLocale'])
        if (typeof selectedLocale === 'string') {
            return selectedLocale
        } else {
            return DEFAULT_LOCALE
        }
    }

    private static async _saveSelectedLocale(locale: string): Promise<void> {
        await window.browser.storage.local.set({ selectedLocale: locale })
    }
}
