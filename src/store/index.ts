import { createStore, applyMiddleware } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import createRootReducer from './rootReducer'

// const composedEnhancer = composeWithDevTools(applyMiddleware(thunk))

const store = createStore(createRootReducer(), composeWithDevTools())

export default store
