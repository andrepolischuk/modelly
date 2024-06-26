import {Channel} from './channel'
import {Auth, User} from './test/base'
import {InjectedUser} from './test/injection'

test('create a model', () => {
  class CurrentUser extends Channel {
    displayName = User.mock.displayName
    email = User.mock.email
  }

  const user = new CurrentUser()

  expect(user).toEqual(User.mock)
})

test('update a model', async () => {
  const user = new User()
  const userFn = jest.fn()

  user.on('update', userFn)

  user.displayName = User.mock.displayName
  user.email = User.mock.email

  await user.wait('update')

  expect(user).toEqual(User.mock)
  expect(userFn).toHaveBeenCalledTimes(1)
})

test('update a model one-time', async () => {
  const user = new User()
  const userFn = jest.fn()

  user.once('update', userFn)

  user.displayName = User.mock.displayName
  user.email = User.mock.email

  await user.wait('update')

  expect(user).toEqual(User.mock)
  expect(userFn).toHaveBeenCalledTimes(1)

  delete user.displayName
  delete user.email

  await user.wait('update')

  expect(user).toEqual({})
  expect(userFn).toHaveBeenCalledTimes(1)
})

test('async update a model', async () => {
  const user = new User()
  const userFn = jest.fn()

  user.on('update', userFn)

  const promise = user.fetch()

  await user.wait('update')

  expect(user).toEqual({fetching: true})
  expect(userFn).toHaveBeenCalledTimes(1)

  await promise
  await user.wait('update')

  expect(user).toEqual({fetching: false, ...User.mock})
  expect(userFn).toHaveBeenCalledTimes(2)
})

test('create a nested model', () => {
  class CurrentUser extends User {
    displayName = User.mock.displayName
    email = User.mock.email
  }

  const auth = new Auth()

  auth.currentUser = new CurrentUser()

  expect(auth).toEqual({currentUser: User.mock})
})

test('update a nested model', async () => {
  const auth = new Auth()
  const authFn = jest.fn()
  const user = new User()
  const userFn = jest.fn()

  auth.on('update', authFn)
  user.on('update', userFn)

  auth.currentUser = user

  await auth.wait('update')

  expect(auth).toEqual({currentUser: {}})
  expect(authFn).toHaveBeenCalledTimes(1)
  expect(userFn).toHaveBeenCalledTimes(0)

  user.displayName = User.mock.displayName
  user.email = User.mock.email

  await user.wait('update')

  expect(auth).toEqual({currentUser: User.mock})
  expect(authFn).toHaveBeenCalledTimes(2)
  expect(userFn).toHaveBeenCalledTimes(1)
})

test('async update a nested model', async () => {
  const auth = new Auth()
  const authFn = jest.fn()
  const userFn = jest.fn()

  auth.on('update', authFn)

  const loginPromise = auth.login()

  await auth.wait('update')

  expect(auth).toEqual({fetching: true})
  expect(authFn).toHaveBeenCalledTimes(1)
  expect(userFn).toHaveBeenCalledTimes(0)

  await loginPromise
  await auth.wait('update')

  expect(auth).toEqual({fetching: false, currentUser: {}})
  expect(authFn).toHaveBeenCalledTimes(2)
  expect(userFn).toHaveBeenCalledTimes(0)

  auth.currentUser.on('update', userFn)

  const fetchPromise = auth.currentUser.fetch()

  await auth.wait('update')

  expect(auth).toEqual({fetching: false, currentUser: {fetching: true}})
  expect(authFn).toHaveBeenCalledTimes(3)
  expect(userFn).toHaveBeenCalledTimes(1)

  await fetchPromise
  await auth.wait('update')

  expect(auth).toEqual({
    fetching: false,
    currentUser: {fetching: false, ...User.mock}
  })
  expect(authFn).toHaveBeenCalledTimes(4)
  expect(userFn).toHaveBeenCalledTimes(2)
})

test('create a custom channel', async () => {
  const api = {
    getCurrentUser: jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(User.mock)
          }, 100)
        })
    )
  }

  const user = new InjectedUser(api)
  const userFn = jest.fn()

  user.on('update', userFn)

  const promise = user.fetch()

  await user.wait('update')

  expect(user).toEqual({api, fetching: true})
  expect(userFn).toHaveBeenCalledTimes(1)
  expect(api.getCurrentUser).toHaveBeenCalledTimes(1)

  await promise
  await user.wait('update')

  expect(user).toEqual({api, fetching: false, ...User.mock})
  expect(userFn).toHaveBeenCalledTimes(2)
})

test('trigger a custom event', async () => {
  const user = new User()
  const userFn = jest.fn()

  user.once('hello', userFn)
  user.emit('hello', 'world')

  expect(userFn).toHaveBeenCalledTimes(1)
  expect(userFn).toHaveBeenCalledWith('world')
})
