import * as React from 'react'
import ReactSlick from 'react-slick'

import RightArrow from '@popup/img/right-arrow.svg'
import LeftArrow from '@popup/img/left-arrow.svg'

import './style.scss'


type Props = {
    children: React.ReactNode;
    initialSlide?: number;
    onChange?(currentIndex: number): void;
}

export function Carousel({ children, initialSlide = 0, onChange }: Props): JSX.Element {
    return (
        <ReactSlick
            initialSlide={initialSlide}
            afterChange={onChange}
            draggable={false}
            nextArrow={<img src={RightArrow} alt="" />}
            prevArrow={<img src={LeftArrow} alt="" />}
            dots
            swipe={false}
            slidesToScroll={1}
            slidesToShow={1}
            infinite={false}
        >
            {children}
        </ReactSlick>
    )
}
