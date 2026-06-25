import { RoleProvider } from './context/RoleContext'
import { HomePage } from './pages/HomePage'

function App() {
  return (
    <RoleProvider>
      <HomePage />
    </RoleProvider>
  )
}

export default App
