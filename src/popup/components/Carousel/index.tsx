import * as React from 'react'
import classNames from 'classnames'
import { Carousel as ReactCarousel } from 'react-responsive-carousel'


import RightArrow from '@popup/img/right-arrow.svg'
import LeftArrow from '@popup/img/left-arrow.svg'

import './style.scss'


type Props = {
    centerMode?: boolean;
    children: React.ReactNode;
    selectedItem?: number;
    transitionTime?: number;
    onChange?(index: number): void;
}

export const Carousel = React.forwardRef<ReactCarousel, Props>(({
    centerMode= true,
    children,
    selectedItem = 0,
    transitionTime = 200,
    onChange
}, ref) => {
    return (
        <ReactCarousel
            ref={ref}
            autoPlay={false}
            centerMode={centerMode}
            centerSlidePercentage={100}
            infiniteLoop={false}
            renderArrowNext={(clickHandler, hasNext, label )  => (
                <a
                    role="button"
                    aria-label={label}
                    className={classNames([
                        'control-arrow',
                        'control-next',
                    ], {
                        'control-disabled': !hasNext
                    })}
                    onClick={clickHandler}
                >
                    <img src={RightArrow} alt="" />
                </a>
            )}
            renderArrowPrev={(clickHandler, hasPrev, label) => (
                <a
                    role="button"
                    aria-label={label}
                    className={classNames([
                        'control-arrow',
                        'control-prev',
                    ], {
                        'control-disabled': !hasPrev
                    })}
                    onClick={clickHandler}
                >
                    <img src={LeftArrow} alt="" />
                </a>
            )}
            selectedItem={selectedItem}
            showThumbs={false}
            showStatus={false}
            swipeable={false}
            transitionTime={transitionTime}
            onChange={onChange}
        >
            {children as React.ReactChild[]}
        </ReactCarousel>
    )
})
