import React, { useState } from 'react'
import _ from 'lodash'
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles'
import { formatSeed } from '@popup/utils'
import * as nt from '@nekoton'

import Autocomplete from '@material-ui/lab/Autocomplete'
import TextField from '@material-ui/core/TextField'

import './style.scss'

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
    words: string[]
    setWords: (words: string[]) => void
}

const TagsInput: React.FC<ITagsInput> = ({ setWords, words }) => {
    const classes = useStyles()
    const [hints, setHints] = useState<string[]>([])

    const onInputChange = (_event: React.ChangeEvent<{}>, value: string) => {
        if (value) {
            const clone = _.cloneDeep(formatSeed(value))
            if (clone.length === 12) {
                setWords(clone)
            } else {
                const last = clone.pop()
                if (typeof last === 'string') {
                    setHints(nt.getBip39Hints(last))
                }
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
                value={words}
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
