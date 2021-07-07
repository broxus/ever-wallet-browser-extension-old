import * as React from 'react'
import ReactSlick from 'react-slick'

import RightArrow from '@popup/img/right-arrow.svg'
import LeftArrow from '@popup/img/left-arrow.svg'

import './style.scss'


type Props = {
    children: React.ReactNode;
    initialSlide?: number;
    onInit?(): void;
    onReInit?(): void;
    afterChange?(index: number): void;
    beforeChange?(prevIndex: number, nextIndex: number): void;
}

export const Carousel = React.forwardRef<ReactSlick, Props>(({
    children,
    initialSlide = 0,
    onInit,
    onReInit,
    afterChange,
    beforeChange,
}, ref) => {
    return (
        <ReactSlick
            ref={ref}
            afterChange={afterChange}
            beforeChange={beforeChange}
            arrows
            nextArrow={<img src={RightArrow} alt="" />}
            prevArrow={<img src={LeftArrow} alt="" />}
            dots
            draggable={false}
            infinite={false}
            initialSlide={initialSlide}
            onInit={onInit}
            onReInit={onReInit}
            slidesToScroll={1}
            slidesToShow={1}
            swipe={false}
        >
            {children}
        </ReactSlick>
    )
})
