import { useEffect, useState } from "react"
import { account } from "./utils/appwrite"
import type { Models } from "appwrite"
import { OAuthProvider } from "appwrite"
import api from '../api.ts'
import Header from "./components/Header.tsx"
// import bg from "./assets/splicetifybg.png"

const App = () => {
  const [user,setUser] = useState<Models.User<Models.Preferences> | null>(null)
  const [playlists, setPlaylists] = useState<String[] |  null >(null)

  useEffect(()=>{
      const checkAuth = async ()=>{
        try {
          const response = await account.get()
          const appwriteToken = (await account.createJWT()).jwt

          const token = await api.post("/auth/googlesignin", {"appwrite_token" : appwriteToken})

          localStorage.setItem("token", token.data.access_token)
          localStorage.setItem("userId", response.$id)
          setUser(response)
        } catch (error) {
          console.log("NO USER FOUND")
        }
      }
      checkAuth()
  },[])
  
  const handleGoogleSignin =  async () =>{
        account.createOAuth2Session(OAuthProvider.Google,'http://localhost:5173','http://localhost:5173/fail')
  }
  const connectSpotify = async ()=>{
      try {
        const response = await api.get("/spotify/connect")
        window.location.href = response.data.url  
      } catch (error) {
        console.log((error as Error).message)
      }
  }
  const getUserPlaylists = async ()=>{
      try {
        const response = await api.get("/spotify/playlists")
        setPlaylists(response.data)
      } catch (error) {
        console.log((error as Error).message)
      }
  }
  return (
    <div className="w-full min-h-screen flex flex-col bg-[hsl(0,0%,12%)] text-white items-center text-4xl">
      <div>
        <h1>user info</h1>
        <p>-----------------------</p>
          {user ? <div>
            <p>{user.$id}</p>
            <p>{user.name}</p>
            <p>{user.email}</p>
          </div> : <p> User not signed in</p>}
      </div>
      <Header />
      <p className="cursor-pointer" onClick={handleGoogleSignin}>google login</p>
      <p className="cursor-pointer" onClick={connectSpotify}>spotify connect</p>
      <p className="cursor-pointer" onClick={getUserPlaylists}>get playlists</p>

      <div>
        <h1>Playlists</h1>
        <p>----------------</p>
        <p>{playlists}</p>
      </div>

    </div>
  )
}

export default App