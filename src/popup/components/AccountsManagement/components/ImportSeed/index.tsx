import * as React from 'react'
import classNames from 'classnames'
import { OptionsType } from 'rc-select/lib/interface'
import { LabelValueType } from 'rc-select/lib/interface/generator'
import { useForm, Controller } from 'react-hook-form'

import * as nt from '@nekoton'
import Button from '@popup/components/Button'
import { Select } from '@popup/components/Select'

type Props = {
    error?: string
    wordsCount: number
    onSubmit(words: string[]): void
    onBack(): void
}

export function ImportSeed({ error, wordsCount = 12, onSubmit, onBack }: Props): JSX.Element {
    const { control, handleSubmit, setValue } = useForm()

    const [hints, setHints] = React.useState<LabelValueType[]>([])
    const numbers = React.useMemo(
        () => new Array(wordsCount).fill(1).map((_, i) => i + 1),
        [wordsCount]
    )

    const onInputChange = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event == null || event.type === 'paste') {
            return
        }

        const { value } = event.target as HTMLInputElement

        if (value) {
            setHints(
                nt.getBip39Hints(value).map((word) => ({ key: word, label: word, value: word }))
            )
        }
    }

    const onBlur = () => {
        setHints([])
    }

    const onPaste: React.ClipboardEventHandler<HTMLFormElement | HTMLInputElement> = (event) => {
        try {
            const seedPhrase = event.clipboardData.getData('text/plain')
            const words = seedPhrase
                .replace(/\r\n|\r|\n/g, ' ')
                .replace(/\s\s+/g, ' ')
                .split(' ')
                .slice(0, wordsCount)

            if (words.length > 0 && words.length <= wordsCount) {
                setTimeout(() => {
                    words.forEach((word, idx) => {
                        setValue(`word${idx + 1}`, word)
                    })
                }, 0)
            }
        } catch (e: any) {
            console.log(e.message)
        }
    }

    const onChange = (cb: (...args: any[]) => void, number: number) => {
        return (...args: any[]) => {
            cb(args)
            try {
                const nextToFocus = document.getElementById(`select-index-${number + 1}`)
                if (nextToFocus != null) {
                    nextToFocus.focus?.()
                    nextToFocus.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            } catch (e: any) {}
        }
    }

    const doOnSubmit = (data: { [key: string]: [word: string, option: object] }) => {
        onSubmit(window.ObjectExt.values(data).map(([word]) => word))
    }

    return (
        <div className="accounts-management">
            <header className="accounts-management__header">
                <h2 className="accounts-management__header-title">Enter seed phrase</h2>
            </header>

            <div className="accounts-management__wrapper">
                <form
                    id="words"
                    onSubmit={handleSubmit(doOnSubmit)}
                    className="accounts-management__content-form"
                    onPaste={onPaste}
                >
                    <div className="accounts-management__seed-columns">
                        <div className="accounts-management__seed-column">
                            {numbers.slice(0, wordsCount / 2).map((number) => (
                                <div key={number} className="accounts-management__seed-input">
                                    <span className="accounts-management__seed-input-number">{`${number}. `}</span>
                                    <Controller
                                        control={control}
                                        defaultValue=""
                                        name={`word${number}`}
                                        rules={{
                                            required: true,
                                        }}
                                        render={({
                                            field: { ref, onChange: onChangeControl },
                                            fieldState: { invalid },
                                        }) => (
                                            <Select
                                                ref={ref}
                                                className={classNames({
                                                    invalid: invalid,
                                                })}
                                                id={`select-index-${number}`}
                                                listHeight={120}
                                                options={hints as unknown as OptionsType}
                                                placeholder="Word..."
                                                showArrow={false}
                                                showSearch
                                                onBlur={onBlur}
                                                getPopupContainer={(trigger) =>
                                                    trigger.closest('.rc-select') || document.body
                                                }
                                                onChange={onChange(onChangeControl, number)}
                                                onInputKeyDown={onInputChange}
                                            />
                                        )}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="accounts-management__seed-column">
                            {numbers.slice(wordsCount / 2, wordsCount).map((number) => (
                                <div key={number} className="accounts-management__seed-input">
                                    <span className="accounts-management__seed-input-number">{`${number}. `}</span>
                                    <Controller
                                        control={control}
                                        defaultValue=""
                                        name={`word${number}`}
                                        rules={{
                                            required: true,
                                        }}
                                        render={({
                                            field: { ref, onChange: onChangeControl },
                                            fieldState: { invalid },
                                        }) => (
                                            <Select
                                                ref={ref}
                                                className={classNames({
                                                    invalid: invalid,
                                                })}
                                                id={`select-index-${number}`}
                                                listHeight={120}
                                                options={hints as unknown as OptionsType}
                                                placeholder="Word..."
                                                showArrow={false}
                                                showSearch
                                                onBlur={onBlur}
                                                getPopupContainer={(trigger) =>
                                                    trigger.closest('.rc-select') || document.body
                                                }
                                                onChange={onChange(onChangeControl, number)}
                                                onInputKeyDown={onInputChange}
                                            />
                                        )}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    {error !== undefined && (
                        <div className="accounts-management__content-error">{error}</div>
                    )}
                </form>

                <footer className="accounts-management__footer">
                    <div className="accounts-management__footer-button-back">
                        <Button text="Back" white onClick={onBack} />
                    </div>
                    <Button text="Confirm" form="words" onClick={handleSubmit(doOnSubmit)} />
                </footer>
            </div>
        </div>
    )
}
