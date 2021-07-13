import * as React from 'react'
import Autocomplete from '@material-ui/lab/Autocomplete'
import { TextField } from '@material-ui/core'
import classNames from 'classnames'
import { useForm, Controller } from 'react-hook-form'

import * as nt from '@nekoton'
import Button from '@popup/components/Button'

type Props = {
    wordsCount: number
    onSubmit(words: string[]): void
    onBack(): void
}

export function ImportSeed({ wordsCount = 12, onBack, ...props }: Props): JSX.Element {
    const { control, handleSubmit, setValue } = useForm()

    const [hints, setHints] = React.useState<string[]>([])
    const numbers = React.useMemo(() => new Array(wordsCount).fill(1).map((_, i) => i + 1), [
        wordsCount,
    ])

    const onInputChange = (event: React.ChangeEvent<{}>, value: string) => {
        if (event == null || (event?.nativeEvent as InputEvent)?.inputType === 'insertFromPaste') {
            return
        }

        if (value) {
            setHints(nt.getBip39Hints(value))
        }
    }

    const onBlur = () => {
        setHints([])
    }

    const onPaste: React.ClipboardEventHandler<HTMLFormElement | HTMLInputElement> = (event) => {
        try {
            console.log('PASTE', event)
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
        } catch (e) {
            console.log(e.message)
        }
    }

    const onSubmit = (data: { [word: string]: string }) => {
        props.onSubmit(window.ObjectExt.values(data))
    }

    return (
        <div className="accounts-management">
            <header className="accounts-management__header">
                <h2 className="accounts-management__header-title">Enter seed phrase</h2>
            </header>

            <div className="accounts-management__wrapper">
                <form
                    id="words"
                    onSubmit={handleSubmit(onSubmit)}
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
                                        render={({ ref, name, value }) => (
                                            <Autocomplete
                                                value={value}
                                                id={`word${number}`}
                                                autoComplete
                                                fullWidth
                                                freeSolo
                                                options={hints}
                                                innerRef={ref}
                                                onBlur={onBlur}
                                                onInputChange={onInputChange}
                                                getOptionSelected={() => false}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        name={name}
                                                        variant="outlined"
                                                        inputProps={{
                                                            ...params.inputProps,
                                                            className: classNames(
                                                                'simple-input',
                                                                'accounts-management__seed-input-placeholder'
                                                            ),
                                                        }}
                                                        placeholder="Word..."
                                                    />
                                                )}
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
                                        render={({ ref, name, value }) => (
                                            <Autocomplete
                                                value={value}
                                                id={`word${number}`}
                                                autoComplete
                                                fullWidth
                                                freeSolo
                                                options={hints}
                                                innerRef={ref}
                                                onBlur={onBlur}
                                                onInputChange={onInputChange}
                                                getOptionSelected={() => false}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        name={name}
                                                        variant="outlined"
                                                        inputProps={{
                                                            ...params.inputProps,
                                                            className: classNames(
                                                                'simple-input',
                                                                'accounts-management__seed-input-placeholder'
                                                            ),
                                                        }}
                                                        placeholder="Word..."
                                                    />
                                                )}
                                            />
                                        )}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </form>

                <footer className="accounts-management__footer">
                    <div className="accounts-management__footer-button-back">
                        <Button text="Back" white onClick={onBack} />
                    </div>
                    <Button text="Confirm" form="words" onClick={handleSubmit(onSubmit)} />
                </footer>
            </div>
        </div>
    )
}
