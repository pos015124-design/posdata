import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { useToast } from "@/hooks/useToast"
import { LogIn } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

type LoginForm = {
  email: string
  password: string
}

interface LocationState {
  message?: string;
  from?: Location;
}

export function Login() {
  const [loading, setLoading] = useState(false)
  const [pendingApprovalMessage, setPendingApprovalMessage] = useState<string | null>(null)
  const { toast } = useToast()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { register, handleSubmit } = useForm<LoginForm>()
  
  useEffect(() => {
    // Check if we have a message from the registration page
    const state = location.state as LocationState;
    if (state?.message) {
      setPendingApprovalMessage(state.message);
    }
  }, [location]);

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true)
      await login(data.email, data.password);
      toast({
        title: "Success",
        description: "Logged in successfully",
      })
      navigate("/")
    } catch (error: unknown) {
      // Clear the pending approval message if there was an error
      setPendingApprovalMessage(null);
      
      const errorMessage = error instanceof Error ? error.message : "An error occurred during login";
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      })
      
      // If the error is about pending approval, set the message
      if (errorMessage.includes("pending approval")) {
        setPendingApprovalMessage("Your account is pending approval by an administrator. Please check back later.");
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-primary/5 py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center animate-slide-up">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-primary to-secondary rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <LogIn className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-responsive-lg font-bold text-gradient">
            Welcome Back
          </h2>
          <p className="mt-2 text-muted-foreground">
            Sign in to your Dukani account
          </p>
        </div>

        {/* Login Card */}
        <Card className="card-modern hover-lift animate-scale-in backdrop-blur-sm bg-card/80 border-0 shadow-modern-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-center">
              Sign In
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Enter your credentials to access your dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {pendingApprovalMessage && (
              <div className="p-4 bg-warning/10 border border-warning/20 text-warning-foreground rounded-lg animate-slide-up">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-warning rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">{pendingApprovalMessage}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email", { required: true })}
                    placeholder="Enter your email"
                    className="h-11 transition-smooth focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password", { required: true })}
                    placeholder="Enter your password"
                    className="h-11 transition-smooth focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 btn-gradient font-medium transition-smooth hover:scale-[1.02] active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </div>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="pt-4">
            <div className="w-full text-center">
              <Button
                variant="link"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                onClick={() => navigate("/register")}
              >
                Don't have an account? Create one here
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground animate-fade-in">
          <p>© 2024 Dukani Retail System. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
