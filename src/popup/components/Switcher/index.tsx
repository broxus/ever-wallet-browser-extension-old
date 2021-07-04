import * as React from 'react'

import './style.scss'

type Props = {
	id?: string;
	checked?: boolean;
	onChange?: () => void;
}

export function Switcher({ id, checked, onChange }: Props): JSX.Element {
	return (
		<label className="switcher">
			<input
				id={id}
				type="checkbox"
				checked={checked}
				value="true"
				onChange={onChange}
			/>
			<span className="switcher__handle" />
		</label>
	)
}
