import React from 'react'
import { useState } from 'react'

import RightArrow from '@popup/img/right-arrow.svg'
import LeftArrow from '@popup/img/left-arrow.svg'

import './style.scss'
import { ControllerState, IControllerRpcClient } from '@popup/utils/ControllerRpcClient'

interface ICarousel {
    content: JSX.Element[]
    controllerRpc: IControllerRpcClient
    accountEntries: any
    accounts: string[]
}

const Carousel: React.FC<ICarousel> = ({ content, controllerRpc, accountEntries, accounts }) => {
    const [active, setActive] = useState(0)

    const decrementIndex = async () => {
        try {
            const curr = accounts[active]
            await controllerRpc.selectAccount(accountEntries[curr]?.[0]?.tonWallet?.address)
            console.log('switched successfully')
        } catch (e) {
            console.log(e)
        }
        setActive((active + content.length - 1) % content.length)
    }

    const incrementIndex = async () => {
        try {
            const curr = accounts[active]
            await controllerRpc.selectAccount(accountEntries[curr]?.[0]?.tonWallet?.address)
            console.log('switched successfully')
        } catch (e) {
            console.log(e)
        }
        setActive((active + 1) % content.length)
    }

    return (
        <>
            <div className="carousel__content">
                {/*    <div className="row">*/}
                {/*        <div className="row__inner">*/}
                {/*            {content.map((el, i) => (*/}
                {/*                <div className={`tile${i === active ? ' -active' : ''} `}>*/}
                {/*                    <div className="tile__media">{el}</div>*/}
                {/*                </div>*/}
                {/*            ))}*/}
                {/*        </div>*/}
                {/*    </div>*/}
                {/*</div>*/}
                <div className="carousel__content__slide">{content[active]}</div>
            </div>
            <div className="carousel__navigation">
                <div className="carousel__navigation-dots">
                    {content.map((_el, i) => (
                        <div
                            key={i}
                            className={`carousel__navigation-dots-elem${
                                active === i ? '--active' : ''
                            }`}
                        />
                    ))}
                </div>
                <div className="carousel__navigation-arrows">
                    <div
                        className="carousel__navigation-arrows-elem"
                        onClick={() => decrementIndex()}
                    >
                        <img src={LeftArrow} alt="" />
                    </div>
                    <div
                        className="carousel__navigation-arrows-elem"
                        onClick={() => incrementIndex()}
                    >
                        <img src={RightArrow} alt="" />
                    </div>
                </div>
            </div>
        </>
    )
}

export default Carousel
