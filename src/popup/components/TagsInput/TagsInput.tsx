import React, { useEffect, useState } from 'react'
import _ from 'lodash'
import Autocomplete from '@material-ui/lab/Autocomplete'
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles'
import TextField from '@material-ui/core/TextField'
import { getHints } from '../../../../nekoton/pkg'
import { formatSeed } from '../../utils/formatSeedInput'

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            'width': 304,
            '& > * + *': {
                marginTop: theme.spacing(3),
            },
            'marginBottom': 12,
            // 'padding': '14px 0',
            // '&:hover': {
            //     border: '1px solid hsl(0, 0%, 70%)',
            // },
        },
        textField: {
            background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
            border: 0,
            borderRadius: 3,
            boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
            color: 'white',
            height: 48,
            padding: '0 30px',
        },
    })
)

interface ITagsInput {
    words: string[]
    setWords: (arg0: string[]) => void
}

const TagsInput: React.FC<ITagsInput> = ({ words, setWords }) => {
    const classes = useStyles()
    const [hints, setHints] = useState<string[]>([])

    const onInputChange = (_event: React.ChangeEvent<{}>, value: string) => {
        if (value) {
            const clone = _.cloneDeep(formatSeed(value))
            const last = clone.pop()
            console.log(last, 'last')
            if (typeof last === 'string') {
                console.log(getHints(last), 'getHints')
                setHints(getHints(last))
            }
        }
    }

    const onSelectTag = (_e: React.ChangeEvent<{}>, values: string[]) => {
        setWords(values)
    }

    useEffect(() => {
        console.log(words, 'words')
    }, [words])

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
                        // className={classes.textField}
                        variant="standard"
                        label="Enter your seed"
                        margin="normal"
                        // placeholder="Seed"
                    />
                )}
            />
        </div>
    )
}

export default TagsInput
