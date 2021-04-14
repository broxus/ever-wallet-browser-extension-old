import React, { useState } from 'react'
import _ from 'lodash'
import Autocomplete from '@material-ui/lab/Autocomplete'
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles'
import TextField from '@material-ui/core/TextField'
import { getHints } from '../../../../nekoton/pkg'
import { formatSeed } from '../../utils/formatData'
import './tags-input.scss'

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            'width': 304,
            '& > * + *': {
                marginTop: theme.spacing(3),
            },
            'marginBottom': 12,
        },
    })
)

interface ITagsInput {
    setWords: (arg0: string[]) => void
}

const TagsInput: React.FC<ITagsInput> = ({ setWords }) => {
    const classes = useStyles()
    const [hints, setHints] = useState<string[]>([])

    const onInputChange = (_event: React.ChangeEvent<{}>, value: string) => {
        if (value) {
            const clone = _.cloneDeep(formatSeed(value))
            const last = clone.pop()
            if (typeof last === 'string') {
                setHints(getHints(last))
            }
        }
    }

    const onSelectTag = (_e: React.ChangeEvent<{}>, values: string[]) => {
        setWords(values)
    }

    return (
        <div className={classes.root}>
            <Autocomplete
                multiple
                id="tags-standard"
                options={hints}
                getOptionLabel={(option) => option}
                onInputChange={(event, values) => onInputChange(event, values)}
                onChange={(event, values) => onSelectTag(event, values)}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        variant="standard"
                        label="Enter your seed"
                        margin="normal"
                    />
                )}
            />
        </div>
    )
}

export default TagsInput
