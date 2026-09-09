import { useEffect, useState } from "react"
import { account } from "./utils/appwrite"
import type { Models } from "appwrite"


const App = () => {
  const [user,setUser] = useState<Models.User<Models.Preferences> | null>(null)

  useEffect(()=>{
      const checkAuth = async ()=>{
        try {
          const response = await account.get()
          setUser(response)
        } catch (error) {
          console.log("NO USER FOUND")
        }
      }
      checkAuth()
  },[])
  const handlesignin =  async () =>{
    try {
        account.createOAuth2Session(
        "google",
        'http://localhost:5173',
        'http://localhost:5173/fail'
      )
    } catch (error) {
      console.log(error.nessage)
    }
  }
  return (
    <div className="w-full min-h-screen flex flex-col bg-[hsl(0,0%,8%)] text-white">
      <div className="mx-auto mt-12">
        <h1 className="text-4xl w-full text-center text-pink-400">splicetify</h1>
        <button className="border rounded px-4 py-2 text-3xl" onClick={handlesignin}>signin</button>
        {user ? <div> 
          <p>{user.email}</p>
          <p>{user.name}</p>
          <p>{user.$id}</p>
        </div> : <h1> Still not logged in</h1>}

        <button className="mt-12 border rounded px-6 py-3">connect spotify</button>
      </div>
      </div>
  )
}

export default App