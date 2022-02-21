import React from 'react'
import classNames from 'classnames'

import Loader from '@popup/components/Loader'

import './styles.scss'

interface IPanelLoader {
    paddings?: boolean;
    transparent?: boolean;
}

const PanelLoader: React.FC<IPanelLoader> = ({
    paddings = true,
    transparent,
}) => (
    <div
        className={classNames('panel-loader', {
            'panel-loader_paddings': paddings == true,
            'panel-loader_transparent': transparent == true,
        })}
    >
        <Loader />
    </div>
)

export default PanelLoader
