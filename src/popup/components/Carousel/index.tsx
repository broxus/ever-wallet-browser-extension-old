import React from 'react'
import { useEffect, useReducer, useRef } from 'react'

const slides = [
    {
        title: 'Machu Picchu',
        subtitle: 'Peru',
        description: 'Adventure is never far away',
        image:
            'https://images.unsplash.com/photo-1571771019784-3ff35f4f4277?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=800&fit=max&ixid=eyJhcHBfaWQiOjE0NTg5fQ',
    },
    {
        title: 'Chamonix',
        subtitle: 'France',
        description: 'Let your dreams come true',
        image:
            'https://images.unsplash.com/photo-1581836499506-4a660b39478a?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=800&fit=max&ixid=eyJhcHBfaWQiOjE0NTg5fQ',
    },
    {
        title: 'Mimisa Rocks',
        subtitle: 'Australia',
        description: 'A piece of heaven',
        image:
            'https://images.unsplash.com/photo-1566522650166-bd8b3e3a2b4b?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=800&fit=max&ixid=eyJhcHBfaWQiOjE0NTg5fQ',
    },
    {
        title: 'Four',
        subtitle: 'Australia',
        description: 'A piece of heaven',
        image:
            'https://images.unsplash.com/flagged/photo-1564918031455-72f4e35ba7a6?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=800&fit=max&ixid=eyJhcHBfaWQiOjE0NTg5fQ',
    },
    {
        title: 'Five',
        subtitle: 'Australia',
        description: 'A piece of heaven',
        image:
            'https://images.unsplash.com/photo-1579130781921-76e18892b57b?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=800&fit=max&ixid=eyJhcHBfaWQiOjE0NTg5fQ',
    },
]

// @ts-ignore

const useTilt = (active) => {
    const ref = useRef(null)

    useEffect(() => {
        if (!ref.current || !active) {
            return
        }

        const state = {
            rect: undefined,
            mouseX: undefined,
            mouseY: undefined,
        }

        let el = ref.current

        const handleMouseMove = (e: { clientX: undefined; clientY: undefined }) => {
            if (!el) {
                return
            }
            if (!state.rect && el) {
                // @ts-ignore
                state.rect = el.getBoundingClientRect()
            }
            state.mouseX = e.clientX
            state.mouseY = e.clientY
            // @ts-ignore
            const px = (state.mouseX - state.rect.left) / state.rect.width
            // @ts-ignore
            const py = (state.mouseY - state.rect.top) / state.rect.height
            // @ts-ignore
            el.style.setProperty('--px', px)
            // @ts-ignore
            el.style.setProperty('--py', py)
        }
        // @ts-ignore
        el.addEventListener('mousemove', handleMouseMove)

        return () => {
            // @ts-ignore
            el.removeEventListener('mousemove', handleMouseMove)
        }
    }, [active])

    return ref
}

const initialState = {
    slideIndex: 0,
}

// @ts-ignore
const slidesReducer = (state: { slideIndex: number }, event: { type: string }) => {
    if (event.type === 'NEXT') {
        return {
            ...state,
            slideIndex: (state.slideIndex + 1) % slides.length,
        }
    }
    if (event.type === 'PREV') {
        return {
            ...state,
            slideIndex: state.slideIndex === 0 ? slides.length - 1 : state.slideIndex - 1,
        }
    }
}

// @ts-ignore
const Slide = ({ slide, offset })  => {
    const active = offset === 0 ? true : null
    const ref = useTilt(active)

    return (
        <div
            ref={ref}
            className="slide"
            data-active={active}
            style={{
                // @ts-ignore
                '--offset': offset,
                '--dir': offset === 0 ? 0 : offset > 0 ? 1 : -1,
            }}
        >
            <div
                className="slideBackground"
                style={{
                    backgroundImage: `url('${slide.image}')`,
                }}
            />
            <div
                className="slideContent"
                style={{
                    backgroundImage: `url('${slide.image}')`,
                }}
            >
                <div className="slideContentInner">
                    <h2 className="slideTitle">{slide.title}</h2>
                    <h3 className="slideSubtitle">{slide.subtitle}</h3>
                    <p className="slideDescription">{slide.description}</p>
                </div>
            </div>
        </div>
    )
}


const Carousel = () => {
    // @ts-ignore
    const [state, dispatch] = useReducer(slidesReducer, initialState)

    return (
        <div className="slides">
            {/*@ts-ignore*/}
            <button onClick={() => dispatch({ type: 'PREV' })}>‹</button>

            {[...slides, ...slides, ...slides].map((slide, i) => {
                let offset = slides.length + (state.slideIndex - i)
                return <Slide slide={slide} offset={offset} key={i} />
            })}
            {/*@ts-ignore*/}
            <button onClick={() => dispatch({ type: 'NEXT' })}>›</button>
        </div>
    )
}

export default Carousel
