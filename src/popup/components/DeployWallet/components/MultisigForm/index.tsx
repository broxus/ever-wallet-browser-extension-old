import * as React from 'react'
import classNames from 'classnames'
import { useForm } from 'react-hook-form'

import Button from '@popup/components/Button'
import Input from '@popup/components/Input'

export type MultisigData = {
    custodians: string[]
    reqConfirms: number
}

type Props = {
    data?: MultisigData
    onSubmit: (data: MultisigData) => void
}

export function MultisigForm({ data, onSubmit }: Props): JSX.Element {
    const { register, handleSubmit, getValues, setValue, formState } = useForm({
        defaultValues: data,
    })

    const [custodiansCount, setCustodiansCount] = React.useState(1)

    const addField = () => {
        setCustodiansCount(custodiansCount + 1)
    }

    const removeField = (idx: number) => {
        return () => {
            const { custodians } = getValues()
            custodians?.splice(idx, 1)
            custodians?.forEach((value: string, i: number) => {
                setValue(`custodians.${i}`, value)
            })
            setCustodiansCount(custodiansCount - 1)
        }
    }

    return (
        <div className="approval__wrapper">
            <form id="multisig" onSubmit={handleSubmit(onSubmit)}>
                <div className="deploy-wallet__content-form-rows">
                    <div className="deploy-wallet__content-form-row">
                        <div className="deploy-wallet__content-header">
                            Any transaction requires the confirmation of:
                        </div>
                        <div className="deploy-wallet__field-confirms">
                            <Input
                                autocomplete="off"
                                autoFocus
                                {...register('reqConfirms', {
                                    required: true,
                                    min: 1,
                                    max: custodiansCount,
                                })}
                                label="Enter number..."
                            />
                            <div className="deploy-wallet__field-placeholder">
                                out of {custodiansCount} custodians
                            </div>
                        </div>
                        {formState.errors.reqConfirms !== undefined && (
                            <>
                                {formState.errors.reqConfirms.type === 'max' && (
                                    <div className="deploy-wallet__content-error">
                                        You can specify no more than {custodiansCount} custodians.
                                    </div>
                                )}
                                {formState.errors.reqConfirms.type === 'required' && (
                                    <div className="deploy-wallet__content-error">
                                        Specify the number of custodians.
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="deploy-wallet__content-header--lead" style={{ marginTop: 0 }}>
                        Custodians
                    </div>

                    {new Array(custodiansCount).fill(1).map((_, idx) => {
                        const name = `custodians.${idx}` as const
                        return (
                            <div key={name} className="deploy-wallet__content-form-row">
                                <div className="deploy-wallet__content-header">
                                    Public key of Custodian {idx + 1}
                                </div>
                                <div
                                    className={classNames('deploy-wallet__field', {
                                        'deploy-wallet__field--removable': custodiansCount > 1,
                                    })}
                                >
                                    <Input
                                        autocomplete="off"
                                        {...register(name, {
                                            required: true,
                                            pattern: /^[a-fA-F0-9]{64}$/,
                                        })}
                                        label="Enter public key..."
                                        type="text"
                                    />
                                    {custodiansCount > 1 && (
                                        <a
                                            role="button"
                                            className="deploy-wallet__field-delete"
                                            onClick={removeField(idx)}
                                        >
                                            Delete
                                        </a>
                                    )}
                                </div>
                                {formState.errors.custodians?.[idx]?.type === 'pattern' && (
                                    <div className="deploy-wallet__content-error">
                                        It doesn't look like a public key
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    <div className="deploy-wallet__content-form-row">
                        <a
                            role="button"
                            className="deploy-wallet__content-form-add-field"
                            onClick={addField}
                        >
                            + Add one more public key
                        </a>
                    </div>
                </div>
            </form>

            <footer className="approval__footer">
                <Button text="Next" onClick={handleSubmit(onSubmit)} />
            </footer>
        </div>
    )
}
