import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import Input from '../../components/Input/Input'
import { Button } from '../../components/button'
import { connect } from 'react-redux'
import { restoreAccountFromSeed, setPassword } from '../../store/app/actions'
import { AppState } from '../../store/app/types'
import Modal from '../../components/Modal/Modal'
import './enter-password.scss'

const EnterPasswordScreen: React.FC<any> = ({
    setStep,
    setPassword,
    seed,
    walletType,
    restoreAccountFromSeed,
    account,
    error,
}) => {
    const { register, handleSubmit, errors, watch, getValues } = useForm()
    const [modalOpen, setModalOpen] = useState(false)

    const onSubmit = async () => {
        setPassword(getValues('pwd'))
        await restoreAccountFromSeed('Account 1', seed.join(' '), walletType, getValues('pwd'))
    }

    useEffect(() => {
        console.log('account', account)
        console.log('error', error)
        if (account?.length > 0) {
            setStep(6)
        } else if (error) {
            console.log(error)
            setModalOpen(true)
        }
    }, [account, error])

    return (
        <div className="create-password-page__content">
            <div className="create-password-page__content-pwd-form">
                <h2 className="create-password-page__content-pwd-form-header">
                    Password protection
                </h2>
                <h3 className="create-password-page__content-pwd-form-comment">
                    So no one else but you can unlock your wallet.
                </h3>
                <form
                    id="password"
                    onSubmit={handleSubmit(onSubmit)}
                    style={{ position: 'relative' }}
                >
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
                    {modalOpen && (
                        <Modal
                            setModalVisible={setModalOpen}
                            className="enter-password-screen__modal"
                        >
                            <h3 style={{ color: 'black', marginBottom: '18px' }}>
                                Could not restore your wallet
                            </h3>
                            <div className="check-seed__content-error">{error.message}</div>
                        </Modal>
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
    walletType: store.app.walletType,
    account: store.app.account,
    error: store.app.error,
})

export default connect(mapStateToProps, {
    setPassword,
    restoreAccountFromSeed,
})(EnterPasswordScreen)
