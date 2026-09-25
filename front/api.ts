import axios from "axios"

// const token = localStorage.getItem("token")
const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
})


export default api