export const ActionTypes = {
    SETLOCALE: 'app/set-locale',
}

export const setLocale = (locale: any) => async (
    dispatch: (arg0: { type: string; payload: any }) => void
) => {
    dispatch({
        type: ActionTypes.SETLOCALE,
        payload: locale,
    })
}
