import React from 'react'

type IUserAvatar = {
    address: string
    small?: boolean
}

const UserAvatar: React.FC<IUserAvatar> = ({ address, small }) => {
    const hash = address.split(':')[1]

    const size = small === true ? 24 : 36

    const colors: string[] = []
    for (let i = 0; i < 16; i++) {
        colors.push(
            '#' +
                hash[0] +
                hash[i * 4] +
                hash[i * 4 + 1] +
                hash[i * 4 + 2] +
                hash[63] +
                hash[i * 4 + 3]
        )
    }

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <g clip-path="url(#clip0)">
                <circle cx="3" cy="3" r="7" fill={colors[0]} />
                <circle cx="3" cy="13" r="7" fill={colors[4]} />
                <circle cx="3" cy="23" r="7" fill={colors[8]} />
                <circle cx="3" cy="33" r="7" fill={colors[12]} />
                <circle cx="13" cy="3" r="7" fill={colors[1]} />
                <circle cx="13" cy="13" r="7" fill={colors[5]} />
                <circle cx="13" cy="23" r="7" fill={colors[9]} />
                <circle cx="13" cy="33" r="7" fill={colors[13]} />
                <circle cx="23" cy="3" r="7" fill={colors[2]} />
                <circle cx="23" cy="13" r="7" fill={colors[6]} />
                <circle cx="23" cy="23" r="7" fill={colors[10]} />
                <circle cx="23" cy="33" r="7" fill={colors[14]} />
                <circle cx="33" cy="3" r="7" fill={colors[3]} />
                <circle cx="33" cy="13" r="7" fill={colors[7]} />
                <circle cx="33" cy="23" r="7" fill={colors[11]} />
                <circle cx="33" cy="33" r="7" fill={colors[15]} />
            </g>
            <defs>
                <clipPath id="clip0">
                    <rect width="36" height="36" rx="18" fill="white" />
                </clipPath>
            </defs>
        </svg>
    )
}

export default UserAvatar
