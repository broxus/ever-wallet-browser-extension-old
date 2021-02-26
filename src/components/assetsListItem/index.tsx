import React from 'react';
import {createRipple, removeRipple} from "../../common/ripple";

import './style.scss';

type AssetsListItemProps = {
    symbol: string,
    address: string,
    balanceInteger: string,
    balanceFractional: string,
    onClick?: () => void,
}

export class AssetsListItem extends React.Component<AssetsListItemProps, {}> {
    render() {
        const {symbol, onClick} = this.props;

        return (
            <button className="assets-list-item"
                    onMouseDown={createRipple}
                    onMouseLeave={removeRipple}
                    onMouseUp={(event) => {
                        removeRipple(event);
                        onClick?.();
                    }}>
                <div className="assets-list-item__content">
                    <div className="assets-list-item__content__symbol">
                        <img src="" alt=""/>
                        <span>{symbol}</span>
                    </div>
                </div>
            </button>
        );
    }
}
