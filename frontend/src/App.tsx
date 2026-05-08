import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "react-hot-toast"
import { AuthProvider, useAuth } from "@/hooks/useAuth"
import { AuthPage } from "@/pages/AuthPage"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

function AppContent() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", color: "var(--text-faint)", fontSize: "0.875rem"
      }}>
        Loading…
      </div>
    )
  }

  if (!session) return <AuthPage />

  // Dashboard coming in next PR
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", color: "var(--text-muted)", fontSize: "1rem",
      fontFamily: "var(--font-sans)"
    }}>
      Dashboard — coming soon
    </div>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--surface-2)",
              color: "var(--text)",
              border: "1px solid var(--border-light)",
              fontSize: "0.875rem",
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  )
}