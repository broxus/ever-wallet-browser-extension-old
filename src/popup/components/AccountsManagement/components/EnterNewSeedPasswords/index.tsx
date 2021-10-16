import * as React from 'react'
import { useForm } from 'react-hook-form'

import Button from '@popup/components/Button'
import Input from '@popup/components/Input'

type Props = {
    disabled?: boolean
    error?: string
    onSubmit(password: string): void
    onBack(): void
}

export function EnterNewSeedPasswords({ disabled, error, onBack, ...props }: Props): JSX.Element {
    const { register, handleSubmit, watch, formState } = useForm()

    const onSubmit = ({ password }: { password: string }) => {
        props.onSubmit(password)
    }

    return (
        <div className="accounts-management">
            <header className="accounts-management__header">
                <h2 className="accounts-management__header-title">
                    Enter password to confirm adding
                </h2>
            </header>

            <div className="accounts-management__wrapper">
                <form id="password" onSubmit={handleSubmit(onSubmit)}>
                    <div className="accounts-management__content-form-rows">
                        <div className="accounts-management__content-form-row">
                            <Input
                                {...register('password', {
                                    required: true,
                                    minLength: 6,
                                })}
                                disabled={disabled}
                                label="Your password"
                                autoFocus
                                type="password"
                            />
                            {formState.errors.password && (
                                <div className="accounts-management__content-error">
                                    The password is required and must be minimum 6 characters long
                                </div>
                            )}
                        </div>

                        <div className="accounts-management__content-form-row">
                            <Input
                                {...register('passwordConfirm', {
                                    required: true,
                                    validate: (value) => value === watch('password'),
                                })}
                                disabled={disabled}
                                label="Confirm password"
                                type="password"
                            />
                            {formState.errors.passwordConfirm && (
                                <div className="accounts-management__content-error">
                                    Your password doesn't match
                                </div>
                            )}
                        </div>
                    </div>
                    {error !== undefined && (
                        <div className="accounts-management__content-error">{error}</div>
                    )}
                </form>

                <footer className="accounts-management__footer">
                    <div className="accounts-management__footer-button-back">
                        <Button text="Back" disabled={disabled} white onClick={onBack} />
                    </div>
                    <Button text="Confirm" disabled={disabled} onClick={handleSubmit(onSubmit)} />
                </footer>
            </div>
        </div>
    )
}
