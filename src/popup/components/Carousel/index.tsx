import React from 'react'
import { useState } from 'react'

import RightArrow from '@popup/img/right-arrow.svg'
import LeftArrow from '@popup/img/left-arrow.svg'

import './style.scss'

interface ICarousel {
    content: JSX.Element[]
}

const Carousel: React.FC<ICarousel> = ({ content }) => {
    const [active, setActive] = useState(0)

    const decrementIndex = () => {
        setActive((active + content.length - 1) % content.length)
    }

    const incrementIndex = () => {
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
                        <LeftArrow />
                    </div>
                    <div
                        className="carousel__navigation-arrows-elem"
                        onClick={() => incrementIndex()}
                    >
                        <RightArrow />
                    </div>
                </div>
            </div>
        </>
    )
}

export default Carousel
