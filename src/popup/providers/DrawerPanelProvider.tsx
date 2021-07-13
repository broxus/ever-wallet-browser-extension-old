import * as React from 'react'


export enum Panel {
	RECEIVE,
	SEND,
	DEPLOY,
	CREATE_ACCOUNT,
	MANAGE_SEEDS,
	ASSET,
	TRANSACTION,
}

type Props = {
	children: React.ReactNode;
}

type ContextConsumer = {
	currentPanel: Panel | undefined;
	setPanel: React.Dispatch<React.SetStateAction<Panel | undefined>>;
}

const Context = React.createContext<ContextConsumer>({
	currentPanel: undefined,
	setPanel() {},
})

export function useDrawerPanel() {
	return React.useContext(Context)
}

export function DrawerPanelProvider({ children }: Props): JSX.Element {
	const [currentPanel, setPanel] = React.useState<Panel>()

	return (
		<Context.Provider
			value={{
				currentPanel,
				setPanel,
			}}
		>
			{children}
		</Context.Provider>
	)
}
