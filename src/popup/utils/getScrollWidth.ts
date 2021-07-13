export function getScrollWidth(): number {
    if (typeof document === 'undefined') return 0
    const outer: HTMLElement = document.createElement('div')
    outer.style.visibility = 'hidden'
    outer.style.width = '100px'
    // @ts-ignore
    outer.style.msOverflowStyle = 'scrollbar' // needed for WinJS apps
    outer.classList.add('initial-scroll')

    document.body.appendChild(outer)

    const widthNoScroll: number = outer.offsetWidth
    // force scrollbars
    outer.style.overflow = 'scroll'

    // add inner div
    const inner = document.createElement('div')
    inner.style.width = '100%'
    outer.appendChild(inner)

    const widthWithScroll = inner.offsetWidth

    // remove divs
    outer.parentNode?.removeChild(outer)

    return widthNoScroll - widthWithScroll
}
