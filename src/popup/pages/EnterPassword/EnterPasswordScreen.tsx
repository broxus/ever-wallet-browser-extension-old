import React from 'react'
import { useForm } from 'react-hook-form'
import Input from '../../components/Input/Input'
import { Button } from '../../components/button'
import { connect } from 'react-redux'
import { restoreAccountFromSeed, setPassword } from '../../store/app/actions'
import { AppState } from '../../store/app/types'

const EnterPasswordScreen: React.FC<any> = ({ setStep, setPassword, seed, accountType }) => {
    const { register, handleSubmit, errors, watch, getValues } = useForm()

    const onSubmit = () => {
        setPassword(getValues('pwd'))
        restoreAccountFromSeed('Account 1', seed, accountType, getValues('pwd'))
        setStep(6)
    }

    return (
        <div className="create-password-page__content">
            <div className="create-password-page__content-pwd-form">
                <h2 className="create-password-page__content-pwd-form-header">
                    Password protection
                </h2>
                <h3 className="create-password-page__content-pwd-form-comment">
                    So no one else but you can unlock your wallet.
                </h3>
                <form id="password" onSubmit={handleSubmit(onSubmit)}>
                    <Input
                        label={'Your password'}
                        autoFocus
                        type={'password'}
                        name="pwd"
                        register={register({
                            required: true,
                            minLength: 6,
                        })}
                    />
                    <Input
                        label={'Confirm password'}
                        type={'password'}
                        name="pwdConfirm"
                        register={register({
                            required: true,
                            validate: (value) => value === watch('pwd'),
                        })}
                    />
                    {errors.pwd && (
                        <div className="check-seed__content-error">
                            The password is required and must be minimum 6 characters long
                        </div>
                    )}
                    {errors.pwdConfirm && (
                        <div className="check-seed__content-error">Your password doesn't match</div>
                    )}
                </form>
            </div>
            <div className="create-password-page__content-buttons">
                <Button text={'Sign in the wallet'} type="submit" form="password" />
                <Button text={'Back'} white onClick={() => setStep(8)} />
            </div>
        </div>
    )
}

const mapStateToProps = (store: { app: AppState }) => ({
    seed: store.app.seed,
    accountType: store.app.accountType,
})

export default connect(mapStateToProps, {
    setPassword,
})(EnterPasswordScreen)
