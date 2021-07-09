import * as React from 'react'

import Oval from '@popup/img/oval.svg'


export function LoaderPage(): JSX.Element {
	return (
		<div className="loader-page">
			<img src={Oval} className="loader-page__spinner" alt="" />
		</div>
	)
}