import React, {Dispatch, SetStateAction, useState} from 'react'
import UserPic from '../../img/user-avatar-placeholder.svg'
import Input from '../Input/Input'
import Select from 'react-select'
import './send.scss'
import {Button} from '../button'
import {selectStyles} from '../../constants/selectStyle'
import {useForm} from 'react-hook-form'
import {AppState} from "../../store/app/types";
import {connect} from "react-redux";
import {addKey, calculateFee, createKey, getCurrentAccount, restoreKey} from "../../store/app/actions";

const options = [
    {value: '60', label: 'TON'},
    {value: '1', label: 'USDT'},
    {value: '60', label: 'BTC'},
    {value: '60', label: 'ETH'},
]

interface IOptionParams {
    data?: any
    isDisabled?: boolean
    isFocused?: boolean
    isSelected?: boolean
}

const TransactionSending = () => {
    return (
        <>
            <h2 className="send-screen__form-title">Transaction is sending</h2>
            <div className="send-screen__tx-sending"></div>
            <Button text={'OK'} type={'button'}/>
        </>
    )
}

const EnterPassword: React.FC<any> = ({currentFee, setStep, onReturn, data}) => {
    return (
        <>
            <h2 className="send-screen__form-title">Enter your password to confirm transaction</h2>
            <div className="send-screen__form-tx-details">
                <div className="send-screen__form-tx-details-param">
                    <span className="send-screen__form-tx-details-param-desc">You send</span>
                    <span className="send-screen__form-tx-details-param-value">{data.amount}</span>
                </div>
                <div className="send-screen__form-tx-details-param">
                    <span className="send-screen__form-tx-details-param-desc">Blockchain fee</span>
                    <span className="send-screen__form-tx-details-param-value">{currentFee}</span>
                </div>
                <div className="send-screen__form-tx-details-param">
                    <span className="send-screen__form-tx-details-param-desc">
                        Recipient address
                    </span>
                    <span className="send-screen__form-tx-details-param-value">
                        {`${data.address.slice(0, 6)}...${data.address.slice(-4)}`}
                    </span>
                </div>
            </div>
            <Input className="send-screen__form-comment" label={'Password...'} type="password"/>
            <div style={{display: 'flex'}}>
                <div style={{width: '50%', marginRight: '12px'}}>
                    <Button text={'Back'} onClick={onReturn} white/>
                </div>
                <Button text={'Confirm transaction'} onClick={() => setStep(2)}/>
            </div>
        </>
    )
}

const EnterAddress: React.FC<any> = ({account, setStep, onReturn, setFormData}) => {
    const {register, handleSubmit, errors, watch} = useForm()

    const onSubmit = (data) => {
        console.log(data);
        setFormData(data)

        calculateFee(account, {
            amount: data.amount,
            recipient: data.address,
        });

        setStep(1)
    }

    return (
        <>
            <div className="send-screen__account_details">
                <UserPic/> <span className="send-screen__account_details-title">Account 1</span>
            </div>

            <h2 className="send-screen__form-title">Enter receiver address</h2>
            <form id="send" onSubmit={handleSubmit(onSubmit)}>
                <Select
                    className="send-screen__form-token-dropdown"
                    options={options}
                    placeholder={'Select currency'}
                    styles={selectStyles}
                    w
                    // onChange={(token) => {
                    //     setToken(token)
                    // }}
                />
                <Input
                    label={'Amount...'}
                    register={register({
                        required: true,
                    })}
                    name="amount"
                />
                {errors.amount && (
                    <div className="send-screen__form-error">This field is required</div>
                )}
                <div className="send-screen__form-balance">Your balance: 1,100.00 USDT</div>
                <Input
                    label={'Receiver address...'}
                    register={register({
                        required: true,
                    })}
                    type="text"
                    name="address"
                />
                {errors.address && (
                    <div className="send-screen__form-error">This field is required</div>
                )}
                <Input
                    className="send-screen__form-comment"
                    name="comment"
                    label={'Comment...'}
                    type="text"
                />
            </form>
            <div style={{display: 'flex'}}>
                <div style={{width: '50%', marginRight: '12px'}}>
                    <Button text={'Back'} onClick={onReturn} white/>
                </div>
                <Button text={'Send'} type={'submit'} form="send"/>
            </div>
        </>
    )
}

interface IAddNewToken {
    onReturn: Dispatch<SetStateAction<boolean>>
}

const Send: React.FC<IAddNewToken> = ({onReturn}) => {
    const [step, setStep] = useState(0)
    // TODO replace with globale state
    const [formData, setFormData] = useState({})

    const content = [
        <EnterAddress
            setStep={setStep}
            onReturn={() => onReturn(false)}
            setFormData={setFormData}
        />,
        <EnterPassword setStep={setStep} onReturn={() => setStep(0)} data={formData}/>,
        <TransactionSending/>,
    ]
    // const [token, setToken] = useState<{ value: string; label: string } | null>([])
    return content[step]
}


const mapStateToProps = (store: { app: AppState }) => ({
    locale: store.app.locale,
    account: store.app.account,
    tonWalletState: store.app.tonWalletState,
    currentFee: store.app.currentFee,
})

export default connect(mapStateToProps, {
    createKey,
    addKey,
    restoreKey,
    getCurrentAccount,
    calculateFee
})(Send)
