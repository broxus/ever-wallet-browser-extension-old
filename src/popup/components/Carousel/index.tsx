import React, { useEffect } from 'react'
import RightArrow from '../../img/right-arrow.svg'
import LeftArrow from '../../img/left-arrow.svg'
import { useState } from 'react'
import './style.scss'

interface ICarousel {
    content: JSX.Element[]
}

const Carousel: React.FC<ICarousel> = ({ content }) => {
    const [active, setActive] = useState(0)

    useEffect(() => {
        console.log(active, 'active')
    }, [active])

    const decrementIndex = () => {
        setActive((active + content.length - 1) % content.length)
    }

    const incrementIndex = () => {
        setActive((active + 1) % content.length)
    }

    return (
        <>
            <div>{content[active] || <div>empty</div>}</div>
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
