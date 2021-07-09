import * as React from 'react'
import classNames from 'classnames'
import Select from 'react-select'

import * as nt from '@nekoton'
import Button from '@popup/components/Button'
import { AddAccountFlow } from '@popup/components/AccountsManagement/components'
import { selectStyles } from '@popup/constants/selectStyle'
import { useAccountability } from '@popup/providers/AccountabilityProvider'


const CreateAccountIcon = ({ className }: { className?: string }) => {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M19.9122 0L11 8.91221V13H15.0878L24 4.08779L19.9122 0ZM14.319 11.4H12.6V9.68097L19.8809 2.40002L21.6 4.11907L14.319 11.4ZM4 5H3V6V20V21H4H18H19V20V15H17V19H5V7H9V5H4Z"
                fill="currentColor"
            />
        </svg>
    )
}

const PlusIcon = ({ className }: { className?: string }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            className={className}
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10 0H8V8H0V10H8V18H10V10H18V8H10V0Z"
                fill="currentColor"
            />
        </svg>
    )
}


type Props = {
	flow: AddAccountFlow,
	onSelect(flow: AddAccountFlow): void;
	onNext(): void;
	onBack?(): void;
}

export function SelectAccountAddingFlow({ flow, onSelect, onNext, onBack }: Props): JSX.Element {
    const accountability = useAccountability()

    const derivedKeysOptions = React.useMemo<nt.KeyStoreEntry[]>(
    	() => accountability.derivedKeys.sort(
    		(a, b) => a.accountId - b.accountId
	    ),
	    [accountability.derivedKeys]
    )

    const onChangeDerivedKey = (value: nt.KeyStoreEntry | null) => {
		if (value != null) {
			accountability.setCurrentDerivedKey(value)
		}
	}

    const onChangeFlow = (flow: AddAccountFlow) => {
        return () => {
            onSelect(flow)
        }
    }

	return (
		<div className="accounts-management__content">
			<h2 className="accounts-management__content-title">Add account</h2>

            <div className="accounts-management__content-form-rows">
                <div className="accounts-management__content-form-row">
                    <Select
                        options={derivedKeysOptions}
                        value={accountability.currentDerivedKey || accountability.derivedKeys[0]}
                        formatOptionLabel={(value) => value.name}
						styles={selectStyles}
						onChange={onChangeDerivedKey}
                    />
                </div>
            </div>

            <div className="accounts-management__add-options">
                <div
                    className={classNames('accounts-management__add-options-option', {
                        'accounts-management__add-options-option-selected':
                            flow === AddAccountFlow.CREATE,
                    })}
                    onClick={onChangeFlow(AddAccountFlow.CREATE)}
                >
                    <CreateAccountIcon className="accounts-management__add-options-icon" />
                    Create new account
                </div>
                <div
                    className={classNames('accounts-management__add-options-option', {
                        'accounts-management__add-options-option-selected':
                            flow === AddAccountFlow.IMPORT,
                    })}
                    onClick={onChangeFlow(AddAccountFlow.IMPORT)}
                >
                    <PlusIcon className="accounts-management__add-options-icon" />
                    Add an existing account
                </div>
            </div>

            <div className="accounts-management__content-buttons">
                {typeof onBack === 'function' && (
					<div className="accounts-management__content-buttons-back-btn">
						<Button text="Back" white onClick={onBack} />
					</div>
				)}
				<Button text="Next" onClick={onNext} />
			</div>
		</div>
	)
}
