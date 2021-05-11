export interface IOptionParams {
    data?: any
    isDisabled?: boolean
    isFocused?: boolean
    isSelected?: boolean
}

export const selectStyles = {
    control: (styles: any) => {
        return {
            ...styles,
            backgroundColor: '#ffffff',
            borderRadius: 0,
            fontSize: '16px',
            lineHeight: '20px',
            letterSpacing: '0.25px',
            minHeight: '48px',
        }
    },
    option: (styles: any, { isDisabled }: IOptionParams) => {
        const color = '#ffffff'
        return {
            ...styles,
            'backgroundColor': isDisabled ? 'red' : color,
            // 'border': !isSelected ? '1px solid #DDE1E2' : '1px solid #0088CC ',
            'color': '#000000',
            'fontSize': '16px',
            'lineHeight': '20px',
            'letterSpacing': '0.25px',
            'cursor': isDisabled ? 'not-allowed' : 'pointer',
            '&:hover': {
                color: '#0088cc',
            },
        }
    },
    indicatorsContainer: (styles: any) => ({ ...styles, cursor: 'pointer' }),
    placeholder: (styles: any) => ({ ...styles, color: '#96A1A7' }),
    menu: (styles: any) => ({ ...styles, marginTop: 2, borderRadius: 0, zIndex: '5' }),
    valueContainer: (styles: any) => ({ ...styles,  padding: '0 0 12px 16px' }),
    singleValue: (styles: any) => ({ ...styles, color: '#000000' }),
}
