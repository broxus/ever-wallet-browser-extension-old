import React from "react"

import './style.scss'

interface ISwitcher {
	checked?: boolean
	onChange?: () => void
}

const Switcher: React.FC<ISwitcher> = ({ checked, onChange }) => {
	return (
		<label className="switcher">
			<input
				type="checkbox"
				checked={checked}
				onChange={onChange}
			/>
			<span className="switcher__handle" />
		</label>
	)
}

export default Switcher
