import * as React from 'react'
import { useIntl } from 'react-intl'
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
    const intl = useIntl()
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
                            {intl.formatMessage({ id: 'DEPLOY_MULTISIG_FORM_CONTENT_HEADER' })}
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
                                label={intl.formatMessage({ id: 'ENTER_NUMBER_PLACEHOLDER' })}
                            />
                            <div className="deploy-wallet__field-placeholder">
                                {intl.formatMessage(
                                    { id: 'DEPLOY_MULTISIG_FORM_FIELD_COUNT_HINT' },
                                    { count: custodiansCount }
                                )}
                            </div>
                        </div>
                        {formState.errors.reqConfirms !== undefined && (
                            <>
                                {formState.errors.reqConfirms.type === 'max' && (
                                    <div className="deploy-wallet__content-error">
                                        {intl.formatMessage(
                                            { id: 'DEPLOY_MULTISIG_FORM_VALIDATION_MAX' },
                                            { count: custodiansCount }
                                        )}
                                    </div>
                                )}
                                {formState.errors.reqConfirms.type === 'required' && (
                                    <div className="deploy-wallet__content-error">
                                        {intl.formatMessage({
                                            id: 'DEPLOY_MULTISIG_FORM_VALIDATION_REQUIRED',
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="deploy-wallet__content-header--lead" style={{ marginTop: 0 }}>
                        {intl.formatMessage({
                            id: 'DEPLOY_MULTISIG_FORM_LIST_CUSTODIANS_HEADER',
                        })}
                    </div>

                    {new Array(custodiansCount).fill(1).map((_, idx) => {
                        const name = `custodians.${idx}` as const
                        return (
                            <div key={name} className="deploy-wallet__content-form-row">
                                <div className="deploy-wallet__content-header">
                                    {intl.formatMessage(
                                        {
                                            id: 'DEPLOY_MULTISIG_FORM_CUSTODIAN_FIELD_LABEL',
                                        },
                                        { index: idx + 1 }
                                    )}
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
                                        label={intl.formatMessage({
                                            id: 'ENTER_PUBLIC_KEY_FIELD_PLACEHOLDER',
                                        })}
                                        type="text"
                                    />
                                    {custodiansCount > 1 && (
                                        <a
                                            role="button"
                                            className="deploy-wallet__field-delete"
                                            onClick={removeField(idx)}
                                        >
                                            {intl.formatMessage({
                                                id: 'DELETE_BTN_TEXT',
                                            })}
                                        </a>
                                    )}
                                </div>
                                {formState.errors.custodians?.[idx]?.type === 'pattern' && (
                                    <div className="deploy-wallet__content-error">
                                        {intl.formatMessage({
                                            id: 'DEPLOY_MULTISIG_FORM_VALIDATION_INVALID',
                                        })}
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
                            {intl.formatMessage({
                                id: 'DEPLOY_MULTISIG_FORM_ADD_FIELD_LINK_TEXT',
                            })}
                        </a>
                    </div>
                </div>
            </form>

            <footer className="approval__footer">
                <Button
                    text={intl.formatMessage({ id: 'NEXT_BTN_TEXT' })}
                    onClick={handleSubmit(onSubmit)}
                />
            </footer>
        </div>
    )
}
