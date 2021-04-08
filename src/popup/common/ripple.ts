import React from 'react'

export const removeRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget
    const ripple = button.getElementsByClassName('ripple')[0]
    if (ripple) {
        ripple.remove()
    }
}

export const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget
    removeRipple(event)

    const diameter = Math.max(button.clientWidth, button.clientHeight)
    const radius = diameter / 2

    const circle = document.createElement('span')
    circle.style.width = circle.style.height = `${diameter}px`
    circle.style.left = `${event.clientX - (button.offsetLeft + radius)}px`
    circle.style.top = `${event.clientY - (button.offsetTop + radius)}px`
    circle.classList.add('ripple')
    button.appendChild(circle)
}
