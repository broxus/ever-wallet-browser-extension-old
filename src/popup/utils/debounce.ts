export function debounce(
    fn: (...args: any[]) => unknown,
    wait: number,
    immediate?: boolean,
): () => void {
    let timeout: ReturnType<typeof setTimeout>

    return (...args: any[]) => {
        const later = () => {
            clearTimeout(timeout)

            if (!immediate) {
                fn(...args)
            }
        }

        const now = immediate && !timeout

        clearTimeout(timeout)

        timeout = setTimeout(later, wait)

        if (now) {
            fn(...args)
        }
    }
}
