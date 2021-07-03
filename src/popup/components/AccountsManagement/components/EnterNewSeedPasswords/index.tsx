import * as React from 'react'
import { useForm } from 'react-hook-form'

import Button from '@popup/components/Button'
import Input from '@popup/components/Input'

type Props = {
	disabled?: boolean;
	error?: string;
	onSubmit: (password: string) => void;
	onBack: () => void;
}

export function EnterNewSeedPasswords({
	disabled,
	error,
	onBack,
	...props
}: Props): JSX.Element {
	const { register, handleSubmit, errors, watch } = useForm()

	const onSubmit = ({ password }: { password: string }) => {
		props.onSubmit(password)
	}

	return (
		<div className="accounts-management__content">
			<h2 className="accounts-management__content-title">Create a password</h2>
			<form id="password" onSubmit={handleSubmit(onSubmit)}>
				<div className="accounts-management__content-form-rows">
					<div className="accounts-management__content-form-row">
						<Input
							name="password"
							register={register({
								required: true,
								minLength: 6,
							})}
							disabled={disabled}
							label={'Your password'}
							autoFocus
							type={'password'}
						/>
						{errors.password && (
							<div className="accounts-management__content-error">
								The password is required and must be minimum 6 characters long
							</div>
						)}
					</div>
					<div className="accounts-management__content-form-row">
						<Input
							name="passwordConfirm"
							register={register({
								required: true,
								validate: (value) => value === watch('password'),
							})}
							disabled={disabled}
							label={'Confirm password'}
							type={'password'}
						/>
						{errors.passwordConfirm && (
							<div className="accounts-management__content-error">
								Your password doesn't match
							</div>
						)}
					</div>
				</div>
				{error !== undefined && (
					<div className="accounts-management__content-error">
						{}
					</div>
				)}
			</form>

			<div className="accounts-management__content-buttons">
				<div className="accounts-management__content-buttons-back-btn">
					<Button text={'Back'} disabled={disabled} onClick={onBack} white />
				</div>
				<Button
					text={'Confirm'}
					disabled={disabled}
					onClick={handleSubmit(onSubmit)}
				/>
			</div>
		</div>
	)
}
