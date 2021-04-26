declare module '*.svg' {
    interface IReactComponent
        extends React.SVGProps<SVGSVGElement>,
            React.HTMLAttributes<SVGSVGElement> {}

    const ReactComponent: React.FC<IReactComponent>
    const content: string

    export { ReactComponent }
    export default content
}

declare module '*.json' {
    const content: string
    export default content
}

declare module 'react-lottie-player' {
    import React from 'react'

    interface LottieProps {
        animationData?: any
        path?: string
        play?: boolean
        goTo?: number
        speed?: number
        direction?: number
        loop?: number | boolean
        segments?: number[] | boolean
        rendererSettings?: any
        renderer?: string
        audioFactory?: any
        onComplete?: () => void
        onLoopComplete?: () => void
        onEnterFrame?: () => void
        onSegmentStart?: () => void
        style?: React.CSSProperties
    }

    export default class Lottie extends React.Component<LottieProps> {}
}
