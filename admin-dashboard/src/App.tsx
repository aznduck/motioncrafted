import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'

// Pages (will be created later)
// import Login from './pages/Login'
// import Orders from './pages/Orders'
// import OrderReview from './pages/OrderReview'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold">Cherished Motion Lab</h1>
                <p className="text-xl text-muted-foreground">Admin Dashboard</p>
                <p className="text-sm text-muted-foreground">Coming soon...</p>
              </div>
            </div>
          } />
          {/* <Route path="/login" element={<Login />} /> */}
          {/* <Route path="/orders" element={<Orders />} /> */}
          {/* <Route path="/orders/:id" element={<OrderReview />} /> */}
        </Routes>
        <Toaster />
      </div>
    </BrowserRouter>
  )
}

export default App
