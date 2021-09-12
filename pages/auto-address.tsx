import * as React from 'react'
import useSWR from 'swr'
import useDeepCompareEffect from 'use-deep-compare-effect'

if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  const {worker} = require('../mocks/browser')
  worker.start()
}

function createContext<CT>(name: string) {
  const context = React.createContext<CT | null>(null)

  function useContext() {
    const contextValue = React.useContext(context)

    if (contextValue === null) {
      throw new Error(`use${name} must be used within ${name}Provider`)
    }

    return contextValue
  }

  return {Context: context, useContext}
}

type IsOpenContextType = {
  isOpen: boolean
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
}
const {Context: IsOpenContext, useContext: useIsOpen} =
  createContext<IsOpenContextType>('IsOpen')

function IsOpenProvider({children}: {children: React.ReactNode}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const value = React.useMemo(() => ({isOpen, setIsOpen}), [isOpen, setIsOpen])
  return (
    <IsOpenContext.Provider value={value}>{children}</IsOpenContext.Provider>
  )
}

type WasSearchedContextType = {
  wasSearched: boolean
  setWasSearched: React.Dispatch<React.SetStateAction<boolean>>
}
const {Context: WasSearchedContext, useContext: useWasSearched} =
  createContext<WasSearchedContextType>('WasSearched')

function WasSearchedProvider({children}: {children: React.ReactNode}) {
  const [wasSearched, setWasSearched] = React.useState(false)
  const value = React.useMemo(
    () => ({wasSearched, setWasSearched}),
    [wasSearched, setWasSearched],
  )
  return (
    <WasSearchedContext.Provider value={value}>
      {children}
    </WasSearchedContext.Provider>
  )
}

type Address = Partial<{
  code: number
  prefecture: string
  city: string
  ward: string
}>
type AddressContextType = {
  address: Address | null
  setAddress: React.Dispatch<React.SetStateAction<Address | null>>
}
const {Context: AddressContext, useContext: useAddress} =
  createContext<AddressContextType>('Address')

function AddressProvider({children}: {children: React.ReactNode}) {
  const [address, setAddress] = React.useState<Address | null>(null)
  const value = React.useMemo(
    () => ({address, setAddress}),
    [address, setAddress],
  )

  return (
    <AddressContext.Provider value={value}>{children}</AddressContext.Provider>
  )
}

type AddressesContextType = {
  addresses: Array<Address> | null
  error: Error
}

const {Context: AddressesContext, useContext: useAddresses} =
  createContext<AddressesContextType>('Addresses')
function AddressesProvider({children}: {children: React.ReactNode}) {
  const {wasSearched} = useWasSearched()
  const {postCode} = usePostCode()
  const {setIsOpen} = useIsOpen()
  const {address, setAddress} = useAddress()
  const query = postCode.every((pc) => Boolean(pc)) ? postCode.join('-') : ''

  const {data: addresses, error} = useSWR(
    wasSearched ? `addresses?postCode=${query}` : null,
    (arg: string) =>
      fetch(arg)
        .then((r) => r.json())
        .then((res) => {
          if (res?.data.length === 1) {
            const {code, city, prefecture, ward} = res.data[0]
            setAddress({
              ...address,
              code,
              city,
              prefecture,
              ward,
            })
          }

          return res?.data
        }),
  )

  useDeepCompareEffect(() => {
    if (!addresses) return

    if (addresses.length > 1) {
      setIsOpen(true)
    }
  }, [{addresses}])

  const value = React.useMemo(() => ({addresses, error}), [addresses, error])

  return (
    <AddressesContext.Provider value={value}>
      {children}
    </AddressesContext.Provider>
  )
}
type PostCodeContextType = {
  postCode: Array<string>
  setPostCode: React.Dispatch<React.SetStateAction<Array<string>>>
}

const {Context: PostCodeContext, useContext: usePostCode} =
  createContext<PostCodeContextType>('PostCode')
function PostCodeProvider({children}: {children: React.ReactNode}) {
  const [postCode, setPostCode] = React.useState(() =>
    Array.from({length: 2}, () => ''),
  )

  const value = React.useMemo(
    () => ({postCode, setPostCode}),
    [postCode, setPostCode],
  )

  return (
    <PostCodeContext.Provider value={value}>
      {children}
    </PostCodeContext.Provider>
  )
}

function PostCode() {
  const {postCode, setPostCode} = usePostCode()
  const {wasSearched, setWasSearched} = useWasSearched()

  function hanldePostCodeChange(
    event: React.ChangeEvent<HTMLInputElement>,
    idx: number,
  ) {
    if (wasSearched) {
      setWasSearched(false)
    }
    const newPostCode = [...postCode]
    newPostCode.splice(idx, 1, event.target.value)
    setPostCode(newPostCode)
  }
  return (
    <div>
      <input onChange={(e) => hanldePostCodeChange(e, 0)} />
      <input onChange={(e) => hanldePostCodeChange(e, 1)} />
    </div>
  )
}

function TwoArrayStringIsEqual(a: Array<string>, b: Array<string>) {
  return a.every((str, idx) => str === b[idx])
}

function usePrevious<T>(value: T) {
  const ref = React.useRef(value)

  React.useEffect(() => {
    ref.current = value
  })

  return ref.current
}

function Search() {
  const {address, setAddress} = useAddress()
  const {postCode} = usePostCode()
  const previousPostCode = usePrevious<Array<string>>(postCode)
  const {addresses} = useAddresses()
  const {setWasSearched} = useWasSearched()
  const {setIsOpen} = useIsOpen()

  async function handleAddressesSearch() {
    setWasSearched(true)

    if (addresses && TwoArrayStringIsEqual(previousPostCode, postCode)) {
      if (addresses.length === 1) {
        const {code, city, prefecture, ward} = addresses[0]
        setAddress({
          ...address,
          code,
          city,
          prefecture,
          ward,
        })
      } else {
        setIsOpen(true)
      }
    }
  }
  return <button onClick={handleAddressesSearch}>Search</button>
}

function Addresses() {
  const {addresses} = useAddresses()
  const {setAddress} = useAddress()
  const {isOpen, setIsOpen} = useIsOpen()

  function handleAddressSelect(address: Address) {
    setIsOpen(false)
    setAddress(address)
  }

  if (!isOpen) return null
  return (
    <ul>
      {addresses?.map((ad, _idx) => (
        <li
          key={`addresses-items-${_idx}`}
          onClick={() => handleAddressSelect(ad)}
        >
          {ad.prefecture},{ad.city}, {ad.ward}
        </li>
      ))}
    </ul>
  )
}

function Address() {
  const {address, setAddress} = useAddress()

  function handleWardChange(event: React.ChangeEvent<HTMLInputElement>) {
    setAddress({
      ...address,
      ward: event.target.value,
    })
  }

  return (
    <div>
      <input value={address?.code ?? ''} disabled />
      <input value={address?.prefecture ?? ''} disabled />
      <input value={address?.city ?? ''} disabled />
      <input value={address?.ward ?? ''} onChange={handleWardChange} />
    </div>
  )
}
function AutoAddress() {
  return (
    <AddressProvider>
      <WasSearchedProvider>
        <PostCodeProvider>
          <IsOpenProvider>
            <AddressesProvider>
              <PostCode />
              <Search />
              <Addresses />
            </AddressesProvider>
          </IsOpenProvider>
        </PostCodeProvider>
      </WasSearchedProvider>
      <Address />
    </AddressProvider>
  )
}

export default AutoAddress
