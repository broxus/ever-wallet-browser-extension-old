import { createStore, applyMiddleware } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import createRootReducer from './rootReducer'

// const composedEnhancer = composeWithDevTools(applyMiddleware(thunk))

const store = createStore(createRootReducer(), composeWithDevTools())

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch

export default store
