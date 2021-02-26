import React from "react";
import {createRipple, removeRipple} from "../../common/ripple";

import "./style.scss";

export type ButtonProps = {
    text: string,
    onClick?: () => void,
}

export class Button extends React.Component<ButtonProps, {}> {
    render() {
        const {text, onClick} = this.props;

        return (
            <button className="button"
                    onMouseDown={createRipple}
                    onMouseLeave={removeRipple}
                    onMouseUp={(event) => {
                        removeRipple(event);
                        onClick && onClick();
                    }}>
                <div className="button__content">{text}</div>
            </button>
        );
    }
}
