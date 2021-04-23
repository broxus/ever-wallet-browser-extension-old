export const checkForError = () => {
    const { lastError } = chrome.runtime
    if (!lastError) {
        return undefined
    }
    if ((lastError as any).stack && lastError.message) {
        return lastError
    }
    return new Error(lastError.message)
}
