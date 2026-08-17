import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Link } from 'react-router-dom';
import { Loader2, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import AuthShell from '../components/AuthShell';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Two-factor step state
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const { login, verifyTwoFactor } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(email, password);
      // Account has 2FA enabled — switch to the verification step
      if (result?.requiresTwoFactor && result.twoFactorToken) {
        setTwoFactorToken(result.twoFactorToken);
        toast({
          title: 'Two-factor authentication required',
          description: 'Enter the 6-digit code from your authenticator app.',
        });
        return;
      }
      // Don't navigate manually — PublicRoute detects the user is now set
      // and redirects to /dashboard automatically. Manual navigate() here
      // causes a race with the AuthContext mount effect and produces a blank page
      // for unapproved users (PrivateRoute shows WaitingApproval, but the
      // explicit navigate fires first and creates a redirect loop).
      toast({
        title: 'Welcome back!',
        description: 'Logged in successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorToken) return;
    setLoading(true);

    try {
      await verifyTwoFactor(twoFactorToken, code.trim());
      toast({
        title: 'Welcome back!',
        description: 'Logged in successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Invalid verification code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Two-factor verification step
  if (twoFactorToken) {
    return (
      <AuthShell heading="Verify your identity." subheading="Enter the code from your authenticator app to finish signing in.">
        <Card className="w-full shadow-lg border border-gray-200 bg-white">
          <CardHeader className="space-y-2 text-center pb-5">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Two-factor authentication</CardTitle>
            <CardDescription className="text-sm text-gray-500">
              Open your authenticator app (Google Authenticator, Authy, etc.) and enter the 6-digit code.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="code">Verification code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  className="h-12 text-center text-2xl tracking-[0.5em] font-semibold"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold shadow-sm"
                disabled={loading || code.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Sign In'
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setTwoFactorToken(null);
                  setCode('');
                }}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </button>
            </form>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell heading="Welcome back to your store." subheading="Sign in to manage your store, sales and inventory.">
      <Card className="w-full shadow-lg border border-gray-200 bg-white">
        <CardHeader className="space-y-2 text-center pb-5">
          <CardTitle className="text-2xl font-bold text-gray-900">Welcome back</CardTitle>
          <CardDescription className="text-sm text-gray-500">
            Sign in to your seller account
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="seller@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold shadow-sm"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
