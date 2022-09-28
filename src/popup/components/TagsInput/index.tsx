import React, { useState } from 'react'
import _ from 'lodash'
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles'
import { formatSeed } from '@popup/utils'
import * as nt from '@nekoton'

import Autocomplete from '@material-ui/lab/Autocomplete'
import TextField from '@material-ui/core/TextField'
import Paper from '@material-ui/core/Paper'

import './style.scss'

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
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
    wordCount: number
    disabled?: boolean
}

const TagsInput: React.FC<ITagsInput> = ({ setWords, words, wordCount, disabled }) => {
    const classes = useStyles()
    const [hints, setHints] = useState<string[]>([])

    const onInputChange = (_event: React.ChangeEvent<{}>, value: string) => {
        if (value) {
            const clone = _.cloneDeep(formatSeed(value))
            if (clone.length === wordCount) {
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
        setWords(
            values.filter((item, i) => {
                return i < words.length || hints.includes(item)
            })
        )
    }

    return (
        <div className={classes.root}>
            <Autocomplete<string, true, undefined, true>
                multiple
                freeSolo
                id="tags-standard"
                options={hints}
                value={words}
                disabled={disabled}
                onInputChange={(event, values) => onInputChange(event, values)}
                onChange={(event, values) => onSelectTag(event, values)}
                getOptionSelected={() => false}
                PaperComponent={(props) => <Paper {...props} square={true} />}
                renderInput={(params) => (
                    <TextField {...params} variant="outlined" margin="normal" />
                )}
            />
        </div>
    )
}

export default TagsInput
