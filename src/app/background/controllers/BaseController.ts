export type Listener<T> = (state: T) => void

export interface BaseConfig {
    disabled?: boolean
}

export interface BaseState {
    name?: string
}

export class BaseController<C extends BaseConfig, S extends BaseState> {
    defaultConfig: C = {} as C
    defaultState: S = {} as S
    disabled: boolean = false
    name = 'BaseController'

    private readonly initialConfig: C
    private readonly initialState: S
    private internalConfig: C = this.defaultConfig
    private internalState: S = this.defaultState
    private internalListeners: Listener<S>[] = []

    constructor(config: Partial<C> = {} as C, state: Partial<S> = {} as S) {
        this.initialConfig = config as C
        this.initialState = state as S
    }

    protected initialize() {
        this.internalConfig = this.defaultConfig
        this.internalState = this.defaultState
        this.configure(this.initialConfig)
        this.update(this.initialState)
        return this
    }

    get config() {
        return this.internalConfig
    }

    get state(): S {
        return this.internalState
    }

    configure(config: Partial<C>, overwrite = false, fullUpdate = true) {
        if (fullUpdate) {
            this.internalConfig = overwrite
                ? (config as C)
                : Object.assign(this.internalConfig, config)

            for (const key in this.internalConfig) {
                if (typeof this.internalConfig[key] !== 'undefined') {
                    ;(this as any)[key as string] = this.internalConfig[key]
                }
            }
        } else {
            for (const key in config) {
                if (typeof this.internalConfig[key] !== 'undefined') {
                    this.internalConfig[key] = config[key] as any
                    ;(this as any)[key as string] = config[key]
                }
            }
        }
    }

    notify() {
        if (this.disabled) {
            return
        }
        this.internalListeners.forEach((listener) => {
            listener(this.initialState)
        })
    }

    subscribe(listener: Listener<S>) {
        this.internalListeners.push(listener)
    }

    unsubscribe(listener: Listener<S>) {
        const index = this.internalListeners.findIndex((cb) => listener === cb)
        index > -1 && this.internalListeners.splice(index, 1)
        return index > -1
    }

    update(state: Partial<S>, overwrite = false) {
        this.internalState = overwrite
            ? Object.assign({}, state as S)
            : Object.assign({}, this.internalState, state)
        this.notify()
    }
}
