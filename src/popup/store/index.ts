import thunk from 'redux-thunk'
import { createStore, applyMiddleware } from 'redux'
import createRootReducer from './rootReducer'

const store = createStore(createRootReducer(), applyMiddleware(thunk))

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>

export type AppDispatch = typeof store.dispatch

export default store
