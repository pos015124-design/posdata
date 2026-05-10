import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Eye, EyeOff, CheckCircle, X } from 'lucide-react';
import { useToast } from '../hooks/useToast';

function TermsModal({ onClose, onAccept }: { onClose: () => void; onAccept: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">Seller Terms & Conditions</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-sm text-gray-700">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="font-bold text-blue-900 mb-1">BHABY GROUP LTD — E-Shop Marketplace</p>
            <p className="text-blue-700 text-xs">Seller Agreement & Fee Structure</p>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-2">1. Registration Fee</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="font-semibold text-amber-900">TZS 300,000 — One-time setup fee</p>
              <p className="text-amber-700 text-xs mt-1">Payable immediately upon registration approval. Grants full access to the seller dashboard, inventory management, POS system, and your public store page.</p>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-2">2. Advertising / Sponsorship Fee</h3>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="font-semibold text-purple-900">TZS 5,000 / month</p>
              <p className="text-purple-700 text-xs mt-1">Optional. Sponsored products appear at the top of the marketplace feed, giving your listings maximum visibility to all shoppers.</p>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-2">3. Seller Obligations</h3>
            <ul className="space-y-1 text-xs text-gray-600 list-disc list-inside">
              <li>Provide accurate product descriptions and pricing</li>
              <li>Maintain sufficient stock for listed products</li>
              <li>Fulfill orders within the agreed timeframe</li>
              <li>Comply with all applicable Tanzanian laws and regulations</li>
              <li>Not list counterfeit, illegal, or prohibited items</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-2">4. Account Suspension</h3>
            <p className="text-xs text-gray-600">BHABY GROUP LTD reserves the right to suspend or terminate seller accounts for violations of these terms, fraudulent activity, or repeated customer complaints.</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
            <p>By clicking "I Accept", you confirm that you have read, understood, and agree to be bound by these Terms & Conditions. These terms are governed by the laws of the United Republic of Tanzania.</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Decline</Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600" onClick={onAccept}>
            <CheckCircle className="w-4 h-4 mr-2" />I Accept
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (!termsAccepted) {
      toast({ title: 'Terms Required', description: 'Please read and accept the Terms & Conditions to continue', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await register(formData.email, formData.password, formData.name, formData.businessName);
      toast({
        title: 'Registration submitted!',
        description: 'Your account is pending admin approval. You will be notified once approved.',
      });
      navigate('/login');
    } catch (error: any) {
      const details = error.response?.data?.details;
      const description = details
        ? details.map((d: any) => d.msg).join(', ')
        : error.response?.data?.message || error.message || 'Registration failed';
      toast({ title: 'Error', description, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showTerms && (
        <TermsModal
          onClose={() => setShowTerms(false)}
          onAccept={() => { setTermsAccepted(true); setShowTerms(false); }}
        />
      )}

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 via-purple-700 to-pink-600 p-4">
        <div className="absolute inset-0 bg-black/20" />

        <Card className="relative w-full max-w-lg shadow-2xl border-0">
          <CardHeader className="space-y-3 text-center pb-4">
            <div className="flex justify-center">
              <img
                src="/eshoplogo.jpeg"
                alt="E-Shop Bhaby Group"
                className="h-14 w-auto object-contain"
              />
            </div>
            <div>
              <CardDescription>Create your seller account and start selling today</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Amina Hassan" value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })} required className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input id="businessName" placeholder="My Store" value={formData.businessName}
                    onChange={e => setFormData({ ...formData, businessName: e.target.value })} required className="h-11" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="seller@example.com" value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })} required className="h-11" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Min 6 chars"
                      value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                      required className="h-11 pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Repeat"
                      value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required className="h-11 pr-10" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Fee summary */}
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1 border border-gray-200">
                <p className="font-semibold text-gray-800 mb-1.5">Fee Structure</p>
                <div className="flex justify-between"><span>Registration fee</span><span className="font-semibold text-gray-900">TZS 300,000</span></div>
                <div className="flex justify-between"><span>Ads / Sponsorship</span><span className="font-semibold text-gray-900">TZS 5,000/mo</span></div>
              </div>

              {/* T&C checkbox */}
              <div className="flex items-start gap-3">
                <button type="button" onClick={() => setTermsAccepted(!termsAccepted)}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${termsAccepted ? 'bg-blue-600 border-blue-600' : 'border-gray-300 hover:border-blue-400'}`}>
                  {termsAccepted && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </button>
                <p className="text-sm text-gray-600">
                  I have read and agree to the{' '}
                  <button type="button" onClick={() => setShowTerms(true)}
                    className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2">
                    Terms & Conditions
                  </button>
                  {' '}including the fee structure above.
                </p>
              </div>

              <Button type="submit" disabled={loading || !termsAccepted}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-base font-bold shadow-lg disabled:opacity-50">
                {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Creating Account…</> : 'Create Seller Account'}
              </Button>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">Sign in</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
