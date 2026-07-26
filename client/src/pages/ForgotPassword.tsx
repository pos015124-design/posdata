import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardDescription } from '../components/ui/card';
import Logo from '../components/Logo';

const BASE = import.meta.env.VITE_API_URL || '';

export default function ForgotPassword() {
  const [email,     setEmail]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.details?.[0]?.msg || data.message || 'Something went wrong. Please try again.');
        return;
      }

      // Show the confirmation state regardless — server always returns the same
      // message to prevent user enumeration.
      setSubmitted(true);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-4">
      <div className="absolute inset-0 bg-black/20" />

      <Card className="relative w-full max-w-md shadow-2xl border-0">
        <CardHeader className="space-y-3 text-center pb-4">
          <div className="flex justify-center">
            <Logo className="h-12" />
          </div>
          <CardDescription className="text-base">
            {submitted ? 'Check your email' : 'Reset your password'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {submitted ? (
            <div className="text-center space-y-4 py-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-gray-900">Reset link sent</p>
                <p className="text-sm text-gray-500">
                  If an account with <span className="font-medium text-gray-700">{email}</span> exists,
                  a password reset link has been sent. Check your inbox and spam folder.
                </p>
                <p className="text-xs text-gray-400">The link expires in 1 hour.</p>
              </div>
              <Link to="/login">
                <Button variant="outline" className="w-full mt-2 gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm text-gray-500">
                Enter the email address associated with your seller account and we will send you a reset link.
              </p>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seller@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="h-12 pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-base font-semibold"
              >
                {loading
                  ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Sending…</>
                  : 'Send reset link'
                }
              </Button>

              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
