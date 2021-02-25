import React from 'react';

import './style.scss';

const AssetsListTitle = () => <div className="assets-list__title">
    <h1>Assets</h1>
</div>

type AssetsListItemProps = {
    symbol: string,
    address: string,
    balanceInteger: string,
    balanceFractional: string,
    onClick?: () => void,
}

class AssetsListItem extends React.Component<AssetsListItemProps, {}> {
    constructor(props: AssetsListItemProps) {
        super(props);
    }

    createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
        const button = event.currentTarget;
        this.removeRipple(event);

        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;

        const circle = document.createElement("span")
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - (button.offsetLeft + radius)}px`;
        circle.style.top = `${event.clientY - (button.offsetTop + radius)}px`;
        circle.classList.add("ripple");
        button.appendChild(circle);
    }

    removeRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
        const button = event.currentTarget;
        const ripple = button.getElementsByClassName("ripple")[0];
        if (ripple) {
            ripple.remove();
        }
    }

    render() {
        const {symbol, onClick} = this.props;

        return (
            <button className="assets-list__item" onMouseDown={this.createRipple} onMouseUp={(event) => {
                this.removeRipple(event);
                onClick?.();
            }}
                    onMouseLeave={this.removeRipple}>
                <div className="assets-list__item__content">{symbol}</div>
            </button>
        );
    }
}

export class AssetsList extends React.Component<{}, {}> {
    render() {
        return (
            <div className="assets-list noselect">
                <AssetsListTitle/>
                <AssetsListItem address="test" symbol="TON" balanceInteger="123" balanceFractional="00001"/>
                <AssetsListItem address="test" symbol="USDC" balanceInteger="123" balanceFractional="00001"/>
                <AssetsListItem address="test" symbol="WETH" balanceInteger="123" balanceFractional="00001"/>
            </div>
        );
    }
}
