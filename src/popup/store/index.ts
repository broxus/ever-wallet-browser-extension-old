import thunk from 'redux-thunk'
import { createStore, applyMiddleware } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import createRootReducer from './rootReducer'

const composedEnhancer = composeWithDevTools(applyMiddleware(thunk))

const store = createStore(createRootReducer(), composedEnhancer)

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>

export type AppDispatch = typeof store.dispatch

export default store
